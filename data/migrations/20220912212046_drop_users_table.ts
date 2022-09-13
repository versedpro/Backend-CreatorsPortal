import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.table(dbTables.nftCollections)
    .whereRaw('user_id IS NOT NULL')
    .delete();

  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.dropColumn('user_id');
    table.specificType('organization_id', 'uuid').notNullable().alter();
  });

  await knex.schema.dropTableIfExists(dbTables.users);
}


// eslint-disable-next-line no-unused-vars
export async function down(knex: Knex): Promise<void> {
}
