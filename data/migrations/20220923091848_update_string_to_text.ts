import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.string('about', 500).alter();
  });
  await knex.schema.alterTable(dbTables.userTokens, table => {
    table.text('token').alter();
  });
}

// eslint-disable-next-line no-unused-vars
export async function down(knex: Knex): Promise<void> {

}

