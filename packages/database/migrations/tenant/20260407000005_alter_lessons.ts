import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("lessons", (table) => {
    table.uuid("batch_id").references("id").inTable("batches").onDelete("CASCADE");
    table.string("status").defaultTo("scheduled"); // scheduled, live, completed
    table.timestamp("started_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("lessons", (table) => {
    table.dropColumn("started_at");
    table.dropColumn("status");
    table.dropForeign(["batch_id"]);
    table.dropColumn("batch_id");
  });
}
