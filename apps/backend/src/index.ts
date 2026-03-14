import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { contentRoutes } from './routes/content'
import { candleRoutes } from './routes/candle'
import { lunarRoutes } from './routes/lunar'
import { paymentsRoutes } from './routes/payments'
import { notificationsRoutes } from './routes/notifications'
import { tierGuard } from './middleware/tierGuard'
import { startLunarCron } from './services/lunarCron'

export const prisma = new PrismaClient()
export const redis = new Redis(process.env.REDIS_URL!)

const app = Fastify({ logger: true })

// Plugins
await app.register(cors, { origin: '*' })
await app.register(jwt, { secret: process.env.JWT_SECRET! })

// Декоратор для проверки JWT (опционально)
app.addHook('onRequest', async (request, reply) => {
  const publicRoutes = ['/v1/auth/telegram', '/v1/payments/stars/webhook', '/v1/payments/stripe/webhook']
  if (publicRoutes.includes(request.url)) return
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 })
  }
})

// Routes
const prefix = '/v1'
await app.register(authRoutes,          { prefix })
await app.register(userRoutes,          { prefix })
await app.register(contentRoutes,       { prefix })
await app.register(candleRoutes,        { prefix })
await app.register(lunarRoutes,         { prefix })
await app.register(paymentsRoutes,      { prefix })
await app.register(notificationsRoutes, { prefix })

// Запуск лунного крона
startLunarCron()

const PORT = Number(process.env.PORT) || 3000
try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`Backend running on :${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
