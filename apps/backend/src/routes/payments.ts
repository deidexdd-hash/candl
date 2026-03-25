import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import TelegramBot from 'node-telegram-bot-api'
import { prisma } from '../index'
import { handleBotUpdate } from '../services/botSetup'

const bot = new TelegramBot(process.env.BOT_TOKEN!, { polling: false })

const PRODUCTS: Record<string, { stars: number; tier?: string; productKey?: string }> = {
  subscription_practitioner_monthly: { stars: 230, tier: 'practitioner' },
  subscription_master_monthly:       { stars: 615, tier: 'master' },
  ai_pack_5:                         { stars: 115, productKey: 'ai_pack_5' },
  diary_lifetime:                    { stars: 154, productKey: 'diary_lifetime' },
  ancestral_guide:                   { stars: 231, productKey: 'ancestral_guide' },
}

const createSchema = z.object({ productKey: z.string() })

export async function paymentsRoutes(app: FastifyInstance) {
  app.post('/payments/stars/create', async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { productKey } = createSchema.parse(request.body)
    const product = PRODUCTS[productKey]
    if (!product) return reply.code(404).send({ error: 'Unknown product', code: 'NOT_FOUND', statusCode: 404 })

    const invoice = await bot.createInvoiceLink(
      productKey.replace(/_/g, ' '),
      'Язык Пламени — доступ к контенту',
      JSON.stringify({ userId, productKey }),
      '',
      'XTR',
      [{ label: productKey, amount: product.stars }]
    )

    return { invoiceLink: invoice }
  })

  // Единый вебхук — обрабатывает и платежи, и команды (/start, /help)
  app.post('/payments/stars/webhook', async (request) => {
    const body = request.body as any

    // Сначала пробуем обработать как сообщение бота (/start, /help и т.д.)
    await handleBotUpdate(body)

    // Затем — платёж
    const message = body?.message
    if (message?.successful_payment) {
      const payment = message.successful_payment

      let payload: { userId: string; productKey: string }
      try {
        payload = JSON.parse(payment.invoice_payload)
      } catch {
        return { ok: true }
      }

      const { userId, productKey } = payload
      const product = PRODUCTS[productKey]
      if (!product) return { ok: true }

      if (product.tier) {
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 1)

        await prisma.$transaction([
          prisma.user.update({ where: { id: userId }, data: { tier: product.tier as any } }),
          prisma.subscription.create({
            data: {
              userId,
              tier: product.tier as any,
              provider: 'telegram_stars',
              externalId: payment.telegram_payment_charge_id,
              expiresAt,
            }
          }),
          prisma.purchase.create({
            data: {
              userId,
              productKey,
              amountKopeks: product.stars * 130,
              provider: 'telegram_stars',
              externalId: payment.telegram_payment_charge_id,
            }
          })
        ])
      } else if (product.productKey) {
        await prisma.purchase.create({
          data: {
            userId,
            productKey: product.productKey,
            amountKopeks: product.stars * 130,
            provider: 'telegram_stars',
            externalId: payment.telegram_payment_charge_id,
          }
        })
      }
    }

    return { ok: true }
  })

  app.post('/payments/stripe/create', async (_, reply) =>
    reply.code(501).send({ error: 'Stripe coming in v2', code: 'NOT_IMPLEMENTED', statusCode: 501 })
  )
  app.post('/payments/stripe/webhook', async () => ({ ok: true }))
}
