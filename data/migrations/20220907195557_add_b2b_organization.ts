import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  // Alter organizations
  await knex.schema.alterTable(dbTables.organizations, table => {
    table.integer('nonce').unsigned().defaultTo(Math.floor(Math.random() * 1000000));
    table.string('facebook');
    table.string('instagram');
    table.enum('onboarding_type', ['INVITED', 'ADMIN_CREATED']).defaultTo('ADMIN_CREATED');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Alter organizations
  await knex.schema.alterTable(dbTables.organizations, table => {
    table.dropColumn('nonce');
    table.dropColumn('facebook');
    table.dropColumn('instagram');
    table.dropColumn('onboarding_type');
  });
}
