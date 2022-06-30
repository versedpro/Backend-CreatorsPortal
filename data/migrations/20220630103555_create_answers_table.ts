import { Knex } from 'knex';
import { dbTables } from '../constants';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.firstPartyQuestionAnswers, table => {
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();

    table.specificType('collection_id', 'uuid')
      .notNullable().index()
      .references('id').inTable(dbTables.nftCollections)
      .onDelete('SET NULL');

    table.string('wallet_address').notNullable();
    table.string('question_type').notNullable();
    table.string('question').nullable();
    table.string('answer').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.firstPartyQuestionAnswers);
}
