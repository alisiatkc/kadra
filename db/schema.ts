import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const staffMaps = sqliteTable('staff_maps', {
 id: text('id').primaryKey(),
 document: text('document').notNull(),
 version: integer('version').notNull(),
 updatedAt: text('updated_at').notNull(),
});
