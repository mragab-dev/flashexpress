// server.js - Your new backend file

// 1. Import necessary libraries
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const { knex, setupDatabase } = require('./db');

// Main async function to set up and start the server
async function main() {
    // Wait for database setup to complete
    await setupDatabase();

    // 2. Initialize Express app
    const app = express();
    app.use(cors()); // Use CORS middleware
    app.use(express.json({limit: '5mb'})); // To parse JSON request bodies, increase limit for signatures

    // Serve static files from the React app
    app.use(express.static(path.join(__dirname, '../dist')));

    // --- Helper Functions ---
    const generateId = (prefix) => `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 9)}`;
    const parseJsonField = (item, field) => (item && item[field] && typeof item[field] === 'string' ? { ...item, [field]: JSON.parse(item[field]) } : item);


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
            text: message,
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
        
        // Send email asynchronously without blocking the transaction
        sendEmail({ recipient: client.email, subject: `Shipment ${shipment.id} is now ${newStatus}`, message }).then(async sent => {
            if (sent) {
                await knex('notifications').where({ id: notification.id }).update({ sent: true });
            }
        }).catch(err => console.error("Async email send failed:", err));
    };


    // --- API Endpoints ---

    // User Login
    app.post('/api/login', async (req, res) => {
      const { email, password } = req.body;
      try {
        const user = await knex('users').where({ email: email.toLowerCase(), password }).first();
        if (user) {
          const { password, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Server error during login' });
      }
    });

    // Fetch all application data
    app.get('/api/data', async (req, res) => {
      try {
        const [users, shipments, clientTransactions, courierStats, courierTransactions, notifications] = await Promise.all([
          knex('users').select(),
          knex('shipments').select(),
          knex('client_transactions').select(),
          knex('courier_stats').select(),
          knex('courier_transactions').select(),
          knex('notifications').select(),
        ]);

        const safeUsers = users.map(u => {
            const { password, ...user } = u;
            let parsedUser = parseJsonField(user, 'address');
            parsedUser = parseJsonField(parsedUser, 'location');
            return parsedUser;
        });
        const parsedShipments = shipments.map(s => parseJsonField(parseJsonField(s, 'fromAddress'), 'toAddress'));

        res.json({ users: safeUsers, shipments: parsedShipments, clientTransactions, courierStats, courierTransactions, notifications });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch application data' });
      }
    });

    // User Management
    app.post('/api/users', async (req, res) => {
        const { name, email, password, role, zone, address, phone, flatRateFee, taxCardNumber, location } = req.body;
        
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields: name, email, password, role' });
        }

        try {
            let newUser = null;
            await knex.transaction(async (trx) => {
                const userPayload = {
                    name,
                    email: email.toLowerCase(),
                    password,
                    role,
                    phone: phone || null,
                    address: address ? JSON.stringify(address) : null,
                    location: location ? JSON.stringify(location) : null,
                };

                if (role === 'Client') {
                    userPayload.flatRateFee = flatRateFee !== undefined ? flatRateFee : 75.0;
                    userPayload.taxCardNumber = taxCardNumber || null;
                } else if (role === 'Courier') {
                    userPayload.zone = zone || null;
                }
                
                const [insertedUser] = await trx('users').insert(userPayload).returning('*');

                if (role === 'Courier') {
                    await trx('courier_stats').insert({
                        courierId: insertedUser.id,
                        commissionType: 'flat',
                        commissionValue: 30, // Default value
                        consecutiveFailures: 0,
                        isRestricted: false,
                        performanceRating: 5.0,
                    });
                }
                newUser = insertedUser;
            });
            
            const { password: _, ...userWithoutPassword } = newUser;
            res.status(201).json(userWithoutPassword);
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
        const { address, location, ...userData } = req.body;
        if (address) userData.address = JSON.stringify(address);
        if (location) userData.location = JSON.stringify(location);
        try { await knex('users').where({ id }).update(userData); res.status(200).json({ success: true }); } 
        catch (error) { res.status(500).json({ error: 'Server error updating user' }); }
    });

    app.delete('/api/users/:id', async (req, res) => {
        const { id } = req.params;
        try { await knex('users').where({ id }).del(); res.status(200).json({ success: true }); }
        catch (error) { res.status(500).json({ error: 'Server error deleting user' }); }
    });

    app.put('/api/users/:id/password', async (req, res) => {
        const { id } = req.params;
        const { password } = req.body;
        try { await knex('users').where({ id }).update({ password }); res.status(200).json({ success: true }); }
        catch (error) { res.status(500).json({ error: 'Server error resetting password' }); }
    });

    app.put('/api/clients/:id/flatrate', async (req, res) => {
        const { id } = req.params;
        const { flatRateFee } = req.body;
        try { await knex('users').where({ id, role: 'Client' }).update({ flatRateFee }); res.status(200).json({ success: true }); }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    app.put('/api/clients/:id/taxcard', async (req, res) => {
        const { id } = req.params;
        const { taxCardNumber } = req.body;
        try { await knex('users').where({ id, role: 'Client' }).update({ taxCardNumber }); res.status(200).json({ success: true }); }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });


    // Shipment Management
    app.post('/api/shipments', async (req, res) => {
        const shipmentData = req.body;
        try {
            const newShipment = { ...shipmentData, id: generateId('FLS'), status: 'Pending Assignment', creationDate: new Date().toISOString(), fromAddress: JSON.stringify(shipmentData.fromAddress), toAddress: JSON.stringify(shipmentData.toAddress) };
            await knex('shipments').insert(newShipment);
            res.status(201).json(newShipment);
        } catch (error) { res.status(500).json({ error: 'Server error creating shipment' }); }
    });

    app.put('/api/shipments/:id/status', async (req, res) => {
        const { id } = req.params;
        const { status, deliveryPhoto, failureReason } = req.body;
    
        try {
            await knex.transaction(async (trx) => {
                // 1. Fetch shipment to ensure it exists and get its current state.
                const shipment = await trx('shipments').where({ id }).first();
                if (!shipment) {
                    const err = new Error('Shipment not found');
                    // @ts-ignore
                    err.statusCode = 404;
                    throw err;
                }
    
                // 2. Prepare and execute the primary update in a single operation.
                const updatePayload = { status };
                if (req.body.hasOwnProperty('deliveryPhoto')) {
                    updatePayload.deliveryPhoto = deliveryPhoto || null;
                }
                if (req.body.hasOwnProperty('failureReason')) {
                    updatePayload.failureReason = failureReason || null;
                }
                if (status === 'Delivered') {
                    updatePayload.deliveryDate = new Date().toISOString();
                }
                await trx('shipments').where({ id }).update(updatePayload);
    
                // 3. Handle side effects based on the new status.
                await createNotification(trx, shipment, status);
    
                if (status === 'Delivered') {
                    // Ensure a courier is assigned before proceeding with courier-related logic.
                    if (!shipment.courierId) {
                        console.warn(`Shipment ${id} marked 'Delivered' without an assigned courier. Skipping courier transactions.`);
                    } else {
                        const courierStats = await trx('courier_stats').where({ courierId: shipment.courierId }).first();
                        if (courierStats) {
                            // Use the commission value snapshotted during assignment for accuracy.
                            const commissionAmount = shipment.courierCommission || 0;
                            if (commissionAmount > 0) {
                                await trx('courier_transactions').insert({
                                    id: generateId('TRN'),
                                    courierId: shipment.courierId,
                                    type: 'Commission',
                                    amount: commissionAmount,
                                    description: `Commission for shipment ${id}`,
                                    shipmentId: id,
                                    timestamp: new Date().toISOString(),
                                    status: 'Processed'
                                });
                            }
                            // Reset consecutive failures on a successful delivery.
                            await trx('courier_stats').where({ courierId: shipment.courierId }).update({ consecutiveFailures: 0 });
                        }
                    }
    
                    // Handle client wallet transactions for 'Wallet' payment method.
                    if (shipment.paymentMethod === 'Wallet') {
                        const client = await trx('users').where({ id: shipment.clientId }).first();
                        if (client) {
                            // Use fallbacks to prevent errors from null/undefined values.
                            const packageValue = shipment.packageValue || 0;
                            const shippingFee = shipment.clientFlatRateFee || 0;
                            await trx('client_transactions').insert([
                                {
                                    id: generateId('TRN'), // Use a robust unique ID generator
                                    userId: client.id,
                                    type: 'Deposit',
                                    amount: packageValue,
                                    date: new Date().toISOString(),
                                    description: `Credit for delivered shipment ${id}`
                                },
                                {
                                    id: generateId('TRN'),
                                    userId: client.id,
                                    type: 'Payment',
                                    amount: -shippingFee,
                                    date: new Date().toISOString(),
                                    description: `Shipping fee for ${id}`
                                }
                            ]);
                        }
                    }
                } else if (status === 'Delivery Failed') {
                    if (shipment.courierId) {
                        const courierStats = await trx('courier_stats').where({ courierId: shipment.courierId }).first();
                        if (courierStats) {
                            const newFailures = (courierStats.consecutiveFailures || 0) + 1;
                            const failureLimit = 3; // This should ideally be a configurable value.
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
        } catch (error) {
            console.error("Error updating shipment status:", error);
            // @ts-ignore
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
                    return res.status(404).json({ error: 'Shipment not found' });
                }

                const client = await trx('users').where({ id: shipment.clientId }).first();
                if (!client) {
                    return res.status(404).json({ error: 'Client not found for shipment' });
                }

                const courierStats = await trx('courier_stats').where({ courierId }).first();
                if (!courierStats) {
                     return res.status(404).json({ error: 'Courier financial settings not found.' });
                }

                // Calculate courier commission based on their settings
                const commission = courierStats.commissionType === 'flat'
                    ? courierStats.commissionValue
                    : shipment.price * (courierStats.commissionValue / 100);

                const updatePayload = {
                    courierId,
                    status: shipment.status === 'Return Requested' ? 'Return in Progress' : 'In Transit',
                    clientFlatRateFee: client.flatRateFee,
                    courierCommission: commission // Save calculated commission on assignment
                };

                await trx('shipments').where({ id }).update(updatePayload);
            });
            res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error in shipment assignment:", error);
            res.status(500).json({ error: 'Server error during assignment' });
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
        } catch (error) { res.status(500).json({ error: 'Server error' }); }
    });


    // Courier Financials
    app.put('/api/couriers/:id/settings', async (req, res) => {
        const { id } = req.params;
        const { commissionType, commissionValue } = req.body;
        try { await knex('courier_stats').where({ courierId: id }).update({ commissionType, commissionValue }); res.status(200).json({ success: true }); }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    app.post('/api/couriers/:id/penalty', async (req, res) => {
        const { id } = req.params;
        const { amount, description, shipmentId } = req.body;
        try { 
            await knex('courier_transactions').insert({ 
                id: generateId('TRN'), 
                courierId: id, 
                type: 'Penalty', 
                amount: -Math.abs(amount), 
                description, 
                shipmentId: shipmentId || null,
                timestamp: new Date().toISOString(), 
                status: 'Processed' 
            }); 
            res.status(200).json({ success: true }); 
        }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    app.post('/api/couriers/:id/failed-delivery-penalty', async (req, res) => {
        const { id } = req.params;
        const { shipmentId, description } = req.body;
        
        try {
            // Get the shipment to calculate the penalty amount
            const shipment = await knex('shipments').where({ id: shipmentId }).first();
            if (!shipment) {
                return res.status(404).json({ error: 'Shipment not found' });
            }
            
            // Calculate penalty as the total package value
            const penaltyAmount = shipment.packageValue;
            
            await knex('courier_transactions').insert({ 
                id: generateId('TRN'), 
                courierId: id, 
                type: 'Penalty', 
                amount: -penaltyAmount, 
                description: description || `Penalty for failed delivery of ${shipmentId} - Package value: ${penaltyAmount} EGP`, 
                shipmentId: shipmentId,
                timestamp: new Date().toISOString(), 
                status: 'Processed' 
            }); 
            
            res.status(200).json({ 
                success: true, 
                penaltyAmount: penaltyAmount,
                message: `Penalty of ${penaltyAmount} EGP applied for failed delivery`
            }); 
        }
        catch (error) { 
            console.error('Error applying failed delivery penalty:', error);
            res.status(500).json({ error: 'Server error applying penalty' }); 
        }
    });

    app.post('/api/couriers/payouts', async (req, res) => {
        const { courierId, amount } = req.body;
        try { await knex('courier_transactions').insert({ id: generateId('TRN'), courierId, type: 'Withdrawal Request', amount: -Math.abs(amount), description: 'Payout request from courier', timestamp: new Date().toISOString(), status: 'Pending' }); res.status(200).json({ success: true }); }
        catch (error) { res.status(500).json({ error: 'Server error' }); }
    });

    app.put('/api/payouts/:id/process', async (req, res) => {
        const { id } = req.params;
        try { await knex('courier_transactions').where({ id }).update({ status: 'Processed', type: 'Withdrawal Processed', description: 'Payout processed by admin' }); res.status(200).json({ success: true }); }
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
            const message = messageParts.slice(1).join('\n\n');
            
            const emailSent = await sendEmail({ recipient: notification.recipient, subject, message });
            
            await knex('notifications').where({ id }).update({ sent: emailSent });
            res.status(200).json({ success: true, sent: emailSent });
        } catch (error) {
            res.status(500).json({ error: 'Server error resending notification' });
        }
    });

    // Public Shipment Tracking
    app.post('/api/track', async (req, res) => {
        const { trackingId, phone } = req.body;

        if (!trackingId || !phone) {
            return res.status(400).json({ error: 'Tracking ID and phone number are required.' });
        }

        try {
            const shipment = await knex('shipments').whereRaw('UPPER(id) = ?', [trackingId.toUpperCase()]).first();

            // Security: check both shipment and phone match before returning anything.
            if (shipment) {
                 const client = await knex('users').where({ id: shipment.clientId }).first();
                 if (shipment.recipientPhone === phone || client?.phone === phone) {
                    const parsedShipment = parseJsonField(parseJsonField(shipment, 'fromAddress'), 'toAddress');
                    return res.json(parsedShipment);
                 }
            }

            // If we reach here, either shipment not found or phone didn't match.
            // Return a generic error to prevent fishing for valid tracking IDs.
            return res.status(404).json({ error: 'Wrong shipment ID or phone number. Please check your details and try again.' });

        } catch (error) {
            console.error('Error tracking shipment:', error);
            res.status(500).json({ error: 'Server error during shipment tracking.' });
        }
    });

    // Fallback for client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });

    // Start the server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Backend server listening on port ${PORT}`);
    });
}

// Start the application
main();