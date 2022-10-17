import { Knex } from 'knex';
import { dbTables } from '../constants';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.stripeConnectedAccounts, table => {
    table.string('account_id').notNullable().primary();
    table.specificType('organization_id', 'uuid')
      .notNullable().index()
      .references('id').inTable(dbTables.organizations)
      .onDelete('CASCADE');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.stripeConnectedAccounts);
}

