import type { FastifyRequest, FastifyReply } from 'fastify'
import { Tier } from '@prisma/client'
import { prisma } from '../index'

const TIER_ORDER: Record<Tier, number> = {
  free: 0,
  practitioner: 1,
  master: 2,
  annual: 3,
}

// Хук — прикрепляется к конкретным роутам
export function requireTier(minTier: Tier) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
    if (!user) return reply.code(401).send({ error: 'User not found', code: 'UNAUTHORIZED', statusCode: 401 })

    if (TIER_ORDER[user.tier] < TIER_ORDER[minTier]) {
      return reply.code(403).send({
        error: `Требуется тариф ${minTier}`,
        code: 'TIER_REQUIRED',
        requiredTier: minTier,
        statusCode: 403,
      })
    }
  }
}

// Хелпер для проверки в сервисах
export function hasAccess(userTier: Tier, minTier: Tier): boolean {
  return TIER_ORDER[userTier] >= TIER_ORDER[minTier]
}
