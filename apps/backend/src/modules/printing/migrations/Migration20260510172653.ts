import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260510172653 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_print_file" ("id" text not null, "product_id" text not null, "file_url" text not null, "filename" text not null, "file_format" text not null, "file_size_bytes" integer not null, "volume_cm3" integer null, "default_material" text null, "default_color" text null, "default_infill_percent" integer null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_print_file_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_print_file_deleted_at" ON "product_print_file" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_print_file" cascade;`);
  }

}
