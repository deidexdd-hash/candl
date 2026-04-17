"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRoutes = paymentsRoutes;
const zod_1 = require("zod");
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const index_1 = require("../index");
const botSetup_1 = require("../services/botSetup");
// Lazy — не падаем при старте если BOT_TOKEN не задан
function getBot() {
    const token = process.env.BOT_TOKEN;
    if (!token)
        throw new Error('BOT_TOKEN не задан');
    return new node_telegram_bot_api_1.default(token, { polling: false });
}
const PRODUCTS = {
    subscription_practitioner_monthly: { stars: 230, tier: 'practitioner' },
    subscription_master_monthly: { stars: 615, tier: 'master' },
    ai_pack_5: { stars: 115, productKey: 'ai_pack_5' },
    diary_lifetime: { stars: 154, productKey: 'diary_lifetime' },
    ancestral_guide: { stars: 231, productKey: 'ancestral_guide' },
};
const createSchema = zod_1.z.object({ productKey: zod_1.z.string() });
async function paymentsRoutes(app) {
    app.post('/payments/stars/create', async (request, reply) => {
        const { userId } = request.user;
        const { productKey } = createSchema.parse(request.body);
        const product = PRODUCTS[productKey];
        if (!product)
            return reply.code(404).send({ error: 'Unknown product', code: 'NOT_FOUND', statusCode: 404 });
        const invoice = await getBot().createInvoiceLink(productKey.replace(/_/g, ' '), 'Язык Пламени — доступ к контенту', JSON.stringify({ userId, productKey }), '', 'XTR', [{ label: productKey, amount: product.stars }]);
        return { invoiceLink: invoice };
    });
    // Единый вебхук — обрабатывает и платежи, и команды (/start, /help)
    app.post('/payments/stars/webhook', async (request) => {
        const body = request.body;
        // Сначала пробуем обработать как сообщение бота (/start, /help и т.д.)
        await (0, botSetup_1.handleBotUpdate)(body);
        // Затем — платёж
        const message = body?.message;
        if (message?.successful_payment) {
            const payment = message.successful_payment;
            let payload;
            try {
                payload = JSON.parse(payment.invoice_payload);
            }
            catch {
                return { ok: true };
            }
            const { userId, productKey } = payload;
            const product = PRODUCTS[productKey];
            if (!product)
                return { ok: true };
            if (product.tier) {
                const expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + 1);
                await index_1.prisma.$transaction([
                    index_1.prisma.user.update({ where: { id: userId }, data: { tier: product.tier } }),
                    index_1.prisma.subscription.create({
                        data: {
                            userId,
                            tier: product.tier,
                            provider: 'telegram_stars',
                            externalId: payment.telegram_payment_charge_id,
                            expiresAt,
                        }
                    }),
                    index_1.prisma.purchase.create({
                        data: {
                            userId,
                            productKey,
                            amountKopeks: product.stars * 130,
                            provider: 'telegram_stars',
                            externalId: payment.telegram_payment_charge_id,
                        }
                    })
                ]);
            }
            else if (product.productKey) {
                await index_1.prisma.purchase.create({
                    data: {
                        userId,
                        productKey: product.productKey,
                        amountKopeks: product.stars * 130,
                        provider: 'telegram_stars',
                        externalId: payment.telegram_payment_charge_id,
                    }
                });
            }
        }
        return { ok: true };
    });
    app.post('/payments/stripe/create', async (_, reply) => reply.code(501).send({ error: 'Stripe coming in v2', code: 'NOT_IMPLEMENTED', statusCode: 501 }));
    app.post('/payments/stripe/webhook', async () => ({ ok: true }));
}
