import { dbTables } from '../constants';
import { Knex } from 'knex';

/**
 * @param { Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex: Knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  await knex.schema.createTable(dbTables.admins, table => {
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();
    table.string('username').nullable();
    table.string('public_address').notNullable().unique();
    table.integer('nonce').unsigned().defaultTo(Math.floor(Math.random() * 1000000));

    table.timestamps(true, true);
  });
};

/**
 * @param { Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex: Knex) {
  await knex.schema.dropTableIfExists(dbTables.admins);
};
