"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const index_1 = require("../index");
async function userRoutes(app) {
    app.get('/users/me', async (request) => {
        const { userId } = request.user;
        const user = await index_1.prisma.user.findUnique({
            where: { id: userId },
            include: { subscriptions: { where: { status: 'active' }, take: 1 } }
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const aiUsage = await index_1.prisma.aiUsage.findUnique({ where: { userId_usageDate: { userId: userId, usageDate: today } } });
        return {
            id: user.id,
            telegramId: user.telegramId.toString(),
            firstName: user.firstName,
            tier: user.tier,
            subscription: user.subscriptions[0] ?? null,
            aiUsageToday: aiUsage?.count ?? 0,
            aiLimitToday: aiUsage?.dailyLimit ?? (user.tier === 'master' ? 5 : user.tier === 'annual' ? 10 : 0),
        };
    });
}
