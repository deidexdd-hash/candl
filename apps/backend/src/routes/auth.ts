import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto from 'node:crypto'
import { prisma } from '../index'

const initDataSchema = z.object({
  initData: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/telegram', async (request, reply) => {
    const { initData } = initDataSchema.parse(request.body)

    // Верификация Telegram Init Data
    const user = verifyAndParseTelegramInitData(initData, process.env.BOT_TOKEN!)
    if (!user) return reply.code(401).send({ error: 'Invalid init data', code: 'UNAUTHORIZED', statusCode: 401 })

    // Создаём или находим пользователя
    const isNew = !(await prisma.user.findUnique({ where: { telegramId: BigInt(user.id) } }))

    const dbUser = await prisma.user.upsert({
      where: { telegramId: BigInt(user.id) },
      create: {
        telegramId: BigInt(user.id),
        username: user.username ?? null,
        firstName: user.first_name ?? null,
        lunarNotification: { create: {} }, // создаём настройки по умолчанию
      },
      update: {
        username: user.username ?? null,
        firstName: user.first_name ?? null,
      },
    })

    const token = app.jwt.sign(
      { userId: dbUser.id, telegramId: dbUser.telegramId.toString() },
      { expiresIn: '30d' }
    )

    return { token, user: { id: dbUser.id, telegramId: dbUser.telegramId.toString(), firstName: dbUser.firstName, tier: dbUser.tier, isNew } }
  })
}

function verifyAndParseTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (computedHash !== hash) return null

  const userStr = params.get('user')
  return userStr ? JSON.parse(userStr) : null
}
