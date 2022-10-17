import { Knex } from 'knex';
import { dbTables } from '../constants';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.lastFetchedBlocks, table => {
    table.string('network').notNullable().primary();
    table.string('block_number').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.lastFetchedBlocks);
}

