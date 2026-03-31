import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../index'

// Проверяем что telegramId из JWT совпадает с TEST_USER_IDS
function isAdmin(telegramId: string): boolean {
  const raw = process.env.TEST_USER_IDS ?? ''
  const ids = raw.split(',').map(s => s.trim()).filter(Boolean)
  return ids.includes(telegramId)
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${seg()}-${seg()}-${seg()}`
}

const createSchema = z.object({
  tier:      z.enum(['practitioner', 'master']),
  label:     z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(),
})

const batchSchema = z.object({
  tier:  z.enum(['practitioner', 'master']),
  count: z.number().int().min(1).max(50),
  label: z.string().max(100).optional(),
})

export async function panelRoutes(app: FastifyInstance) {

  // Middleware — проверяем isAdmin на все /panel/* роуты
  app.addHook('onRequest', async (request, reply) => {
    const { telegramId } = request.user as { telegramId?: string }
    if (!telegramId || !isAdmin(telegramId)) {
      return reply.code(403).send({ error: 'Forbidden', code: 'FORBIDDEN' })
    }
  })

  // ── Ping: проверка доступа (используется фронтендом для верификации) ─────
  app.get('/panel/ping', async () => ({ ok: true }))

  // ── Создать один код ──────────────────────────────────────────────────────
  app.post('/panel/codes', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const code = generateCode()

    const record = await prisma.accessCode.create({
      data: {
        code,
        tier:      body.tier,
        label:     body.label ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })

    return record
  })

  // ── Создать N кодов сразу ─────────────────────────────────────────────────
  app.post('/panel/codes/batch', async (request) => {
    const body = batchSchema.parse(request.body)
    const codes = []

    for (let i = 0; i < body.count; i++) {
      const code = generateCode()
      codes.push({
        code,
        tier:  body.tier,
        label: body.label ?? null,
      })
    }

    await prisma.accessCode.createMany({ data: codes })
    return { created: codes.length, codes: codes.map(c => c.code) }
  })

  // ── Список кодов ──────────────────────────────────────────────────────────
  app.get('/panel/codes', async (request) => {
    const { tier, used } = request.query as { tier?: string; used?: string }

    const where: Record<string, unknown> = {}
    if (tier) where.tier = tier
    if (used === 'true')  where.usedAt = { not: null }
    if (used === 'false') where.usedAt = null

    const codes = await prisma.accessCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return codes
  })

  // ── Удалить код ───────────────────────────────────────────────────────────
  app.delete('/panel/codes/:code', async (request, reply) => {
    const { code } = request.params as { code: string }

    const record = await prisma.accessCode.findUnique({ where: { code } })
    if (!record) return reply.code(404).send({ error: 'Код не найден' })
    if (record.usedAt) return reply.code(409).send({ error: 'Нельзя удалить использованный код' })

    await prisma.accessCode.delete({ where: { code } })
    return { ok: true }
  })

  // ── Статистика ────────────────────────────────────────────────────────────
  app.get('/panel/stats', async () => {
    const [byTier, totalCodes, usedCodes] = await Promise.all([
      prisma.user.groupBy({ by: ['tier'], _count: { id: true } }),
      prisma.accessCode.count(),
      prisma.accessCode.count({ where: { usedAt: { not: null } } }),
    ])

    return {
      users: byTier.map((r: any) => ({ tier: r.tier, count: r._count.id })),
      codes: { total: totalCodes, used: usedCodes, available: totalCodes - usedCodes },
    }
  })
}
