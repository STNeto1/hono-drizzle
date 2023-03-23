import { Jwt } from 'hono/utils/jwt'
import { JWT_SECRET } from '..'

export type Payload = { userId: number }

export const createToken = async (payload: Payload) => {
  return Jwt.sign(payload, JWT_SECRET)
}

export const decodeToken = async (token: string) => {
  return Jwt.decode(token)
}
