"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessCodeRoutes = accessCodeRoutes;
const zod_1 = require("zod");
const index_1 = require("../index");
const activateSchema = zod_1.z.object({
    code: zod_1.z.string().min(1).max(20).transform(s => s.trim().toUpperCase()),
});
async function accessCodeRoutes(app) {
    // ── Активировать код доступа ──────────────────────────────────────────────
    app.post('/access/activate', async (request, reply) => {
        const { userId } = request.user;
        let code;
        try {
            const parsed = activateSchema.parse(request.body);
            code = parsed.code;
        }
        catch {
            return reply.code(400).send({ error: 'Неверный формат кода', code: 'INVALID_CODE' });
        }
        const record = await index_1.prisma.accessCode.findUnique({ where: { code } });
        // Код не существует
        if (!record) {
            return reply.code(404).send({ error: 'Код не найден', code: 'CODE_NOT_FOUND' });
        }
        // Код уже использован
        if (record.usedAt) {
            return reply.code(409).send({ error: 'Код уже использован', code: 'CODE_ALREADY_USED' });
        }
        // Код истёк
        if (record.expiresAt && record.expiresAt < new Date()) {
            return reply.code(410).send({ error: 'Срок действия кода истёк', code: 'CODE_EXPIRED' });
        }
        const user = await index_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return reply.code(404).send({ error: 'Пользователь не найден', code: 'NOT_FOUND' });
        // Проверяем не «понижает» ли код текущий тариф
        const TIER_ORDER = { free: 0, practitioner: 1, master: 2, annual: 3 };
        const currentLevel = TIER_ORDER[user.tier] ?? 0;
        const newLevel = TIER_ORDER[record.tier] ?? 0;
        if (newLevel <= currentLevel) {
            return reply.code(409).send({
                error: `У вас уже есть тариф ${user.tier} — он выше или равен этому коду`,
                code: 'TIER_NOT_UPGRADED',
                currentTier: user.tier,
            });
        }
        // Применяем в транзакции
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1); // даём доступ на 1 год
        await index_1.prisma.$transaction([
            // Отмечаем код как использованный
            index_1.prisma.accessCode.update({
                where: { code },
                data: { usedAt: new Date(), usedBy: userId }
            }),
            // Обновляем тариф пользователя
            index_1.prisma.user.update({
                where: { id: userId },
                data: { tier: record.tier }
            }),
            // Создаём запись подписки
            index_1.prisma.subscription.create({
                data: {
                    userId,
                    tier: record.tier,
                    status: 'active',
                    provider: 'telegram_stars', // используем как placeholder — добавить 'access_code' при миграции
                    externalId: `code:${code}`,
                    expiresAt,
                }
            })
        ]);
        return {
            ok: true,
            tier: record.tier,
            message: record.tier === 'master'
                ? '✨ Открыт полный доступ Мастер — все главы и практики доступны'
                : '🔥 Открыт доступ Практик — масла, камни, лунная магия и ритуалы',
        };
    });
    // ── Проверить код без активации (чтобы показать что даёт) ────────────────
    app.get('/access/check/:code', async (request, reply) => {
        const { code } = request.params;
        const normalized = code.trim().toUpperCase();
        const record = await index_1.prisma.accessCode.findUnique({ where: { code: normalized } });
        if (!record)
            return reply.code(404).send({ error: 'Код не найден', code: 'CODE_NOT_FOUND' });
        return {
            valid: !record.usedAt && (!record.expiresAt || record.expiresAt > new Date()),
            tier: record.tier,
            used: !!record.usedAt,
            expired: record.expiresAt ? record.expiresAt < new Date() : false,
            expiresAt: record.expiresAt,
        };
    });
}
