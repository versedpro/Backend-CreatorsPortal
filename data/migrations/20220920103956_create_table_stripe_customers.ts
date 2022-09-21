import { Knex } from 'knex';
import { dbTables } from '../constants';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.stripeCustomers, table => {
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();
    table.specificType('organization_id', 'uuid')
      .notNullable().index()
      .references('id').inTable(dbTables.organizations)
      .onDelete('CASCADE');
    table.string('customer_id').notNullable().unique();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.stripeCustomers);
}

