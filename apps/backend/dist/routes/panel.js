"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.panelRoutes = panelRoutes;
const zod_1 = require("zod");
const index_1 = require("../index");
// Проверяем что telegramId из JWT совпадает с TEST_USER_IDS
function isAdmin(telegramId) {
    const raw = process.env.TEST_USER_IDS ?? '';
    const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
    return ids.includes(telegramId);
}
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg()}-${seg()}-${seg()}`;
}
const createSchema = zod_1.z.object({
    tier: zod_1.z.enum(['practitioner', 'master']),
    label: zod_1.z.string().max(100).optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
});
const batchSchema = zod_1.z.object({
    tier: zod_1.z.enum(['practitioner', 'master']),
    count: zod_1.z.number().int().min(1).max(50),
    label: zod_1.z.string().max(100).optional(),
});
async function panelRoutes(app) {
    // ── Шаг 1: верифицируем JWT для ВСЕХ panel-маршрутов ─────────────────────
    app.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify();
        }
        catch {
            return reply.code(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 });
        }
    });
    // ── Шаг 2: проверяем права администратора ────────────────────────────────
    app.addHook('preHandler', async (request, reply) => {
        const user = request.user;
        if (!user?.telegramId || !isAdmin(user.telegramId)) {
            return reply.code(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
        }
    });
    // ── Ping: проверка доступа (используется фронтендом для верификации) ─────
    app.get('/panel/ping', async () => ({ ok: true }));
    // ── Создать один код ──────────────────────────────────────────────────────
    app.post('/panel/codes', async (request, reply) => {
        const body = createSchema.parse(request.body);
        const code = generateCode();
        const record = await index_1.prisma.accessCode.create({
            data: {
                code,
                tier: body.tier,
                label: body.label ?? null,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
            },
        });
        return record;
    });
    // ── Создать N кодов сразу ─────────────────────────────────────────────────
    app.post('/panel/codes/batch', async (request) => {
        const body = batchSchema.parse(request.body);
        const codes = [];
        for (let i = 0; i < body.count; i++) {
            const code = generateCode();
            codes.push({
                code,
                tier: body.tier,
                label: body.label ?? null,
            });
        }
        await index_1.prisma.accessCode.createMany({ data: codes });
        return { created: codes.length, codes: codes.map(c => c.code) };
    });
    // ── Список кодов ──────────────────────────────────────────────────────────
    app.get('/panel/codes', async (request) => {
        const { tier, used } = request.query;
        const where = {};
        if (tier)
            where.tier = tier;
        if (used === 'true')
            where.usedAt = { not: null };
        if (used === 'false')
            where.usedAt = null;
        const codes = await index_1.prisma.accessCode.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return codes;
    });
    // ── Удалить код ───────────────────────────────────────────────────────────
    app.delete('/panel/codes/:code', async (request, reply) => {
        const { code } = request.params;
        const record = await index_1.prisma.accessCode.findUnique({ where: { code } });
        if (!record)
            return reply.code(404).send({ error: 'Код не найден' });
        if (record.usedAt)
            return reply.code(409).send({ error: 'Нельзя удалить использованный код' });
        await index_1.prisma.accessCode.delete({ where: { code } });
        return { ok: true };
    });
    // ── Статистика ────────────────────────────────────────────────────────────
    app.get('/panel/stats', async () => {
        const [byTier, totalCodes, usedCodes] = await Promise.all([
            index_1.prisma.user.groupBy({ by: ['tier'], _count: { id: true } }),
            index_1.prisma.accessCode.count(),
            index_1.prisma.accessCode.count({ where: { usedAt: { not: null } } }),
        ]);
        return {
            users: byTier.map((r) => ({ tier: r.tier, count: r._count.id })),
            codes: { total: totalCodes, used: usedCodes, available: totalCodes - usedCodes },
        };
    });
}
