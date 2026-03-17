import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../index'
import { requireTier } from '../middleware/tierGuard'
import { getMoonPhase, getMoonPhaseRu } from '../services/lunarService'

const CANDLE_MAP: Record<string, { color: string; oil: string; stone: string }> = {
  'любовь':                 { color: 'Розовая',    oil: 'Жасмин',       stone: 'Сердолик' },
  'деньги':                 { color: 'Зелёная',    oil: 'Апельсин',     stone: 'Малахит' },
  'защита':                 { color: 'Белая',      oil: 'Ладан',        stone: 'Яшма' },
  'здоровье':               { color: 'Синяя',      oil: 'Ель',          stone: 'Кварц' },
  'духовность':             { color: 'Фиолетовая', oil: 'Ладан',        stone: 'Аметист' },
  'удача':                  { color: 'Оранжевая',  oil: 'Апельсин',     stone: 'Агат' },
  'карьера':                { color: 'Оранжевая',  oil: 'Гвоздика',     stone: 'Тигровый глаз' },
  'очищение':               { color: 'Белая',      oil: 'Полынь',       stone: 'Яшма' },
  'медитация':              { color: 'Фиолетовая', oil: 'Ладан',        stone: 'Аметист' },
  'творчество':             { color: 'Оранжевая',  oil: 'Пачули',       stone: 'Сердолик' },
  'мир в доме':             { color: 'Голубая',    oil: 'Лаванда',      stone: 'Аквамарин' },
  'финансовое благополучие':{ color: 'Зелёная',    oil: 'Корица',       stone: 'Цитрин' },
  'привлечение любви':      { color: 'Розовая',    oil: 'Жасмин',       stone: 'Розовый кварц' },
  'исцеление':              { color: 'Синяя',      oil: 'Лаванда',      stone: 'Кварц' },
  'победа':                 { color: 'Золотая',    oil: 'Мирт',         stone: 'Цитрин' },
  'заземление':             { color: 'Коричневая', oil: 'Герань',       stone: 'Яшма' },
  'интуиция':               { color: 'Синяя',      oil: 'Можжевельник', stone: 'Лазурит' },
  'сны':                    { color: 'Синяя',      oil: 'Лаванда',      stone: 'Лунный камень' },
  'предки':                 { color: 'Белая',      oil: 'Мирра',        stone: 'Обсидиан' },
  'успех':                  { color: 'Золотая',    oil: 'Апельсин',     stone: 'Тигровый глаз' },
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

    if (user.tier === 'free') {
      const today = new Date(); today.setHours(0, 0, 0, 0)
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

    const intentionLower = intention.toLowerCase()
    const match = Object.entries(CANDLE_MAP).find(([key]) => intentionLower.includes(key))
    const result = match ? match[1] : { color: 'Белая', oil: 'Лаванда', stone: 'Кварц' }

    const currentPhase = moonPhase ?? getMoonPhase(new Date())
    const currentPhaseRu = getMoonPhaseRu(currentPhase as any)

    await prisma.candlePick.create({
      data: { userId, intention, ...result, moonPhase: currentPhase }
    })

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const usedToday = await prisma.candlePick.count({ where: { userId, createdAt: { gte: today } } })

    return {
      color: result.color,
      oil: result.oil,
      stone: result.stone,
      moonPhase: currentPhase,
      moonPhaseRu: currentPhaseRu,
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
