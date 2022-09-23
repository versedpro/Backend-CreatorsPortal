import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.organizations, table => {
    table.string('email').notNullable().unique().alter();
    table.string('public_address').notNullable().unique().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.organizations, table => {
    table.dropUnique(['email']);
    table.string('email').nullable().alter();
    table.dropUnique(['public_address']);
    table.string('public_address').nullable().alter();
  });
}
