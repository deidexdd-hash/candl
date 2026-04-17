"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const zod_1 = require("zod");
const node_crypto_1 = __importDefault(require("node:crypto"));
const index_1 = require("../index");
const initDataSchema = zod_1.z.object({
    initData: zod_1.z.string().min(1),
});
function getTestUserIds() {
    const raw = process.env.TEST_USER_IDS ?? '';
    return raw.split(',').map(s => s.trim()).filter(Boolean).map(s => BigInt(s));
}
function isTestUser(telegramId) {
    return getTestUserIds().some(id => id === telegramId);
}
async function authRoutes(app) {
    app.post('/auth/telegram', async (request, reply) => {
        const { initData } = initDataSchema.parse(request.body);
        const user = verifyAndParseTelegramInitData(initData, process.env.BOT_TOKEN);
        if (!user) {
            return reply.code(401).send({ error: 'Invalid init data', code: 'UNAUTHORIZED', statusCode: 401 });
        }
        const telegramId = BigInt(user.id);
        const testUser = isTestUser(telegramId);
        const existing = await index_1.prisma.user.findUnique({ where: { telegramId } });
        const isNew = !existing;
        const dbUser = await index_1.prisma.user.upsert({
            where: { telegramId },
            create: {
                telegramId,
                username: user.username ?? null,
                firstName: user.first_name ?? null,
                // Тест-пользователи сразу получают мастер-тариф
                tier: testUser ? 'master' : 'free',
                lunarNotification: { create: {} },
            },
            update: {
                username: user.username ?? null,
                firstName: user.first_name ?? null,
                // Если уже есть аккаунт и это тест-пользователь — принудительно ставим мастер
                ...(testUser ? { tier: 'master' } : {}),
            },
        });
        const token = app.jwt.sign({ userId: dbUser.id, telegramId: dbUser.telegramId.toString() }, { expiresIn: '30d' });
        return {
            token,
            user: {
                id: dbUser.id,
                telegramId: dbUser.telegramId.toString(),
                firstName: dbUser.firstName,
                tier: dbUser.tier,
                isNew,
                isTestUser: testUser,
                isAdmin: testUser, // Админы = тест-пользователи из TEST_USER_IDS
            },
        };
    });
}
function verifyAndParseTelegramInitData(initData, botToken) {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash)
        return null;
    params.delete('hash');
    const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
    const secretKey = node_crypto_1.default.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = node_crypto_1.default.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (computedHash !== hash)
        return null;
    const userStr = params.get('user');
    return userStr ? JSON.parse(userStr) : null;
}
