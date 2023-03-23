import { integer, text } from 'drizzle-orm/sqlite-core/columns'
import { sqliteTable } from 'drizzle-orm/sqlite-core/table'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  email: text('email').notNull(),
  password: text('password').notNull()
})
