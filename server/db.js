// server/db.js

const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './flash.sqlite',
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
        table.json('location');
        table.decimal('flatRateFee', 10, 2);
        table.string('taxCardNumber');
      });

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
            table.text('deliveryPhoto');
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

    // --- Schema Migrations ---
    // This block ensures that an existing database is updated with new columns
    // without losing any data. It runs every time the server starts.
    if (await knex.schema.hasTable('shipments')) {
        const hasDeliveryPhoto = await knex.schema.hasColumn('shipments', 'deliveryPhoto');
        const hasFailureReason = await knex.schema.hasColumn('shipments', 'failureReason');
        const hasSignature = await knex.schema.hasColumn('shipments', 'signature');

        if (!hasDeliveryPhoto || !hasFailureReason || hasSignature) {
            await knex.schema.alterTable('shipments', (table) => {
                // Rename legacy 'signature' column to 'deliveryPhoto' if it exists. This is top priority.
                if (hasSignature && !hasDeliveryPhoto) {
                    console.log('Migration: Renaming "signature" column to "deliveryPhoto".');
                    table.renameColumn('signature', 'deliveryPhoto');
                } 
                // If both are missing, add 'deliveryPhoto'.
                else if (!hasSignature && !hasDeliveryPhoto) {
                    console.log('Migration: Adding "deliveryPhoto" column.');
                    table.text('deliveryPhoto');
                }

                // Add 'failureReason' if it's missing.
                if (!hasFailureReason) {
                    console.log('Migration: Adding "failureReason" column.');
                    table.text('failureReason');
                }
            });
        }
    }

    console.log('Database setup complete.');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

module.exports = { knex, setupDatabase };