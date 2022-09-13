import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.organizations, table => {
    table.renameColumn('admin_email', 'email');
    table.renameColumn('admin_wallet_address', 'public_address');
    table.dropColumn('admin_name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.organizations, table => {
    table.renameColumn('email', 'admin_email');
    table.renameColumn('public_address', 'admin_wallet_address');
    table.string('admin_name');
  });
}
