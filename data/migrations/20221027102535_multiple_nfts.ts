import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.boolean('is_multiple_nft').defaultTo(false);
  });

  await knex.schema.alterTable(dbTables.nftItems, table => {
    table.text('image_64').nullable();
    table.text('image_256').nullable();
    table.text('image_512').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.dropColumn('is_multiple_nft');
  });

  await knex.schema.alterTable(dbTables.nftItems, table => {
    table.dropColumn('image_64');
    table.dropColumn('image_256');
    table.dropColumn('image_512');
  });
}
