"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const client_1 = require("@prisma/client");
const auth_1 = require("./routes/auth");
const users_1 = require("./routes/users");
const content_1 = require("./routes/content");
const candle_1 = require("./routes/candle");
const lunar_1 = require("./routes/lunar");
const payments_1 = require("./routes/payments");
const admin_1 = require("./routes/admin");
const accessCode_1 = require("./routes/accessCode");
const panel_1 = require("./routes/panel");
const assistant_1 = require("./routes/assistant"); // ← был импортирован но не зарегистрирован
const lunarService_1 = require("./services/lunarService");
const botSetup_1 = require("./services/botSetup");
exports.prisma = new client_1.PrismaClient();
async function main() {
    const app = (0, fastify_1.default)({ logger: true });
    await app.register(cors_1.default, { origin: '*' });
    await app.register(jwt_1.default, { secret: process.env.JWT_SECRET });
    app.addHook('onRequest', async (request, reply) => {
        const publicRoutes = [
            '/v1/auth/telegram',
            '/v1/payments/stars/webhook',
            '/v1/payments/stripe/webhook',
        ];
        if (publicRoutes.includes(request.url))
            return;
        if (request.url.startsWith('/v1/admin'))
            return;
        try {
            await request.jwtVerify();
        }
        catch {
            reply.code(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 });
        }
    });
    const prefix = '/v1';
    await app.register(auth_1.authRoutes, { prefix });
    await app.register(users_1.userRoutes, { prefix });
    await app.register(content_1.contentRoutes, { prefix });
    await app.register(candle_1.candleRoutes, { prefix });
    await app.register(lunar_1.lunarRoutes, { prefix });
    await app.register(lunar_1.notificationsRoutes, { prefix });
    await app.register(lunar_1.diaryRoutes, { prefix });
    await app.register(payments_1.paymentsRoutes, { prefix });
    await app.register(admin_1.adminRoutes, { prefix });
    await app.register(accessCode_1.accessCodeRoutes, { prefix });
    await app.register(panel_1.panelRoutes, { prefix });
    await app.register(assistant_1.assistantRoutes, { prefix }); // ← добавлена регистрация
    (0, lunarService_1.startLunarCron)();
    const PORT = Number(process.env.PORT) || 3000;
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log('Backend running on :' + PORT);
    await (0, botSetup_1.setupBot)();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
