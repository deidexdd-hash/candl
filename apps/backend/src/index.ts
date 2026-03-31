import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

import { authRoutes }       from './routes/auth'
import { userRoutes }       from './routes/users'
import { contentRoutes }    from './routes/content'
import { candleRoutes }     from './routes/candle'
import { lunarRoutes, notificationsRoutes, diaryRoutes } from './routes/lunar'
import { paymentsRoutes }   from './routes/payments'
import { adminRoutes }      from './routes/admin'
import { accessCodeRoutes } from './routes/accessCode'
import { panelRoutes }      from './routes/panel'
import { startLunarCron }   from './services/lunarService'
import { assistantRoutes }  from './routes/assistant'
import { setupBot }         from './services/botSetup'

export const prisma = new PrismaClient()

async function main() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: '*' })
  await app.register(jwt, { secret: process.env.JWT_SECRET! })

  app.addHook('onRequest', async (request, reply) => {
    const publicRoutes = [
      '/v1/auth/telegram',
      '/v1/payments/stars/webhook',
      '/v1/payments/stripe/webhook',
    ]
    // Публичные роуты — без JWT
    if (publicRoutes.includes(request.url)) return
    // Админ-роуты защищены своим заголовком, не JWT
    if (request.url.startsWith('/v1/admin')) return

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
  await app.register(diaryRoutes,         { prefix })
  await app.register(paymentsRoutes,      { prefix })
  await app.register(adminRoutes,         { prefix })
  await app.register(accessCodeRoutes,    { prefix })
  await app.register(panelRoutes,         { prefix })

  startLunarCron()

  const PORT = Number(process.env.PORT) || 3000
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log('Backend running on :' + PORT)

  await setupBot()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
