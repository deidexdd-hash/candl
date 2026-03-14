// users.ts
import type { FastifyInstance } from 'fastify'
import { prisma } from '../index'

export async function userRoutes(app: FastifyInstance) {
  app.get('/users/me', async (request) => {
    const { userId } = request.user as { userId: string }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: { where: { status: 'active' }, take: 1 } }
    })
    const today = new Date(); today.setHours(0,0,0,0)
    const aiUsage = await prisma.aiUsage.findUnique({ where: { userId_usageDate: { userId: userId, usageDate: today } } })
    return {
      id: user!.id,
      telegramId: user!.telegramId.toString(),
      firstName: user!.firstName,
      tier: user!.tier,
      subscription: user!.subscriptions[0] ?? null,
      aiUsageToday: aiUsage?.count ?? 0,
      aiLimitToday: aiUsage?.dailyLimit ?? (user!.tier === 'master' ? 5 : user!.tier === 'annual' ? 10 : 0),
    }
  })
}
