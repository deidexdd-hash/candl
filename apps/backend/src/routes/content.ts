import type { FastifyInstance } from 'fastify'
import { prisma } from '../index'
import { hasAccess } from '../middleware/tierGuard'
import type { Tier } from '@prisma/client'

const chapters = require('../data/chapters.json')
const tables   = require('../data/tables.json')

export async function contentRoutes(app: FastifyInstance) {
  app.get('/content/chapters', async (request) => {
    const { userId } = request.user as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
    const tier = (user?.tier ?? 'free') as Tier

    return {
      chapters: chapters.map((ch: any) => ({
        id:        ch.id,
        title:     ch.title,
        part:      ch.part,
        tier:      ch.tier,
        available: hasAccess(tier, ch.tier as Tier),
        preview:   ch.preview,
      }))
    }
  })

  app.get('/content/chapters/:id', async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    const chapter = chapters.find((c: any) => String(c.id) === id)
    if (!chapter) return reply.code(404).send({ error: 'Глава не найдена', code: 'NOT_FOUND', statusCode: 404 })

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
    const tier = (user?.tier ?? 'free') as Tier

    if (!hasAccess(tier, chapter.tier as Tier)) {
      return reply.code(403).send({
        error: `Требуется тариф: ${chapter.tier}`,
        code: 'TIER_REQUIRED',
        requiredTier: chapter.tier,
        statusCode: 403,
      })
    }

    return { chapter }
  })

  app.get('/content/tables', async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
    if (!hasAccess((user?.tier ?? 'free') as Tier, 'master')) {
      return reply.code(403).send({ error: 'Требуется Мастер', code: 'TIER_REQUIRED', requiredTier: 'master', statusCode: 403 })
    }
    return tables
  })
}
