// server/db.js
const path = require('path');

const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'flash.sqlite'),
  },
  useNullAsDefault: true,
});

async function setupDatabase() {
  console.log('Setting up database...');
  try {
    const hasUsersTable = await knex.schema.hasTable('users');
    if (!hasUsersTable) {
      console.log('Creating "users" table...');
      await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('email').unique().notNullable();
        table.string('password').notNullable();
        table.string('role').notNullable();
        table.string('zone');
        table.string('phone');
        table.json('address');
        table.decimal('flatRateFee', 10, 2);
        table.string('taxCardNumber');
      });
    }

    const hasCustomRolesTable = await knex.schema.hasTable('custom_roles');
    if (!hasCustomRolesTable) {
        console.log('Creating "custom_roles" table...');
        await knex.schema.createTable('custom_roles', table => {
            table.string('id').primary();
            table.string('name').unique().notNullable();
            table.json('permissions').notNullable();
            table.boolean('isSystemRole').defaultTo(false);
        });

        console.log('Seeding default roles...');
        const allPermissions = [
            'manage_users', 'manage_roles', 'create_shipments', 'view_own_shipments', 'view_all_shipments',
            'assign_shipments', 'manage_returns', 'view_courier_tasks', 'update_shipment_status', 
            'view_own_wallet', 'view_own_financials', 'view_admin_financials', 'view_client_analytics', 
            'view_courier_performance', 'manage_courier_payouts', 'view_courier_earnings', 
            'view_notifications_log', 'view_dashboard', 'view_profile', 'view_total_shipments_overview'
        ];
        const clientPermissions = ['create_shipments', 'view_own_shipments', 'view_own_wallet', 'view_own_financials', 'view_dashboard', 'view_profile'];
        const courierPermissions = ['view_courier_tasks', 'update_shipment_status', 'view_courier_earnings', 'view_dashboard', 'view_profile'];
        const superUserPermissions = allPermissions.filter(p => p !== 'manage_roles' && p !== 'view_admin_financials');

        const rolesToSeed = [
            { id: 'role_admin', name: 'Administrator', permissions: JSON.stringify(allPermissions), isSystemRole: true },
            { id: 'role_super_user', name: 'Super User', permissions: JSON.stringify(superUserPermissions), isSystemRole: true },
            { id: 'role_client', name: 'Client', permissions: JSON.stringify(clientPermissions), isSystemRole: true },
            { id: 'role_courier', name: 'Courier', permissions: JSON.stringify(courierPermissions), isSystemRole: true },
            { id: 'role_assigning_user', name: 'Assigning User', permissions: JSON.stringify(['assign_shipments', 'view_dashboard']), isSystemRole: true },
        ];
        await knex('custom_roles').insert(rolesToSeed);

        // Seed admin user
        console.log('Seeding admin user...');
        await knex('users').insert({
          name: 'Admin User',
          email: 'admin@flash.com',
          password: 'password123',
          role: 'Administrator',
        });
    }


    const hasShipmentsTable = await knex.schema.hasTable('shipments');
    if (!hasShipmentsTable) {
        console.log('Creating "shipments" table...');
        await knex.schema.createTable('shipments', table => {
            table.string('id').primary();
            table.integer('clientId').unsigned().references('id').inTable('users');
            table.string('clientName').notNullable();
            table.string('recipientName').notNullable();
            table.string('recipientPhone').notNullable();
            table.json('fromAddress').notNullable();
            table.json('toAddress').notNullable();
            table.text('packageDescription');
            table.boolean('isLargeOrder').defaultTo(false);
            table.decimal('price', 10, 2).notNullable();
            table.string('paymentMethod').notNullable();
            table.string('status').notNullable();
            table.integer('courierId').unsigned().references('id').inTable('users');
            table.string('creationDate').notNullable();
            table.string('deliveryDate');
            table.string('priority').notNullable();
            table.decimal('packageValue', 10, 2).notNullable();
            table.decimal('clientFlatRateFee', 10, 2);
            table.decimal('courierCommission', 10, 2);
            table.text('failureReason');
        });
    }

    const hasClientTransactionsTable = await knex.schema.hasTable('client_transactions');
    if (!hasClientTransactionsTable) {
        console.log('Creating "client_transactions" table...');
        await knex.schema.createTable('client_transactions', table => {
            table.string('id').primary();
            table.integer('userId').unsigned().references('id').inTable('users');
            table.string('type').notNullable();
            table.decimal('amount', 10, 2).notNullable();
            table.string('date').notNullable();
            table.string('description').notNullable();
        });
    }

    const hasCourierStatsTable = await knex.schema.hasTable('courier_stats');
    if (!hasCourierStatsTable) {
        console.log('Creating "courier_stats" table...');
        await knex.schema.createTable('courier_stats', table => {
            table.integer('courierId').primary().unsigned().references('id').inTable('users');
            table.string('commissionType').notNullable();
            table.decimal('commissionValue', 10, 2).notNullable();
            table.integer('consecutiveFailures').defaultTo(0);
            table.boolean('isRestricted').defaultTo(false);
            table.string('restrictionReason');
            table.decimal('performanceRating', 3, 1).defaultTo(5.0);
        });
    }

    const hasCourierTransactionsTable = await knex.schema.hasTable('courier_transactions');
     if (!hasCourierTransactionsTable) {
        console.log('Creating "courier_transactions" table...');
        await knex.schema.createTable('courier_transactions', table => {
            table.string('id').primary();
            table.integer('courierId').unsigned().references('id').inTable('users');
            table.string('type').notNullable();
            table.decimal('amount', 10, 2).notNullable();
            table.string('description');
            table.string('shipmentId');
            table.string('timestamp').notNullable();
            table.string('status').notNullable();
        });
    }
    
    const hasNotificationsTable = await knex.schema.hasTable('notifications');
    if (!hasNotificationsTable) {
        console.log('Creating "notifications" table...');
        await knex.schema.createTable('notifications', table => {
            table.string('id').primary();
            table.string('shipmentId').notNullable();
            table.string('channel').notNullable();
            table.string('recipient').notNullable();
            table.text('message').notNullable();
            table.string('date').notNullable();
            table.string('status').notNullable();
            table.boolean('sent').defaultTo(false);
        });
    }
    
    const hasDeliveryVerificationsTable = await knex.schema.hasTable('delivery_verifications');
    if (!hasDeliveryVerificationsTable) {
        console.log('Creating "delivery_verifications" table...');
        await knex.schema.createTable('delivery_verifications', (table) => {
            table.string('shipmentId').primary();
            table.string('code').notNullable();
            table.string('expires_at').notNullable();
        });
    }

    // Migration for removing phoneVerified from users table if it exists
    if (await knex.schema.hasTable('users')) {
      const hasPhoneVerifiedColumn = await knex.schema.hasColumn('users', 'phoneVerified');
      if (hasPhoneVerifiedColumn) {
        console.log('Migration: Removing "phoneVerified" column from "users" table.');
        await knex.schema.alterTable('users', (table) => {
          table.dropColumn('phoneVerified');
        });
      }
    }

    // Migration for removing deliveryPhoto
     if (await knex.schema.hasTable('shipments')) {
        const hasDeliveryPhoto = await knex.schema.hasColumn('shipments', 'deliveryPhoto');
        if (hasDeliveryPhoto) {
             console.log('Migration: Removing "deliveryPhoto" column from "shipments" table.');
            await knex.schema.alterTable('shipments', (table) => {
                table.dropColumn('deliveryPhoto');
            });
        }
     }
    
    // Migration for removing location
    if (await knex.schema.hasTable('users')) {
        const hasLocation = await knex.schema.hasColumn('users', 'location');
        if (hasLocation) {
             console.log('Migration: Removing "location" column from "users" table.');
            await knex.schema.alterTable('users', (table) => {
                table.dropColumn('location');
            });
        }
     }

    // Migration for removing sms_verifications table
    if (await knex.schema.hasTable('sms_verifications')) {
        console.log('Migration: Dropping "sms_verifications" table.');
        await knex.schema.dropTable('sms_verifications');
    }


    console.log('Database setup complete.');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

module.exports = { knex, setupDatabase };