import { Knex } from 'knex';
import { dbTables } from '../constants';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.nftCollections, table => {
    // collectionId is needed to separate metadata for different nft collections
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();

    table.specificType('organization_id', 'uuid')
      .notNullable().index()
      .references('id').inTable(dbTables.organizations)
      .onDelete('SET NULL');
    table.string('chain').notNullable();
    table.string('name').notNullable();
    table.string('description').nullable();
    table.string('about').nullable();

    table.string('contract_address').nullable().index();
    table.string('image').nullable();
    table.string('background_header').nullable();
    table.boolean('agree_to_terms').defaultTo(false);
    table.boolean('understand_irreversible_action').defaultTo(false);
    table.boolean('track_ip_addresses').defaultTo(false);

    table.enum('status', ['IN_PROGRESS', 'DEPLOYED']).defaultTo('IN_PROGRESS');
    table.string('mint_voucher').nullable();

    table.jsonb('first_party_data').defaultTo([]);
    table.string('royalties').defaultTo('0');

    table.timestamps(true, true);
  });

  await knex.schema.createTable(dbTables.nftItems, table => {
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();
    // collectionId is needed to separate metadata for different nft collections
    table
      .specificType('collection_id', 'uuid')
      .index()
      .references('id').inTable(dbTables.nftCollections)
      .onDelete('SET NULL');

    table.enum('token_format', ['ERC721', 'ERC1155']).notNullable();

    table.string('chain').notNullable();
    // tokenId: Number of the NFT in its collection
    table.string('token_id').nullable();
    table.text('image').nullable();
    table.text('image_data').nullable();
    table.text('external_url').nullable();
    table.text('description').nullable();
    table.string('name').notNullable();

    // attributes object is serialized to a string
    // For filtering | We can query the json with whereJsonObject
    table.jsonb('attributes').nullable();
    table.string('background_color').nullable();
    table.text('animation_url').nullable();
    table.text('youtube_url').nullable();
    // alters
    table.string('amount').defaultTo('0');
    table.string('max_supply').nullable();
    table.string('price').nullable();
    // Make combined unique; ensure unique token id per collection and also helps for fast querying
    table.unique(['collection_id', 'token_id']);
    table.string('royalties').defaultTo('0');
    table.timestamps(true, true);

  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.nftItems);
  await knex.schema.dropTableIfExists(dbTables.nftCollections);
}

