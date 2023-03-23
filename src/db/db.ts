import { drizzle } from 'drizzle-orm/d1'

export const initDB = (d1: D1Database) => drizzle(d1)
