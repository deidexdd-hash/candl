import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { Redis } from '@upstash/redis'

import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { contentRoutes } from './routes/content'
import { candleRoutes } from './routes/candle'
import { lunarRoutes, notificationsRoutes } from './routes/lunar'
import { paymentsRoutes } from './routes/payments'
import { startLunarCron } from './services/lunarService'

export const prisma = new PrismaClient()

export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const app = Fastify({ logger: true })

await app.register(cors, { origin: '*' })
await app.register(jwt, { secret: process.env.JWT_SECRET! })

app.addHook('onRequest', async (request, reply) => {
  const publicRoutes = [
    '/v1/auth/telegram',
    '/v1/payments/stars/webhook',
    '/v1/payments/stripe/webhook',
  ]
  if (publicRoutes.includes(request.url)) return
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 })
  }
})

const prefix = '/v1'
await app.register(authRoutes,          { prefix })
await app.register(userRoutes,          { prefix })
await app.register(contentRoutes,       { prefix })
await app.register(candleRoutes,        { prefix })
await app.register(lunarRoutes,         { prefix })
await app.register(notificationsRoutes, { prefix })
await app.register(paymentsRoutes,      { prefix })

startLunarCron()

const PORT = Number(process.env.PORT) || 3000
try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log('Backend running on :' + PORT)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
