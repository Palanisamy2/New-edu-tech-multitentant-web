import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Ensure we are in public schema
  await knex.raw('SET search_path TO public');

  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("email").unique().notNullable();
    table.string("password_hash").notNullable();
    table.string("name").notNullable();
    table.string("role").defaultTo("super-admin");
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('SET search_path TO public');
  await knex.schema.dropTableIfExists("users");
}
