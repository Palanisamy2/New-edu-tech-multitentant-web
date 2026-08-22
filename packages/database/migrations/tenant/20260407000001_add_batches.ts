import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("batches", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("course_id").references("id").inTable("courses").onDelete("CASCADE");
    table.uuid("trainer_id").references("id").inTable("users");
    table.string("title").notNullable();
    table.date("start_date").notNullable();
    table.jsonb("schedule").defaultTo("[]"); // ["Monday", "Wednesday"]
    table.string("status").defaultTo("upcoming"); // upcoming, active, completed
    table.timestamps(true, true);
  });

  await knex.schema.createTable("batch_students", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("batch_id").references("id").inTable("batches").onDelete("CASCADE");
    table.uuid("student_id").references("id").inTable("users").onDelete("CASCADE");
    table.unique(["batch_id", "student_id"]);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("batch_students");
  await knex.schema.dropTableIfExists("batches");
}
