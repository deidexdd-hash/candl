import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../index'
import type { Tier } from '../middleware/tierGuard'

// Простая защита: секретный заголовок X-Admin-Secret
// Значение берётся из env ADMIN_SECRET
function checkAdmin(request: any, reply: any): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    reply.code(503).send({ error: 'Админ-доступ не настроен', code: 'ADMIN_NOT_CONFIGURED' })
    return false
  }
  if (request.headers['x-admin-secret'] !== secret) {
    reply.code(401).send({ error: 'Неверный секрет', code: 'UNAUTHORIZED' })
    return false
  }
  return true
}

// Генерация кода: 3 группы по 4 символа, например FIRE-MOON-2024
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const group = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${group(4)}-${group(4)}-${group(4)}`
}

const createCodeSchema = z.object({
  tier:      z.enum(['practitioner', 'master']),
  label:     z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(), // ISO дата, опционально
})

export async function adminRoutes(app: FastifyInstance) {

  // ── Создать один код ──────────────────────────────────────────────────────
  app.post('/admin/codes', async (request, reply) => {
    if (!checkAdmin(request, reply)) return

    const { tier, label, expiresAt } = createCodeSchema.parse(request.body)
    const code = generateCode()

    const record = await prisma.accessCode.create({
      data: {
        code,
        tier: tier as Tier,
        label: label ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    })

    return {
      code:      record.code,
      tier:      record.tier,
      label:     record.label,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    }
  })

  // ── Создать несколько кодов одного уровня ─────────────────────────────────
  app.post('/admin/codes/batch', async (request, reply) => {
    if (!checkAdmin(request, reply)) return

    const schema = z.object({
      tier:      z.enum(['practitioner', 'master']),
      count:     z.number().int().min(1).max(50),
      label:     z.string().max(100).optional(),
      expiresAt: z.string().datetime().optional(),
    })

    const { tier, count, label, expiresAt } = schema.parse(request.body)

    const codes = await Promise.all(
      Array.from({ length: count }, async () => {
        let code = generateCode()
        // на случай коллизии — retry
        while (await prisma.accessCode.findUnique({ where: { code } })) {
          code = generateCode()
        }
        return prisma.accessCode.create({
          data: {
            code,
            tier: tier as Tier,
            label: label ?? null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          }
        })
      })
    )

    return { created: codes.length, codes: codes.map((c: any) => ({ code: c.code, tier: c.tier, label: c.label })) }
  })

  // ── Список всех кодов ─────────────────────────────────────────────────────
  app.get('/admin/codes', async (request, reply) => {
    if (!checkAdmin(request, reply)) return

    const query = (request.query as any)
    const filter: any = {}
    if (query.tier)  filter.tier = query.tier
    if (query.used === 'true')  filter.usedAt = { not: null }
    if (query.used === 'false') filter.usedAt = null

    const codes = await prisma.accessCode.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const total   = codes.length
    const used    = codes.filter((c: any) => c.usedAt).length
    const unused  = total - used
    const expired = codes.filter((c: any) => c.expiresAt && c.expiresAt < new Date() && !c.usedAt).length

    return { total, used, unused, expired, codes }
  })

  // ── Удалить / деактивировать код ─────────────────────────────────────────
  app.delete('/admin/codes/:code', async (request, reply) => {
    if (!checkAdmin(request, reply)) return

    const { code } = request.params as { code: string }
    const record = await prisma.accessCode.findUnique({ where: { code } })

    if (!record) return reply.code(404).send({ error: 'Код не найден', code: 'NOT_FOUND' })
    if (record.usedAt) return reply.code(409).send({ error: 'Код уже использован', code: 'ALREADY_USED' })

    await prisma.accessCode.delete({ where: { code } })
    return { ok: true, deleted: code }
  })

  // ── Статистика пользователей по тарифам ───────────────────────────────────
  app.get('/admin/stats', async (request, reply) => {
    if (!checkAdmin(request, reply)) return

    const [total, byTier, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['tier'], _count: { id: true } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { firstName: true, username: true, tier: true, createdAt: true }
      }),
    ])

    return {
      totalUsers: total,
      byTier: Object.fromEntries(byTier.map((b: any) => [b.tier, b._count.id])),
      recentUsers,
    }
  })
}
