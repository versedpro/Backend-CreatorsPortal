import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.string('checkout_font').nullable();
    table.integer('checkout_font_size').nullable();
    table.string('checkout_font_color').nullable();
    table.boolean('terms_and_condition_enabled').nullable();
    table.string('terms_and_condition_link').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.dropColumn('checkout_font');
    table.dropColumn('checkout_font_size');
    table.dropColumn('checkout_font_color');
    table.dropColumn('terms_and_condition_enabled');
    table.dropColumn('terms_and_condition_link');
  });
}
