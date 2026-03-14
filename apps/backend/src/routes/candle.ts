import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../index'
import { requireTier } from '../middleware/tierGuard'
import { getMoonPhase } from '../services/lunarService'

// Данные из книги
const CANDLE_MAP: Record<string, { color: string; oil: string; stone: string }> = {
  'любовь':                { color: 'Розовая',     oil: 'Жасмин',    stone: 'Сердолик' },
  'деньги':                { color: 'Зелёная',     oil: 'Апельсин',  stone: 'Гранит' },
  'защита':                { color: 'Белая',       oil: 'Ладан',     stone: 'Яшма' },
  'здоровье':              { color: 'Синяя',       oil: 'Ель',       stone: 'Кварц' },
  'духовность':            { color: 'Фиолетовая',  oil: 'Ладан',     stone: 'Кварц' },
  'удача':                 { color: 'Оранжевая',   oil: 'Апельсин',  stone: 'Агат' },
  'карьера':               { color: 'Оранжевая',   oil: 'Гвоздика',  stone: 'Агат' },
  'очищение':              { color: 'Белая',       oil: 'Полынь',    stone: 'Яшма' },
  'медитация':             { color: 'Фиолетовая',  oil: 'Ладан',     stone: 'Кварц' },
  'творчество':            { color: 'Оранжевая',   oil: 'Пачули',    stone: 'Сердолик' },
  'мир в доме':            { color: 'Голубая',     oil: 'Лаванда',   stone: 'Мрамор' },
  'финансовое благополучие':{ color: 'Зелёная',    oil: 'Корица',    stone: 'Гранит' },
  'привлечение любви':     { color: 'Розовая',     oil: 'Жасмин',    stone: 'Сердолик' },
  'исцеление':             { color: 'Синяя',       oil: 'Лаванда',   stone: 'Кварц' },
  'победа':                { color: 'Золотая',     oil: 'Мирт',      stone: 'Оникс' },
  'заземление':            { color: 'Коричневая',  oil: 'Герань',    stone: 'Мрамор' },
  'интуиция':              { color: 'Серая',       oil: 'Можжевельник', stone: 'Кварц' },
}

const FREE_DAILY_LIMIT = 3

const pickSchema = z.object({
  intention: z.string().min(1).max(200),
  moonPhase: z.string().optional(),
})

export async function candleRoutes(app: FastifyInstance) {
  app.post('/candle/pick', async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { intention, moonPhase } = pickSchema.parse(request.body)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 })

    // Проверка дневного лимита для free
    if (user.tier === 'free') {
      const today = new Date(); today.setHours(0,0,0,0)
      const todayPicks = await prisma.candlePick.count({
        where: { userId, createdAt: { gte: today } }
      })
      if (todayPicks >= FREE_DAILY_LIMIT) {
        return reply.code(402).send({
          error: 'Дневной лимит подбора исчерпан',
          code: 'PAYMENT_REQUIRED',
          usedToday: todayPicks,
          dailyLimit: FREE_DAILY_LIMIT,
          statusCode: 402,
        })
      }
    }

    // Подбор по ключевым словам из намерения
    const intentionLower = intention.toLowerCase()
    let match = Object.entries(CANDLE_MAP).find(([key]) => intentionLower.includes(key))
    const result = match ? match[1] : { color: 'Белая', oil: 'Лаванда', stone: 'Кварц' }
    const currentPhase = moonPhase ?? getMoonPhase(new Date())

    // Сохраняем в историю
    const pick = await prisma.candlePick.create({
      data: { userId, intention, ...result, moonPhase: currentPhase }
    })

    // Считаем использование
    const today = new Date(); today.setHours(0,0,0,0)
    const usedToday = await prisma.candlePick.count({ where: { userId, createdAt: { gte: today } } })

    return {
      id: pick.id,
      color: result.color,
      oil: result.oil,
      stone: result.stone,
      moonPhase: currentPhase,
      usedToday,
      dailyLimit: user.tier === 'free' ? FREE_DAILY_LIMIT : null,
    }
  })

  app.get('/candle/picks', async (request) => {
    const { userId } = request.user as { userId: string }
    const picks = await prisma.candlePick.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { picks }
  })
}
