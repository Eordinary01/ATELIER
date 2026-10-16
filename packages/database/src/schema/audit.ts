import { pgTable, uuid, varchar, jsonb, timestamp, text, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminUserId: uuid('admin_user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    entityType: varchar('entity_type', { length: 100 }).notNull(), // 'product', 'category', 'order', 'inventory'
    entityId: varchar('entity_id', { length: 255 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
    diffBefore: jsonb('diff_before'),
    diffAfter: jsonb('diff_after'),
    ipAddress: varchar('ip_address', { length: 50 }).notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_logs_entity').on(table.entityType, table.entityId),
    index('idx_audit_logs_admin').on(table.adminUserId, table.createdAt),
  ]
);

export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
