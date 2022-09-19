import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    ALTER TABLE "${dbTables.nftCollections}"
    DROP CONSTRAINT "nft_collections_status_check"
  `);

  await knex.schema.raw(`
    ALTER TABLE "${dbTables.nftCollections}"
    ADD CONSTRAINT "nft_collections_status_check" 
    CHECK (status in ('DRAFT', 'DEPLOYMENT_IN_PROGRESS', 'DEPLOYMENT_FAILED', 'DEPLOYED', 'PAYMENT_PENDING', 'PAYMENT_FAILED'))
  `);
}

export async function down(knex: Knex): Promise<void> {

}
