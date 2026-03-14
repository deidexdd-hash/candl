import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../index'
import { getLunarToday } from '../services/lunarService'
import { requireTier } from '../middleware/tierGuard'

export async function lunarRoutes(app: FastifyInstance) {
  // Текущая фаза — бесплатно
  app.get('/lunar/today', async () => getLunarToday())

  // Фазы на месяц — Практик+
  app.get('/lunar/month', {
    preHandler: requireTier('practitioner')
  }, async () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const { getMoonPhase, getMoonPhaseRu } = await import('../services/lunarService')
    const SunCalc = (await import('suncalc')).default

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1)
      const phase = getMoonPhase(date)
      const ill = SunCalc.getMoonIllumination(date)
      return {
        date: date.toISOString().split('T')[0],
        day: i + 1,
        phase,
        phaseRu: getMoonPhaseRu(phase),
        illumination: Math.round(ill.fraction * 100),
      }
    })

    return { year, month: month + 1, days }
  })
}

const notifSchema = z.object({
  enabled:   z.boolean().optional(),
  onNewMoon: z.boolean().optional(),
  onFullMoon:z.boolean().optional(),
  onWaxing:  z.boolean().optional(),
  onWaning:  z.boolean().optional(),
})

export async function notificationsRoutes(app: FastifyInstance) {
  app.get('/notifications/settings', async (request) => {
    const { userId } = request.user as { userId: string }
    const notif = await prisma.lunarNotification.findUnique({ where: { userId } })
    return notif ?? { enabled: false }
  })

  app.patch('/notifications/settings', {
    preHandler: requireTier('practitioner') // уведомления — Практик+
  }, async (request) => {
    const { userId } = request.user as { userId: string }
    const data = notifSchema.parse(request.body)
    const notif = await prisma.lunarNotification.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    })
    return notif
  })
}

// diary stub
export async function diaryRoutes(app: FastifyInstance) {
  const diaryEntrySchema = z.object({
    entryDate:   z.string(),
    intention:   z.string().min(1).max(500),
    candleColor: z.string().optional(),
    oils:        z.string().optional(),
    moonPhase:   z.string().optional(),
    result:      z.string().optional(),
  })

  app.get('/diary', {
    preHandler: requireTier('master')
  }, async (request) => {
    const { userId } = request.user as { userId: string }
    const entries = await prisma.diaryEntry.findMany({
      where: { userId },
      orderBy: { entryDate: 'desc' },
      take: 100,
    })
    return { entries }
  })

  app.post('/diary', {
    preHandler: requireTier('master')
  }, async (request) => {
    const { userId } = request.user as { userId: string }
    const data = diaryEntrySchema.parse(request.body)
    const entry = await prisma.diaryEntry.create({
      data: { userId, ...data, entryDate: new Date(data.entryDate) }
    })
    return entry
  })

  app.patch('/diary/:id', {
    preHandler: requireTier('master')
  }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const data = diaryEntrySchema.partial().parse(request.body)
    const entry = await prisma.diaryEntry.findFirst({ where: { id, userId } })
    if (!entry) return reply.code(404).send({ error: 'Запись не найдена', code: 'NOT_FOUND', statusCode: 404 })
    return prisma.diaryEntry.update({ where: { id }, data: data as any })
  })

  app.delete('/diary/:id', {
    preHandler: requireTier('master')
  }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const entry = await prisma.diaryEntry.findFirst({ where: { id, userId } })
    if (!entry) return reply.code(404).send({ error: 'Запись не найдена', code: 'NOT_FOUND', statusCode: 404 })
    await prisma.diaryEntry.delete({ where: { id } })
    return { ok: true }
  })
}
