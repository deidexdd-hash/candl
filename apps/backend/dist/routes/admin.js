"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = adminRoutes;
const zod_1 = require("zod");
const index_1 = require("../index");
// Простая защита: секретный заголовок X-Admin-Secret
// Значение берётся из env ADMIN_SECRET
function checkAdmin(request, reply) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
        reply.code(503).send({ error: 'Админ-доступ не настроен', code: 'ADMIN_NOT_CONFIGURED' });
        return false;
    }
    if (request.headers['x-admin-secret'] !== secret) {
        reply.code(401).send({ error: 'Неверный секрет', code: 'UNAUTHORIZED' });
        return false;
    }
    return true;
}
// Генерация кода: 3 группы по 4 символа, например FIRE-MOON-2024
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const group = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${group(4)}-${group(4)}-${group(4)}`;
}
const createCodeSchema = zod_1.z.object({
    tier: zod_1.z.enum(['practitioner', 'master']),
    label: zod_1.z.string().max(100).optional(),
    expiresAt: zod_1.z.string().datetime().optional(), // ISO дата, опционально
});
async function adminRoutes(app) {
    // ── Создать один код ──────────────────────────────────────────────────────
    app.post('/admin/codes', async (request, reply) => {
        if (!checkAdmin(request, reply))
            return;
        const { tier, label, expiresAt } = createCodeSchema.parse(request.body);
        const code = generateCode();
        const record = await index_1.prisma.accessCode.create({
            data: {
                code,
                tier: tier,
                label: label ?? null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            }
        });
        return {
            code: record.code,
            tier: record.tier,
            label: record.label,
            expiresAt: record.expiresAt,
            createdAt: record.createdAt,
        };
    });
    // ── Создать несколько кодов одного уровня ─────────────────────────────────
    app.post('/admin/codes/batch', async (request, reply) => {
        if (!checkAdmin(request, reply))
            return;
        const schema = zod_1.z.object({
            tier: zod_1.z.enum(['practitioner', 'master']),
            count: zod_1.z.number().int().min(1).max(50),
            label: zod_1.z.string().max(100).optional(),
            expiresAt: zod_1.z.string().datetime().optional(),
        });
        const { tier, count, label, expiresAt } = schema.parse(request.body);
        const codes = await Promise.all(Array.from({ length: count }, async () => {
            let code = generateCode();
            // на случай коллизии — retry
            while (await index_1.prisma.accessCode.findUnique({ where: { code } })) {
                code = generateCode();
            }
            return index_1.prisma.accessCode.create({
                data: {
                    code,
                    tier: tier,
                    label: label ?? null,
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                }
            });
        }));
        return { created: codes.length, codes: codes.map((c) => ({ code: c.code, tier: c.tier, label: c.label })) };
    });
    // ── Список всех кодов ─────────────────────────────────────────────────────
    app.get('/admin/codes', async (request, reply) => {
        if (!checkAdmin(request, reply))
            return;
        const query = request.query;
        const filter = {};
        if (query.tier)
            filter.tier = query.tier;
        if (query.used === 'true')
            filter.usedAt = { not: null };
        if (query.used === 'false')
            filter.usedAt = null;
        const codes = await index_1.prisma.accessCode.findMany({
            where: filter,
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        const total = codes.length;
        const used = codes.filter((c) => c.usedAt).length;
        const unused = total - used;
        const expired = codes.filter((c) => c.expiresAt && c.expiresAt < new Date() && !c.usedAt).length;
        return { total, used, unused, expired, codes };
    });
    // ── Удалить / деактивировать код ─────────────────────────────────────────
    app.delete('/admin/codes/:code', async (request, reply) => {
        if (!checkAdmin(request, reply))
            return;
        const { code } = request.params;
        const record = await index_1.prisma.accessCode.findUnique({ where: { code } });
        if (!record)
            return reply.code(404).send({ error: 'Код не найден', code: 'NOT_FOUND' });
        if (record.usedAt)
            return reply.code(409).send({ error: 'Код уже использован', code: 'ALREADY_USED' });
        await index_1.prisma.accessCode.delete({ where: { code } });
        return { ok: true, deleted: code };
    });
    // ── Статистика пользователей по тарифам ───────────────────────────────────
    app.get('/admin/stats', async (request, reply) => {
        if (!checkAdmin(request, reply))
            return;
        const [total, byTier, recentUsers] = await Promise.all([
            index_1.prisma.user.count(),
            index_1.prisma.user.groupBy({ by: ['tier'], _count: { id: true } }),
            index_1.prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { firstName: true, username: true, tier: true, createdAt: true }
            }),
        ]);
        return {
            totalUsers: total,
            byTier: Object.fromEntries(byTier.map((b) => [b.tier, b._count.id])),
            recentUsers,
        };
    });
}
