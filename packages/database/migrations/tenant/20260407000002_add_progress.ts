import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("student_progress", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("student_id").references("id").inTable("users").onDelete("CASCADE");
    table.uuid("lesson_id").references("id").inTable("lessons").onDelete("CASCADE");
    table.boolean("attended").defaultTo(false);
    table.timestamp("attended_at");
    table.string("status").defaultTo("started"); // started, completed
    table.jsonb("metadata").defaultTo("{}");
    table.unique(["student_id", "lesson_id"]);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("student_progress");
}
