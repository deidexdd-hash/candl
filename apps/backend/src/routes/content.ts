import type { FastifyInstance } from 'fastify'
import path from 'path'
import { prisma } from '../index'
import { hasAccess, type Tier } from '../middleware/tierGuard'

const chapters = require(path.join(__dirname, '../data/chapters.json'))
const tables   = require(path.join(__dirname, '../data/tables.json'))

export async function contentRoutes(app: FastifyInstance) {

  // ── GET /content/chapters — список всех глав ──────────────────────────────
  app.get('/content/chapters', async (request) => {
    const { userId } = request.user as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
    const tier = (user?.tier ?? 'free') as Tier

    return {
      chapters: chapters.map((ch: any) => ({
        id:            ch.id,
        title:         ch.title,
        part:          ch.part,
        tier:          ch.tier,
        available:     hasAccess(tier, ch.tier as Tier),
        preview:       ch.preview,
        // Поля для UI — передаём если есть в JSON
        emoji:         ch.emoji        ?? null,
        read_time_min: ch.read_time_min ?? null,
        // related нужен для связанных глав в ChapterView
        related:       ch.related      ?? [],
      }))
    }
  })

  // ── GET /content/chapters/:id — полный текст главы ────────────────────────
  app.get('/content/chapters/:id', async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    const chapter = chapters.find((c: any) => String(c.id) === id)
    if (!chapter) {
      return reply.code(404).send({ error: 'Глава не найдена', code: 'NOT_FOUND', statusCode: 404 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
    const tier = (user?.tier ?? 'free') as Tier

    if (!hasAccess(tier, chapter.tier as Tier)) {
      return reply.code(403).send({
        error:        `Требуется тариф: ${chapter.tier}`,
        code:         'TIER_REQUIRED',
        requiredTier: chapter.tier,
        statusCode:   403,
      })
    }

    // Возвращаем всю главу целиком — фронтенд сам выбирает что показать
    return { chapter }
  })

  // ── GET /content/tables — таблицы быстрого доступа (Мастер+) ─────────────
  app.get('/content/tables', async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
    if (!hasAccess((user?.tier ?? 'free') as Tier, 'master')) {
      return reply.code(403).send({
        error:        'Требуется Мастер',
        code:         'TIER_REQUIRED',
        requiredTier: 'master',
        statusCode:   403,
      })
    }
    return tables
  })
}
