import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("gateway_settings", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("gateway_name").notNullable(); // razorpay, stripe
    table.string("api_key").notNullable();
    table.string("api_secret").notNullable(); // Should be encrypted at application level
    table.boolean("is_active").defaultTo(true);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("gateway_settings");
}
