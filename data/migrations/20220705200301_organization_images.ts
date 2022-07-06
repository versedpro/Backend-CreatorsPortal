import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.organizations, table => {
    table.string('image').nullable();
    table.string('banner').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.organizations, table => {
    table.dropColumn('image');
    table.dropColumn('banner');
  });
}

