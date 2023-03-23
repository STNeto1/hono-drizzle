import { zValidator } from '@hono/zod-validator'
import { DrizzleD1Database } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm/expressions'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { jwt } from 'hono/jwt'
import { logger } from 'hono/logger'
import { poweredBy } from 'hono/powered-by'
import { z } from 'zod'

import { initDB } from './db/db'
import { users } from './db/schema'
import { createToken, decodeToken, Payload } from './utils/jwt'

export type Bindings = {
  DB: D1Database
  drizzle: DrizzleD1Database
}

export const JWT_SECRET =
  'SyqlnpcXtTxRGbpsIddZCd5waFkwDCoIKR1Qsm+kpF0=' as const

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', poweredBy())
app.use('*', logger())
app.use('*', async (c, next) => {
  c.env.drizzle = initDB(c.env.DB)

  await next()
})
app.use('/auth/profile', async (c, next) => {
  const _jwt = jwt({
    secret: JWT_SECRET,
    cookie: 'hono-session'
  })

  return _jwt(c, next)
})

app.post(
  '/auth/login',
  zValidator('json', z.object({ email: z.string(), password: z.string() })),
  async (c) => {
    const { email, password } = c.req.valid('json')

    const exception = new HTTPException(400, {
      message: JSON.stringify({ message: 'Invalid credentials' })
    })

    const [user] = await c.env.drizzle
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .all()

    if (!user) {
      throw exception
    }

    // TODO: hash password
    if (user.password !== password) {
      throw exception
    }

    const token = await createToken({ userId: user.id })

    return new Response(null, {
      headers: {
        'Set-Cookie': `hono-session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400;`
      },
      status: 201
    })
  }
)

app.post(
  '/auth/register',
  zValidator('json', z.object({ email: z.string(), password: z.string() })),
  async (c) => {
    const { email, password } = c.req.valid('json')

    const [user] = await c.env.drizzle
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .all()

    if (user) {
      throw new HTTPException(400, {
        message: JSON.stringify({ message: 'User already exists' })
      })
    }

    // TODO hash password
    const [result] = await c.env.drizzle
      .insert(users)
      .values({
        email,
        password
      })
      .returning({
        id: users.id
      })
      .all()

    if (!result) {
      throw new HTTPException(500, {
        message: JSON.stringify({ message: 'Something went wrong' })
      })
    }

    const token = await createToken({ userId: result.id })

    return new Response(null, {
      headers: {
        'Set-Cookie': `hono-session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400;`
      },
      status: 201
    })
  }
)

app.get('/auth/profile', async (c) => {
  const cookies = c.req.cookie()
  const session = cookies['hono-session']

  const exception = new HTTPException(401, {
    message: JSON.stringify({ message: 'Unauthorized' })
  })

  if (!session) {
    throw exception
  }

  const { payload } = await decodeToken(session)
  const { userId } = payload as Payload

  const [user] = await c.env.drizzle
    .select({
      id: users.id,
      email: users.email
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .all()
  if (!user) {
    throw exception
  }

  return c.json(user)
})

app.get('/', async (c) => {
  return c.json({
    message: 'Hono + Drizzle + CF Workers',
    timestamp: new Date()
  })
})

// console.log(app.showRoutes())

export default app
