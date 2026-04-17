"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candleRoutes = candleRoutes;
const zod_1 = require("zod");
const index_1 = require("../index");
const lunarService_1 = require("../services/lunarService");
// ─── ИСПРАВЛЕННАЯ КАРТА СООТВЕТСТВИЙ ────────────────────────────────────────
// Изменения по сравнению с предыдущей версией:
//   здоровье:    масло «Ель» → «Лаванда» (ель — хвоя для курения, не эфирное масло)
//   здоровье:    камень «Кварц» → «Аквамарин» (кварц слишком общий, аквамарин = исцеление)
//   заземление:  масло «Герань» → «Пачули» (герань = любовь/баланс, не заземление)
//   победа:      масло «Мирт» → «Имбирь» (мирт = мир/нежность, имбирь = сила/победа)
//   интуиция:    масло «Можжевельник» → «Полынь» (можжевельник = защита, полынь = ясновидение)
//   творчество:  масло «Пачули» → «Апельсин» (пачули = заземление/деньги, апельсин = творчество)
//   защита:      камень «Яшма» → «Чёрный турмалин» (яшма = заземление, турмалин = защита)
//   очищение:    камень «Яшма» → «Кварц» (кварц = нейтральный усилитель, универсальное очищение)
//   удача:       камень «Агат» → «Авантюрин» (авантюрин — классический камень удачи)
const CANDLE_MAP = {
    'любовь': { color: 'Розовая', oil: 'Роза', stone: 'Розовый кварц' },
    'деньги': { color: 'Зелёная', oil: 'Базилик', stone: 'Авантюрин' },
    'защита': { color: 'Белая', oil: 'Ладан', stone: 'Чёрный турмалин' },
    'здоровье': { color: 'Синяя', oil: 'Лаванда', stone: 'Аквамарин' },
    'духовность': { color: 'Фиолетовая', oil: 'Ладан', stone: 'Аметист' },
    'удача': { color: 'Оранжевая', oil: 'Апельсин', stone: 'Авантюрин' },
    'карьера': { color: 'Оранжевая', oil: 'Имбирь', stone: 'Тигровый глаз' },
    'очищение': { color: 'Белая', oil: 'Шалфей', stone: 'Кварц' },
    'медитация': { color: 'Фиолетовая', oil: 'Сандал', stone: 'Аметист' },
    'творчество': { color: 'Оранжевая', oil: 'Апельсин', stone: 'Сердолик' },
    'мир в доме': { color: 'Голубая', oil: 'Лаванда', stone: 'Аквамарин' },
    'финансовое благополучие': { color: 'Зелёная', oil: 'Корица', stone: 'Пирит' },
    'привлечение любви': { color: 'Розовая', oil: 'Жасмин', stone: 'Розовый кварц' },
    'исцеление': { color: 'Синяя', oil: 'Эвкалипт', stone: 'Кварц' },
    'победа': { color: 'Золотая', oil: 'Имбирь', stone: 'Тигровый глаз' },
    'заземление': { color: 'Коричневая', oil: 'Пачули', stone: 'Тигровый глаз' },
    'интуиция': { color: 'Тёмно-синяя', oil: 'Полынь', stone: 'Лазурит' },
    'сны': { color: 'Синяя', oil: 'Лаванда', stone: 'Лунный камень' },
    'предки': { color: 'Белая', oil: 'Мирра', stone: 'Обсидиан' },
    'успех': { color: 'Золотая', oil: 'Ладан', stone: 'Пирит' },
    'самолюбовь': { color: 'Розовая', oil: 'Иланг-иланг', stone: 'Розовый кварц' },
    'страсть': { color: 'Красная', oil: 'Пачули', stone: 'Гранат' },
    'путешествие': { color: 'Голубая', oil: 'Мята', stone: 'Аквамарин' },
    'учёба': { color: 'Жёлтая', oil: 'Лимон', stone: 'Цитрин' },
    'новые начала': { color: 'Белая', oil: 'Бергамот', stone: 'Прозрачный кварц' },
    'завершение': { color: 'Чёрная', oil: 'Можжевельник', stone: 'Обсидиан' },
    'отпускание': { color: 'Синяя', oil: 'Лаванда', stone: 'Голубой кварц' },
};
const FREE_DAILY_LIMIT = 3;
// ─── Предупреждения о несоответствии намерения и фазы ───────────────────────
// Возвращает текст-подсказку если намерение плохо совместимо с текущей фазой
const PHASE_INTENTION_WARNINGS = {
    // На убывающей луне не стоит привлекать
    waning_gibbous: ['деньги', 'финансовое благополучие', 'привлечение любви', 'удача', 'успех', 'карьера'],
    last_quarter: ['деньги', 'финансовое благополучие', 'привлечение любви', 'удача', 'успех', 'карьера', 'любовь'],
    waning_crescent: ['деньги', 'финансовое благополучие', 'привлечение любви', 'удача', 'успех', 'карьера', 'любовь', 'творчество'],
    // На растущей луне не стоит завершать
    waxing_crescent: ['завершение', 'отпускание'],
    waxing_gibbous: ['завершение', 'отпускание'],
};
function getPhaseWarning(intention, phase) {
    const warningIntentions = PHASE_INTENTION_WARNINGS[phase];
    if (!warningIntentions)
        return null;
    const intentionLower = intention.toLowerCase();
    const matches = warningIntentions.some(w => intentionLower.includes(w));
    if (!matches)
        return null;
    const isWaning = ['waning_gibbous', 'last_quarter', 'waning_crescent'].includes(phase);
    const isWaxing = ['waxing_crescent', 'waxing_gibbous'].includes(phase);
    if (isWaning) {
        return 'Сейчас убывающая Луна — лучшее время для отпускания, а не притяжения. ' +
            'Ритуал сработает, но эффективнее будет в растущую фазу (через несколько дней).';
    }
    if (isWaxing) {
        return 'Сейчас растущая Луна — лучшее время для притяжения, а не завершения. ' +
            'Для завершающей работы подождите убывающей фазы.';
    }
    return null;
}
const pickSchema = zod_1.z.object({
    intention: zod_1.z.string().min(1).max(200),
    moonPhase: zod_1.z.string().optional(),
});
async function candleRoutes(app) {
    app.post('/candle/pick', async (request, reply) => {
        const { userId } = request.user;
        const { intention, moonPhase } = pickSchema.parse(request.body);
        const user = await index_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 });
        // Лимит для free
        if (user.tier === 'free') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayPicks = await index_1.prisma.candlePick.count({
                where: { userId, createdAt: { gte: today } },
            });
            if (todayPicks >= FREE_DAILY_LIMIT) {
                return reply.code(402).send({
                    error: 'Дневной лимит подбора исчерпан',
                    code: 'PAYMENT_REQUIRED',
                    usedToday: todayPicks,
                    dailyLimit: FREE_DAILY_LIMIT,
                    statusCode: 402,
                });
            }
        }
        // Поиск соответствия
        const intentionLower = intention.toLowerCase();
        const match = Object.entries(CANDLE_MAP).find(([key]) => intentionLower.includes(key));
        const result = match ? match[1] : { color: 'Белая', oil: 'Лаванда', stone: 'Прозрачный кварц' };
        const currentPhase = moonPhase ?? (0, lunarService_1.getMoonPhase)(new Date());
        const currentPhaseRu = (0, lunarService_1.getMoonPhaseRu)(currentPhase);
        // Предупреждение о фазе
        const phaseWarning = getPhaseWarning(intentionLower, currentPhase);
        await index_1.prisma.candlePick.create({
            data: { userId, intention, ...result, moonPhase: currentPhase },
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const usedToday = await index_1.prisma.candlePick.count({ where: { userId, createdAt: { gte: today } } });
        return {
            color: result.color,
            oil: result.oil,
            stone: result.stone,
            moonPhase: currentPhase,
            moonPhaseRu: currentPhaseRu,
            phaseWarning, // null или строка с предупреждением
            usedToday,
            dailyLimit: user.tier === 'free' ? FREE_DAILY_LIMIT : null,
        };
    });
    app.get('/candle/picks', async (request) => {
        const { userId } = request.user;
        const picks = await index_1.prisma.candlePick.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return { picks };
    });
}
