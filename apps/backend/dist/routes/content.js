"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentRoutes = contentRoutes;
const path_1 = __importDefault(require("path"));
const index_1 = require("../index");
const tierGuard_1 = require("../middleware/tierGuard");
const chapters = require(path_1.default.join(__dirname, '../data/chapters.json'));
const tables = require(path_1.default.join(__dirname, '../data/tables.json'));
async function contentRoutes(app) {
    // ── GET /content/chapters — список всех глав ──────────────────────────────
    app.get('/content/chapters', async (request) => {
        const { userId } = request.user;
        const user = await index_1.prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
        const tier = (user?.tier ?? 'free');
        return {
            chapters: chapters.map((ch) => ({
                id: ch.id,
                title: ch.title,
                part: ch.part,
                tier: ch.tier,
                available: (0, tierGuard_1.hasAccess)(tier, ch.tier),
                preview: ch.preview,
                // Поля для UI — передаём если есть в JSON
                emoji: ch.emoji ?? null,
                read_time_min: ch.read_time_min ?? null,
                // related нужен для связанных глав в ChapterView
                related: ch.related ?? [],
            }))
        };
    });
    // ── GET /content/chapters/:id — полный текст главы ────────────────────────
    app.get('/content/chapters/:id', async (request, reply) => {
        const { userId } = request.user;
        const { id } = request.params;
        const chapter = chapters.find((c) => String(c.id) === id);
        if (!chapter) {
            return reply.code(404).send({ error: 'Глава не найдена', code: 'NOT_FOUND', statusCode: 404 });
        }
        const user = await index_1.prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
        const tier = (user?.tier ?? 'free');
        if (!(0, tierGuard_1.hasAccess)(tier, chapter.tier)) {
            return reply.code(403).send({
                error: `Требуется тариф: ${chapter.tier}`,
                code: 'TIER_REQUIRED',
                requiredTier: chapter.tier,
                statusCode: 403,
            });
        }
        // Возвращаем всю главу целиком — фронтенд сам выбирает что показать
        return { chapter };
    });
    // ── GET /content/tables — таблицы быстрого доступа (Мастер+) ─────────────
    app.get('/content/tables', async (request, reply) => {
        const { userId } = request.user;
        const user = await index_1.prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
        if (!(0, tierGuard_1.hasAccess)((user?.tier ?? 'free'), 'master')) {
            return reply.code(403).send({
                error: 'Требуется Мастер',
                code: 'TIER_REQUIRED',
                requiredTier: 'master',
                statusCode: 403,
            });
        }
        return tables;
    });
}
