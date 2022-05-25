import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.organizations, table => {
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();
    table.string('name').notNullable();
    table.enum('type', ['BRAND', 'COMMUNITY']).notNullable();
    table.string('website');
    table.string('twitter');
    table.string('discord');
    table.string('admin_email');
    table.string('admin_name');
    table.string('admin_wallet_address');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.organizations);
}

