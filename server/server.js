// server.js - Your new backend file

// 1. Import necessary libraries
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const nodemailer = require('nodemailer');
const cors =require('cors');
const path = require('path');
const twilio = require('twilio');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { knex, setupDatabase } = require('./db');

const saltRounds = 10; // For bcrypt hashing

// Main async function to set up and start the server
async function main() {
    // Wait for database setup to complete
    await setupDatabase();

    // 2. Initialize Express app
    const app = express();
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow all origins for simplicity
            methods: ["GET", "POST"]
        }
    });
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
        console.log('Created "uploads" directory.');
    }

    // Explicitly configure CORS for better proxy compatibility
    app.use(cors({
        origin: '*', // Allow all origins
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    app.use(express.json({limit: '5mb'})); // To parse JSON request bodies, increased limit for photos

    // Serve static files from the React app and uploaded images
    app.use(express.static(path.join(__dirname, '../dist')));
    app.use('/uploads', express.static(uploadsDir));


    // WebSocket connection handler
    io.on('connection', (socket) => {
        console.log(`WebSocket Client connected: ${socket.id}`);
        socket.on('disconnect', () => {
            console.log(`WebSocket Client disconnected: ${socket.id}`);
        });
    });


    // --- Helper Functions ---
    const generateId = (prefix) => `${prefix}_${Date.now()}${Math.random().toString(36).substring(2, 9)}`;
    
    const parseUserRoles = (user) => {
        if (user && typeof user.roles === 'string') {
            try {
                return { ...user, roles: JSON.parse(user.roles) };
            } catch (e) { console.error(`Failed to parse roles for user ${user.id}`); }
        }
        return user;
    };

    const parseJsonField = (item, field) => {
        if (item && item[field] && typeof item[field] === 'string') {
            try {
                return { ...item, [field]: JSON.parse(item[field]) };
            } catch (e) {
                console.error(`Failed to parse JSON for field ${field}:`, e);
                return { ...item, [field]: null }; // Return null or an empty object/array on failure
            }
        }
        return item;
    };
    
    // Twilio Client
    const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
        ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        : null;


    // --- Nodemailer Transporter ---
    const transporter = nodemailer.createTransport({
      host: 'smtpout.secureserver.net',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    async function sendEmail(notification) {
        const { recipient, subject, message } = notification;

        const mailOptions = {
            from: `"Flash Express" <${process.env.EMAIL_USER}>`,
            to: recipient,
            subject: subject,
            html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully to:', recipient);
            return true;
        } catch (error) {
            console.error('Failed to send email:', error);
            return false;
        }
    }

    // --- Internal Business Logic ---
    const updateStatusAndHistory = async (trx, shipmentId, newStatus) => {
        const shipment = await trx('shipments').where({ id: shipmentId }).first();
        if (!shipment) return;

        const currentHistory = Array.isArray(shipment.statusHistory) ? shipment.statusHistory : (JSON.parse(shipment.statusHistory || '[]'));
        
        // Avoid duplicate status entries
        if (currentHistory.length > 0 && currentHistory[currentHistory.length - 1].status === newStatus) {
            return;
        }
        
        currentHistory.push({ status: newStatus, timestamp: new Date().toISOString() });
        
        await trx('shipments').where({ id: shipmentId }).update({
            status: newStatus,
            statusHistory: JSON.stringify(currentHistory)
        });
        
        await createNotification(trx, shipment, newStatus);
    };

    const createNotification = async (trx, shipment, newStatus) => {
        const client = await trx('users').where({ id: shipment.clientId }).first();
        if (!client) return;

        const message = `Shipment Update\n\nHello ${client.name},\n\nThe status of your shipment ${shipment.id} to ${shipment.recipientName} has been updated to: ${newStatus}.`;
        
        const notification = {
            id: generateId('NOT'),
            shipmentId: shipment.id,
            channel: 'Email',
            recipient: client.email,
            message: message,
            date: new Date().toISOString(),
            status: newStatus,
            sent: false,
        };

        await trx('notifications').insert(notification);
        
        sendEmail({ recipient: client.email, subject: `Shipment ${shipment.id} is now ${newStatus}`, message }).then(async sent => {
            if (sent) {
                await knex('notifications').where({ id: notification.id }).update({ sent: true });
                io.emit('data_updated');
            }
        }).catch(err => console.error("Async email send failed:", err));
    };

    const processDeliveredShipment = async (trx, shipment) => {
        const newStatus = 'Delivered';
        const updatePayload = { 
            status: newStatus, 
            deliveryDate: new Date().toISOString() 
        };
        
        const currentHistory = Array.isArray(shipment.statusHistory) ? shipment.statusHistory : (JSON.parse(shipment.statusHistory || '[]'));
        currentHistory.push({ status: newStatus, timestamp: updatePayload.deliveryDate });
        updatePayload.statusHistory = JSON.stringify(currentHistory);

        await trx('shipments').where({ id: shipment.id }).update(updatePayload);
        await createNotification(trx, shipment, newStatus);
    
        if (shipment.courierId) {
            // Standard commission for delivery
            const courierStats = await trx('courier_stats').where({ courierId: shipment.courierId }).first();
            if (courierStats) {
                const commissionAmount = shipment.courierCommission || 0;
                if (commissionAmount > 0) {
                    await trx('courier_transactions').insert({
                        id: generateId('TRN'),
                        courierId: shipment.courierId,
                        type: 'Commission',
                        amount: commissionAmount,
                        description: `Commission for shipment ${shipment.id}`,
                        shipmentId: shipment.id,
                        timestamp: new Date().toISOString(),
                        status: 'Processed'
                    });
                }
                await trx('courier_stats').where({ courierId: shipment.courierId }).update({ consecutiveFailures: 0 });
            }

            // Referral commission
            const deliveringCourier = await trx('users').where({ id: shipment.courierId }).first();
            if (deliveringCourier && deliveringCourier.referrerId) {
                const referrer = await trx('users').where({ id: deliveringCourier.referrerId }).first();
                if (referrer && referrer.referralCommission > 0) {
                    await trx('courier_transactions').insert({
                        id: generateId('TRN_REF'),
                        courierId: referrer.id,
                        type: 'Referral Bonus',
                        amount: referrer.referralCommission,
                        description: `Referral bonus for shipment ${shipment.id} delivered by ${deliveringCourier.name}`,
                        shipmentId: shipment.id,
                        timestamp: new Date().toISOString(),
                        status: 'Processed'
                    });
                }
            }
        }
    
        if (shipment.paymentMethod === 'Wallet') {
            const client = await trx('users').where({ id: shipment.clientId }).first();
            if (client) {
                const packageValue = shipment.packageValue || 0;
                const shippingFee = shipment.clientFlatRateFee || 0;
                await trx('client_transactions').insert([
                    { id: generateId('TRN'), userId: client.id, type: 'Deposit', amount: packageValue, date: new Date().toISOString(), description: `Credit for delivered shipment ${shipment.id}` },
                    { id: generateId('TRN'), userId: client.id, type: 'Payment', amount: -shippingFee, date: new Date().toISOString(), description: `Shipping fee for ${shipment.id}` }
                ]);
            }
        }
    };


    // --- API Endpoints ---

    // Role Management
    app.get('/api/roles', async (req, res) => {
        try {
            const roles = await knex('custom_roles').select();
            const parsedRoles = roles.map(r => parseJsonField(r, 'permissions'));
            res.json(parsedRoles);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch roles' });
        }
    });

    app.post('/api/roles', async (req, res) => {
        const { name, permissions } = req.body;
        if (!name || !permissions) {
            return res.status(400).json({ error: 'Missing role name or permissions' });
        }
        try {
            const newRole = { id: generateId('role'), name, permissions: JSON.stringify(permissions), isSystemRole: false };
            await knex('custom_roles').insert(newRole);
            res.status(201).json(parseJsonField(newRole, 'permissions'));
            io.emit('data_updated');
        } catch (error) {
            res.status(500).json({ error: 'Server error creating role' });
        }
    });

    app.put('/api/roles/:id', async (req, res) => {
        const { id } = req.params;
        const { name, permissions } = req.body;
        const updatePayload = {};
        if (name) updatePayload.name = name;
        if (permissions) updatePayload.permissions = JSON.stringify(permissions);

        try {
            await knex('custom_roles').where({ id }).update(updatePayload);
            res.status(200).json({ success: true });
            io.emit('data_updated');
        } catch (error) {
            res.status(500).json({ error: 'Server error updating role' });
        }
    });

    app.delete('/api/roles/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const role = await knex('custom_roles').where({ id }).first();
            if (role.isSystemRole) {
                return res.status(403).json({ error: 'Cannot delete a system role.' });
            }
            await knex('custom_roles').where({ id }).del();
            res.status(200).json({ success: true });
            io.emit('data_updated');
        } catch (error) {
            res.status(500).json({ error: 'Server error deleting role' });
        }
    });
    

    // User Login
    app.post('/api/login', async (req, res) => {
        const { email, password } = req.body;
        try {
            const user = await knex('users').where({ email: email.toLowerCase() }).first();
            if (user) {
                const match = await bcrypt.compare(password, user.password);
                if (match) {
                    const { password, ...userWithoutPassword } = user;
                    let finalUser = parseUserRoles(userWithoutPassword);
                    finalUser = parseJsonField(finalUser, 'address'); // Ensure address is an object
                    finalUser = parseJsonField(finalUser, 'zones'); // Ensure zones is an array
                    res.json(finalUser);
                } else {
                    res.status(401).json({ error: 'Invalid credentials' });
                }
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ error: 'Server error during login' });
        }
    });

    // Fetch all application data
    app.get('/api/data', async (req, res) => {
      try {
        const [users, shipments, clientTransactions, courierStats, courierTransactions, notifications, customRoles, inventoryItems, assets] = await Promise.all([
          knex('users').select(),
          knex('shipments').select(),
          knex('client_transactions').select(),
          knex('courier_stats').select(),
          knex('courier_transactions').select(),
          knex('notifications').select(),
          knex('custom_roles').select(),
          knex('inventory_items').select(),
          knex('assets').select(),
        ]);

        const safeUsers = users.map(u => {
            let { password, ...user } = u;
            user = parseUserRoles(user);
            user = parseJsonField(user, 'address');
            user = parseJsonField(user, 'zones');
            return user;
        });
        
        const parsedShipments = shipments.map(s => {
            let shipment = s;
            shipment = parseJsonField(shipment, 'fromAddress');
            shipment = parseJsonField(shipment, 'toAddress');
            shipment = parseJsonField(shipment, 'packagingLog');
            shipment = parseJsonField(shipment, 'statusHistory');
            return shipment;
        });

        const parsedRoles = customRoles.map(r => parseJsonField(r, 'permissions'));

        res.json({ users: safeUsers, shipments: parsedShipments, clientTransactions, courierStats, courierTransactions, notifications, customRoles: parsedRoles, inventoryItems, assets });
      } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch application data' });
      }
    });

    // User Management
    app.post('/api/users', async (req, res) => {
        const { name, email, password, roles, zones, address, phone, flatRateFee, taxCardNumber, referrerId, referralCommission } = req.body;
        
        if (!name || !email || !password || !roles || roles.length === 0) {
            return res.status(400).json({ error: 'Missing required fields: name, email, password, roles' });
        }

        try {
            let newUser = null;
            await knex.transaction(async (trx) => {
                const hashedPassword = await bcrypt.hash(password, saltRounds);
                const userPayload = {
                    name,
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    roles: JSON.stringify(roles),
                    phone: phone || null,
                    address: address ? JSON.stringify(address) : null,
                    referrerId: referrerId || null,
                    referralCommission: referralCommission || null,
                };

                if (roles.includes('Client')) {
                    userPayload.flatRateFee = flatRateFee !== undefined ? flatRateFee : 75.0;
                    userPayload.taxCardNumber = taxCardNumber || null;
                }
                if (roles.includes('Courier')) {
                    userPayload.zones = zones ? JSON.stringify(zones) : JSON.stringify([]);
                }
                
                // Insert user to get the ID
                const [insertedId] = await trx('users').insert(userPayload).returning('id');
                const id = insertedId.id || insertedId;

                // Generate publicId and update
                const rolePrefixes = { 'Client': 'CL', 'Administrator': 'AD', 'Courier': 'CO', 'Super User': 'SA', 'Assigning User': 'AS'};
                const prefix = rolePrefixes[roles[0]] || 'USR';
                const publicId = `${prefix}-${id}`;
                await trx('users').where({id}).update({ publicId });
                
                const finalUser = await trx('users').where({id}).first();


                if (roles.includes('Courier')) {
                    await trx('courier_stats').insert({
                        courierId: id,
                        commissionType: 'flat',
                        commissionValue: 30,
                        consecutiveFailures: 0,
                        isRestricted: false,
                        performanceRating: 5.0,
                    });
                }
                newUser = finalUser;
            });
            
            const { password: _, ...userWithoutPassword } = newUser;
            let finalUser = parseUserRoles(userWithoutPassword);
            finalUser = parseJsonField(finalUser, 'zones');
            res.status(201).json(finalUser);
            io.emit('data_updated');
        } catch (error) {
            console.error('Error creating user:', error);
            if (error.code === 'SQLITE_CONSTRAINT' || (error.message && error.message.includes('UNIQUE constraint failed'))) {
                return res.status(409).json({ error: 'A user with this email already exists.' });
            }
            res.status(500).json({ error: 'Server error creating user' });
        }
    });

    app.put('/api/users/:id', async (req, res) => {
        const { id } = req.params;
        const { address, roles, zones, ...userData } = req.body;
        if (address) userData.address = JSON.stringify(address);
        if (roles) userData.roles = JSON.stringify(roles);
        if (zones) userData.zones = JSON.stringify(zones);
        
        try {
            // Do not allow password to be changed via this generic endpoint
            delete userData.password;
            await knex('users').where({ id }).update(userData);
            res.status(200).json({ success: true });
            io.emit('data_updated');
        } 
        catch (error) { res.status(500).json({ error: 'Server error updating user' }); }
    });

    app.delete('/api/users/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await knex('users').where({ id }).del();
            res.status(200).json({ success: true });
            io.emit('data_updated');
        }
        catch (error) { res.status(500).json({ error: 'Server error deleting user' }); }
    });

    app.put('/api/users/:id/password', async (req, res) => {
        const { id } = req.params;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        try { 
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            await knex('users').where({ id }).update({ password: hashedPassword });
            res.status(200).json({ success: true });
            io.emit('data_updated');
        }
        catch (error) { res.status(500).json({ error: 'Server error resetting password' }); }
    });

    app.put('/api/clients/:id/flatrate', async (req, res) => {
        const { id } = req.params;
        const { flatRateFee } = req.body;
        try {
            await knex('users').where({ id }).andWhereJsonSupersetOf('roles', ['Client']).update({ flatRateFee });
            res.status(200).json({ success: true });
            io.emit('data_updated');
        }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    app.put('/api/clients/:id/taxcard', async (req, res) => {
        const { id } = req.params;
        const { taxCardNumber } = req.body;
        try {
            await knex('users').where({ id }).andWhereJsonSupersetOf('roles', ['Client']).update({ taxCardNumber });
            res.status(200).json({ success: true });
            io.emit('data_updated');
        }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });


    // Shipment Management
    app.post('/api/shipments', async (req, res) => {
        const shipmentData = req.body;
        try {
            const today = new Date();
            const yymmdd = today.toISOString().slice(2, 10).replace(/-/g, "");
            const cityCode = (shipmentData.toAddress.city || 'UNK').substring(0, 3).toUpperCase();
            const sequence = Date.now().toString().slice(-4);
            const newId = `${cityCode}-${yymmdd}-${shipmentData.clientId}-${sequence}`;

            const initialStatus = 'Waiting for Packaging';
            const statusHistory = [{ status: initialStatus, timestamp: new Date().toISOString() }];

            const newShipment = { 
                ...shipmentData, 
                id: newId, 
                status: initialStatus,
                statusHistory: JSON.stringify(statusHistory),
                creationDate: new Date().toISOString(), 
                fromAddress: JSON.stringify(shipmentData.fromAddress), 
                toAddress: JSON.stringify(shipmentData.toAddress) 
            };
            await knex('shipments').insert(newShipment);
            res.status(201).json(newShipment);
            io.emit('data_updated');
        } catch (error) { 
            console.error("Error creating shipment:", error);
            res.status(500).json({ error: 'Server error creating shipment' }); 
        }
    });

    app.put('/api/shipments/:id/status', async (req, res) => {
        const { id } = req.params;
        const { status, failureReason, failurePhoto } = req.body;
    
        try {
            await knex.transaction(async (trx) => {
                const shipment = await trx('shipments').where({ id }).first();
                if (!shipment) {
                    const err = new Error('Shipment not found');
                    err.statusCode = 404;
                    throw err;
                }
                
                if (status === 'Delivered') {
                    const err = new Error("Deliveries must be confirmed via the verification endpoint.");
                    err.statusCode = 400;
                    throw err;
                }
    
                const updatePayload = { status };
                if (req.body.hasOwnProperty('failureReason')) updatePayload.failureReason = failureReason || null;
                
                // Handle photo upload for failure
                if (status === 'Delivery Failed' && failurePhoto) {
                    try {
                        const matches = failurePhoto.match(/^data:(.+?);base64,(.+)$/);
                        if (matches && matches.length === 3) {
                            const imageType = matches[1].split('/')[1];
                            const buffer = Buffer.from(matches[2], 'base64');
                            const fileName = `${shipment.id}_${Date.now()}.${imageType}`;
                            const filePath = path.join(uploadsDir, fileName);
                            
                            fs.writeFileSync(filePath, buffer);
                            updatePayload.failurePhotoPath = `uploads/${fileName}`;
                        }
                    } catch (e) { console.error('Could not save failure photo:', e); }
                }

                const currentHistory = JSON.parse(shipment.statusHistory || '[]');
                currentHistory.push({ status: status, timestamp: new Date().toISOString() });
                updatePayload.statusHistory = JSON.stringify(currentHistory);

                await trx('shipments').where({ id }).update(updatePayload);
    
                await createNotification(trx, shipment, status);
    
                if (status === 'Delivery Failed') {
                    if (shipment.courierId) {
                        const courierStats = await trx('courier_stats').where({ courierId: shipment.courierId }).first();
                        if (courierStats) {
                            const newFailures = (courierStats.consecutiveFailures || 0) + 1;
                            const failureLimit = 3;
                            const shouldRestrict = newFailures >= failureLimit;
                            await trx('courier_stats').where({ courierId: shipment.courierId }).update({
                                consecutiveFailures: newFailures,
                                isRestricted: shouldRestrict,
                                restrictionReason: shouldRestrict ? `Exceeded failure limit of ${failureLimit}.` : null
                            });
                        }
                    }
                }
            });
            res.status(200).json({ success: true });
            io.emit('data_updated');
        } catch (error) {
            console.error("Error updating shipment status:", error);
            const statusCode = error.statusCode || 500;
            const message = error.message || 'Server error while updating status';
            res.status(statusCode).json({ error: message });
        }
    });

    app.put('/api/shipments/:id/assign', async (req, res) => {
        const { id } = req.params;
        const { courierId } = req.body;
        try {
            await knex.transaction(async (trx) => {
                const shipment = await trx('shipments').where({ id }).first();
                if (!shipment) {
                    const err = new Error('Shipment not found');
                    err.statusCode = 404;
                    throw err;
                }
                
                const client = await trx('users').where({ id: shipment.clientId }).first();
                if (!client) {
                    const err = new Error('Client not found for shipment');
                    err.statusCode = 404;
                    throw err;
                }

                let courierStats = await trx('courier_stats').where({ courierId }).first();

                if (!courierStats) {
                    const defaultStats = { courierId: courierId, commissionType: 'flat', commissionValue: 30, consecutiveFailures: 0, isRestricted: false, performanceRating: 5.0 };
                    await trx('courier_stats').insert(defaultStats);
                    courierStats = defaultStats;
                }

                const commission = courierStats.commissionType === 'flat' ? courierStats.commissionValue : shipment.price * (courierStats.commissionValue / 100);
                const newStatus = 'Assigned to Courier';
                
                const currentHistory = JSON.parse(shipment.statusHistory || '[]');
                currentHistory.push({ status: newStatus, timestamp: new Date().toISOString() });

                await trx('shipments').where({ id }).update({
                    courierId,
                    status: newStatus,
                    statusHistory: JSON.stringify(currentHistory),
                    clientFlatRateFee: client.flatRateFee,
                    courierCommission: commission
                });

                 await createNotification(trx, shipment, newStatus);
            });
            res.status(200).json({ success: true });
            io.emit('data_updated');
        } catch (error) {
            console.error("Error in shipment assignment:", error);
            const statusCode = error.statusCode || 500;
            const message = error.message || 'Server error during assignment';
            res.status(statusCode).json({ error: message });
        }
    });

    app.put('/api/shipments/:id/fees', async (req, res) => {
        const { id } = req.params;
        const { clientFlatRateFee, courierCommission } = req.body;
        try {
            const payload = {};
            if (clientFlatRateFee !== undefined) payload.clientFlatRateFee = clientFlatRateFee;
            if (courierCommission !== undefined) payload.courierCommission = courierCommission;
            await knex('shipments').where({ id }).update(payload);
            res.status(200).json({ success: true });
            io.emit('data_updated');
        } catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    // --- New Recipient Verification Endpoints ---
    app.post('/api/shipments/:id/send-delivery-code', async (req, res) => {
        const { id } = req.params;
        try {
            const shipment = await knex('shipments').where({ id }).first();
            if (!shipment) return res.status(404).json({ error: "Shipment not found." });
            if (!shipment.recipientPhone) return res.status(400).json({ error: "Recipient phone number not available for this shipment." });

            const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
            const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

            await knex('delivery_verifications').insert({ shipmentId: id, code, expires_at }).onConflict('shipmentId').merge();
            
            const message = `Your Flash Express delivery code for shipment ${id} is: ${code}`;
            
            await knex('notifications').insert({
                id: generateId('NOT'),
                shipmentId: id,
                channel: 'SMS',
                recipient: shipment.recipientPhone,
                message: 'Delivery verification code sent to recipient.',
                date: new Date().toISOString(),
                status: shipment.status,
                sent: true,
            });

            if (twilioClient) {
                await twilioClient.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to: shipment.recipientPhone });
            }
            console.log(`==== Delivery Verification for ${id} to ${shipment.recipientPhone} ====\nCode: ${code}\n=======================================`);
            
            res.json({ success: true, message: 'Delivery verification code sent to recipient.' });
            io.emit('data_updated');
        } catch (error) {
            console.error('Delivery code sending error:', error);
            res.status(500).json({ error: 'Failed to send delivery code.' });
        }
    });

    app.post('/api/shipments/:id/verify-delivery', async (req, res) => {
        const { id } = req.params;
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Verification code is required.' });

        try {
            await knex.transaction(async trx => {
                const verification = await trx('delivery_verifications').where({ shipmentId: id }).first();
                if (!verification || new Date() > new Date(verification.expires_at)) {
                    const err = new Error('Verification code expired or invalid.');
                    err.statusCode = 400;
                    throw err;
                }

                if (verification.code === code) {
                    const shipment = parseJsonField(await trx('shipments').where({ id }).first(), 'statusHistory');
                    if (!shipment) {
                        const err = new Error('Shipment not found.');
                        err.statusCode = 404;
                        throw err;
                    }
                    await processDeliveredShipment(trx, shipment);
                    await trx('delivery_verifications').where({ shipmentId: id }).del();
                } else {
                    const err = new Error('Incorrect verification code.');
                    err.statusCode = 400;
                    throw err;
                }
            });
            res.json({ success: true, message: 'Delivery confirmed successfully.' });
            io.emit('data_updated');
        } catch (error) {
            console.error('Delivery verification error:', error);
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({ error: error.message || 'Server error verifying delivery.' });
        }
    });


    // Courier Financials
    app.put('/api/couriers/:id/settings', async (req, res) => {
        const { id } = req.params;
        const { commissionType, commissionValue } = req.body;
        try {
            await knex('courier_stats').where({ courierId: id }).update({ commissionType, commissionValue });
            res.status(200).json({ success: true });
            io.emit('data_updated');
        }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    app.post('/api/couriers/:id/penalty', async (req, res) => {
        const { id } = req.params;
        const { amount, description, shipmentId } = req.body;
        try { 
            await knex('courier_transactions').insert({ 
                id: generateId('TRN'), courierId: id, type: 'Penalty', amount: -Math.abs(amount), description, 
                shipmentId: shipmentId || null, timestamp: new Date().toISOString(), status: 'Processed' 
            });
            res.status(200).json({ success: true });
            io.emit('data_updated');
        }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    app.post('/api/couriers/:id/failed-delivery-penalty', async (req, res) => {
        const { id } = req.params;
        const { shipmentId, description } = req.body;
        try {
            const shipment = await knex('shipments').where({ id: shipmentId }).first();
            if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
            
            const penaltyAmount = shipment.packageValue;
            
            await knex('courier_transactions').insert({ 
                id: generateId('TRN'), courierId: id, type: 'Penalty', amount: -penaltyAmount, 
                description: description || `Penalty for failed delivery of ${shipmentId} - Package value: ${penaltyAmount} EGP`, 
                shipmentId: shipmentId, timestamp: new Date().toISOString(), status: 'Processed' 
            });
            res.status(200).json({ success: true, penaltyAmount, message: `Penalty of ${penaltyAmount} EGP applied` });
            io.emit('data_updated');
        } catch (error) { 
            console.error('Error applying failed delivery penalty:', error);
            res.status(500).json({ error: 'Server error applying penalty' }); 
        }
    });

    app.post('/api/couriers/payouts', async (req, res) => {
        const { courierId, amount } = req.body;
        try {
            await knex('courier_transactions').insert({ id: generateId('TRN'), courierId, type: 'Withdrawal Request', amount: -Math.abs(amount), description: 'Payout request from courier', timestamp: new Date().toISOString(), status: 'Pending' });
            res.status(200).json({ success: true });
            io.emit('data_updated');
        }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    app.put('/api/payouts/:id/process', async (req, res) => {
        const { id } = req.params;
        try {
            await knex('courier_transactions').where({ id }).update({ status: 'Processed', type: 'Withdrawal Processed', description: 'Payout processed by admin' });
            res.status(200).json({ success: true });
            io.emit('data_updated');
        }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });


    // Notifications
    app.post('/api/notifications/:id/resend', async (req, res) => {
        const { id } = req.params;
        try {
            const notification = await knex('notifications').where({ id }).first();
            if (!notification) return res.status(404).json({ error: 'Notification not found' });
            
            const messageParts = notification.message.split('\n\n');
            const subject = messageParts[0] || `Update for Shipment ${notification.shipmentId}`;
            
            const emailSent = await sendEmail({ recipient: notification.recipient, subject, message: notification.message });
            
            await knex('notifications').where({ id }).update({ sent: emailSent });
            res.status(200).json({ success: true, sent: emailSent });
            io.emit('data_updated');
        } catch (error) {
            res.status(500).json({ error: 'Server error resending notification' });
        }
    });

    // Public Shipment Tracking
    app.post('/api/track', async (req, res) => {
        const { trackingId, phone } = req.body;
        if (!trackingId || !phone) return res.status(400).json({ error: 'Tracking ID and phone number required.' });

        try {
            const shipment = await knex('shipments').whereRaw('UPPER(id) = ?', [trackingId.toUpperCase()]).first();
            if (shipment) {
                 const client = await knex('users').where({ id: shipment.clientId }).first();
                 if (shipment.recipientPhone === phone || client?.phone === phone) {
                    const parsedShipment = parseJsonField(parseJsonField(parseJsonField(shipment, 'fromAddress'), 'toAddress'), 'statusHistory');
                    return res.json(parsedShipment);
                 }
            }
            return res.status(404).json({ error: 'Wrong shipment ID or phone number.' });

        } catch (error) {
            console.error('Error tracking shipment:', error);
            res.status(500).json({ error: 'Server error during tracking.' });
        }
    });

    // --- Inventory & Asset Management Endpoints ---

    // Inventory
    app.delete('/api/inventory/:id', async (req, res) => {
        try {
            await knex('inventory_items').where({ id: req.params.id }).del();
            res.json({ success: true });
            io.emit('data_updated');
        } catch (e) { res.status(500).json({ error: 'Failed to delete inventory item' }); }
    });

    app.post('/api/inventory', async (req, res) => {
        const { name, quantity, unit, minStock, unitPrice } = req.body;
        try {
            const newItem = {
                id: generateId('inv'),
                name,
                quantity,
                unit,
                lastUpdated: new Date().toISOString(),
                minStock: minStock || 10,
                unitPrice: unitPrice || 0,
            };
            await knex('inventory_items').insert(newItem);
            res.status(201).json(newItem);
            io.emit('data_updated');
        } catch (e) { res.status(500).json({ error: 'Failed to create inventory item' }); }
    });
    
    app.put('/api/inventory/:id', async (req, res) => {
        const { id } = req.params;
        const { name, quantity, unit, minStock, unitPrice } = req.body;
        try {
            const updatePayload = {};
            if (name !== undefined) updatePayload.name = name;
            if (quantity !== undefined) updatePayload.quantity = quantity;
            if (unit !== undefined) updatePayload.unit = unit;
            if (minStock !== undefined) updatePayload.minStock = minStock;
            if (unitPrice !== undefined) updatePayload.unitPrice = unitPrice;
            
            if (Object.keys(updatePayload).length > 0) {
                 updatePayload.lastUpdated = new Date().toISOString();
                 await knex('inventory_items').where({ id }).update(updatePayload);
            }
            
            res.status(200).json({ success: true });
            io.emit('data_updated');
        } catch (e) { res.status(500).json({ error: 'Failed to update inventory' }); }
    });

    app.put('/api/shipments/:id/packaging', async (req, res) => {
        const { id } = req.params;
        const { packagingLog, packagingNotes } = req.body;
        try {
            await knex.transaction(async trx => {
                const shipment = await trx('shipments').where({ id }).first();
                const newStatus = 'Packaged and Waiting for Assignment';
                
                const currentHistory = JSON.parse(shipment.statusHistory || '[]');
                currentHistory.push({ status: newStatus, timestamp: new Date().toISOString() });
                
                await trx('shipments').where({ id }).update({ 
                    packagingLog: JSON.stringify(packagingLog), 
                    packagingNotes,
                    status: newStatus,
                    statusHistory: JSON.stringify(currentHistory)
                });

                for (const item of packagingLog) {
                    await trx('inventory_items').where({ id: item.inventoryItemId }).decrement('quantity', item.quantityUsed);
                }

                await createNotification(trx, shipment, newStatus);
            });
            res.json({ success: true });
            io.emit('data_updated');
        } catch (e) {
            console.error('Error updating packaging:', e);
            res.status(500).json({ error: 'Failed to update shipment packaging' });
        }
    });

    // Assets
    app.delete('/api/assets/:id', async (req, res) => {
        try {
            await knex('assets').where({ id: req.params.id }).del();
            res.json({ success: true });
            io.emit('data_updated');
        } catch (e) { res.status(500).json({ error: 'Failed to delete asset' }); }
    });

    app.post('/api/assets', async (req, res) => {
      const { type, name, identifier } = req.body;
      try {
        const newAsset = { id: generateId('asset'), type, name, identifier, status: 'Available' };
        await knex('assets').insert(newAsset);
        res.status(201).json(newAsset);
        io.emit('data_updated');
      } catch (e) { res.status(500).json({ error: 'Failed to create asset' }); }
    });

    app.put('/api/assets/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await knex('assets').where({ id }).update(req.body);
            res.json({ success: true });
            io.emit('data_updated');
        } catch (e) { res.status(500).json({ error: 'Failed to update asset' }); }
    });

    app.post('/api/assets/:id/assign', async (req, res) => {
        const { id } = req.params;
        const { userId } = req.body;
        try {
            await knex('assets').where({ id }).update({ 
                assignedToUserId: userId, 
                status: 'Assigned',
                assignmentDate: new Date().toISOString()
            });
            res.json({ success: true });
            io.emit('data_updated');
        } catch (e) { res.status(500).json({ error: 'Failed to assign asset' }); }
    });

    app.post('/api/assets/:id/unassign', async (req, res) => {
        const { id } = req.params;
        try {
            await knex('assets').where({ id }).update({ 
                assignedToUserId: null, 
                status: 'Available',
                assignmentDate: null
            });
            res.json({ success: true });
            io.emit('data_updated');
        } catch (e) { res.status(500).json({ error: 'Failed to unassign asset' }); }
    });


    // Fallback for client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });

    // --- Scheduled Cleanup Task ---
    const cleanupExpiredFailurePhotos = async () => {
        console.log('Running scheduled job: cleaning up expired failure photos...');
        try {
            const shipmentsWithPhotos = await knex('shipments').whereNotNull('failurePhotoPath');
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

            for (const shipment of shipmentsWithPhotos) {
                try {
                    const history = JSON.parse(shipment.statusHistory || '[]');
                    const failureEntry = history.slice().reverse().find(h => h.status === 'Delivery Failed');
                    
                    if (failureEntry) {
                        const failureTime = new Date(failureEntry.timestamp);
                        if (failureTime < threeDaysAgo) {
                            console.log(`Photo for shipment ${shipment.id} is older than 3 days. Deleting.`);
                            const fullPath = path.join(__dirname, shipment.failurePhotoPath);
                            if (fs.existsSync(fullPath)) {
                                fs.unlinkSync(fullPath);
                                console.log(`Deleted file: ${fullPath}`);
                            }
                            await knex('shipments').where({ id: shipment.id }).update({ failurePhotoPath: null });
                            io.emit('data_updated');
                        }
                    }
                } catch (err) {
                    console.error(`Error processing shipment ${shipment.id} for photo cleanup:`, err);
                }
            }
        } catch (error) {
            console.error('Error during photo cleanup job:', error);
        }
    };

    // Run the cleanup job every hour
    setInterval(cleanupExpiredFailurePhotos, 60 * 60 * 1000);
    // Run once on startup as well
    cleanupExpiredFailurePhotos();

    // Start the server
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`Backend and WebSocket server listening on port ${PORT}`);
    });
}

// Start the application
main();
