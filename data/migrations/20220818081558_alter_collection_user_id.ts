import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.specificType('organization_id', 'uuid').nullable().alter();
    table.string('tx_hash').nullable();

    table.specificType('user_id', 'uuid')
      .nullable().index()
      .references('id').inTable(dbTables.users)
      .onDelete('SET NULL');

    table.string('tx_error_message', 500).nullable();
  });

  await knex.schema.raw(`
    ALTER TABLE "${dbTables.nftCollections}"
    DROP CONSTRAINT "nft_collections_status_check"
  `);

  await knex(dbTables.nftCollections)
    .where({ status: 'IN_PROGRESS' })
    .update({ status: 'DRAFT' });

  await knex.schema.raw(`
    ALTER TABLE "${dbTables.nftCollections}"
    ADD CONSTRAINT "nft_collections_status_check" 
    CHECK (status in ('DRAFT', 'DEPLOYMENT_IN_PROGRESS', 'DEPLOYMENT_FAILED', 'DEPLOYED'))
  `);

  await knex.schema.raw(`ALTER TABLE "${dbTables.nftCollections}" ALTER status SET DEFAULT 'DRAFT'`);
}

export async function down(knex: Knex): Promise<void> {

  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.dropColumn('tx_hash');
    table.dropColumn('user_id');
    table.dropColumn('tx_error_message');
  });

  await knex.schema.raw(`
    ALTER TABLE "${dbTables.nftCollections}"
    DROP CONSTRAINT "nft_collections_status_check"
  `);

  await knex(dbTables.nftCollections)
    .where({ status: 'DRAFT' })
    .update({ status: 'IN_PROGRESS' });

  await knex.schema.raw(`
    ALTER TABLE "${dbTables.nftCollections}"
    ADD CONSTRAINT "nft_collections_status_check" 
    CHECK (status in ('IN_PROGRESS', 'DEPLOYED'))
  `);
  await knex.schema.raw(`ALTER TABLE "${dbTables.nftCollections}" ALTER status SET DEFAULT 'IN_PROGRESS'`);
}
