# Robokassa — Проект интеграции
> Статус: Проект · Не внедрено · Версия v20

---

## Зачем Robokassa

Telegram Stars работают только внутри Telegram и требуют покупки Stars.
Robokassa — российский эквайринг, принимает карты РФ напрямую.
Это параллельный канал, не замена Stars.

| | Telegram Stars | Robokassa |
|---|---|---|
| Аудитория | Все Telegram пользователи | Держатели карт РФ |
| Комиссия | ~30% | ~3.5% |
| Интерфейс | Нативный в Telegram | Редирект на сайт Robokassa |
| Вывод | Через Telegram | На расчётный счёт |
| Регистрация | Не нужна | Нужен ИП или самозанятый |

---

## Что нужно получить в Robokassa

1. Зарегистрироваться на robokassa.ru
2. Создать магазин → получить три ключа:
   - ROBOKASSA_LOGIN — логин магазина
   - ROBOKASSA_PASSWORD1 — пароль для создания платежей
   - ROBOKASSA_PASSWORD2 — пароль для проверки вебхука
3. В настройках магазина указать URL:
   - Result URL: https://yazyk-plameni-api.onrender.com/v1/payments/robokassa/webhook
   - Success URL: https://yazyk-plameni-frontend.onrender.com/payment-success
   - Fail URL: https://yazyk-plameni-frontend.onrender.com/payment-fail

---

## Флоу оплаты

```
Нажимает "Оплатить картой"
  POST /v1/payments/robokassa/create
  Backend: создаёт PendingOrder (invId), формирует ссылку с MD5-подписью
  Frontend: WebApp.openLink(paymentUrl)
  Telegram открывает браузер → страница Robokassa
  Пользователь вводит карту и платит
  Robokassa: POST /v1/payments/robokassa/webhook
  Backend: проверяет подпись, обновляет tier
  Robokassa редиректит на /payment-success
  Пользователь возвращается в TMA → WebApp.onEvent('activated') → обновляем профиль
```

---

## Подпись MD5

Создание платежа (Password1):
  SignatureValue = MD5("login:sum:invId:password1")

Проверка вебхука (Password2):
  SignatureCheck = MD5("sum:invId:password2")

Вебхук принимается только при совпадении подписей.

---

## Нюансы

54-ФЗ: Robokassa требует чек (Receipt) при каждом платеже.
Для самозанятых: tax=none, payment_method=full_payment, payment_object=service.

InvId: уникальный номер заказа. Хранить в таблице pending_orders до подтверждения.
Удобно использовать autoincrement — он и будет InvId.

Вебхук: Robokassa ожидает ответ текстом "OK{InvId}", не JSON.
reply.header('Content-Type', 'text/plain').send("OK" + invId)

Тест: при IsTest=1 деньги не списываются.
Тестовая карта: 4111 1111 1111 1111, любой CVV и дата.

Возврат в TMA: после оплаты пользователь возвращается через Success URL в браузере.
TMA остаётся в фоне. При возврате слушаем WebApp.onEvent('activated') → обновляем профиль.

---

## Изменения в schema.prisma

```prisma
enum PaymentProvider {
  telegram_stars
  stripe
  robokassa        // добавить
}

model PendingOrder {
  id         Int      @id @default(autoincrement())
  userId     String   @map("user_id")
  productKey String   @map("product_key")
  provider   String
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("pending_orders")
}
```

---

## Новый сервис robokassaService.ts

```typescript
import crypto from 'node:crypto'

const LOGIN = process.env.ROBOKASSA_LOGIN!
const PASS1  = process.env.ROBOKASSA_PASSWORD1!
const PASS2  = process.env.ROBOKASSA_PASSWORD2!
const TEST   = process.env.ROBOKASSA_TEST_MODE === 'true'

export const ROBOKASSA_PRODUCTS: Record<string, { price: number; description: string }> = {
  subscription_practitioner_monthly: { price: 299, description: 'Практик — подписка на месяц' },
  subscription_master_monthly:       { price: 799, description: 'Мастер — подписка на месяц' },
  ai_pack_5:                         { price: 149, description: 'Пакет 5 ИИ-запросов' },
  diary_lifetime:                    { price: 199, description: 'Дневник практик навсегда' },
  ancestral_guide:                   { price: 299, description: 'Расширенный гид по роду' },
}

export function createPaymentUrl(invId: number, productKey: string): string {
  const product = ROBOKASSA_PRODUCTS[productKey]
  const sum = product.price.toFixed(2)
  const receipt = JSON.stringify({
    items: [{
      name: product.description, quantity: 1, sum: product.price,
      tax: 'none', payment_method: 'full_payment', payment_object: 'service',
    }]
  })
  const signature = md5(`${LOGIN}:${sum}:${invId}:${PASS1}`)
  const base = 'https://auth.robokassa.ru/Merchant/Index.aspx'
  return `${base}?MerchantLogin=${LOGIN}&OutSum=${sum}&InvId=${invId}` +
    `&Description=${encodeURIComponent(product.description)}` +
    `&SignatureValue=${signature}&Receipt=${encodeURIComponent(receipt)}&IsTest=${TEST ? 1 : 0}`
}

export function verifyWebhook(outSum: string, invId: string, signature: string): boolean {
  return md5(`${outSum}:${invId}:${PASS2}`).toLowerCase() === signature.toLowerCase()
}

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}
```

---

## Новые роуты в payments.ts

```typescript
// POST /payments/robokassa/create
app.post('/payments/robokassa/create', async (request, reply) => {
  const { userId } = request.user as { userId: string }
  const { productKey } = createSchema.parse(request.body)
  if (!ROBOKASSA_PRODUCTS[productKey]) return reply.code(404).send(...)

  const order = await prisma.pendingOrder.create({
    data: { userId, productKey, provider: 'robokassa' }
  })
  const paymentUrl = createPaymentUrl(order.id, productKey)
  return { paymentUrl }
})

// POST /payments/robokassa/webhook  (публичный — без JWT)
app.post('/payments/robokassa/webhook', async (request, reply) => {
  const { OutSum, InvId, SignatureValue } = request.body as any

  if (!verifyWebhook(OutSum, InvId, SignatureValue)) {
    return reply.code(400).send('Bad signature')
  }

  const order = await prisma.pendingOrder.findUnique({ where: { id: Number(InvId) } })
  if (!order) return reply.code(404).send('Order not found')

  // Обновляем tier и создаём subscription/purchase
  // ...та же логика, что в Stars вебхуке...

  // Обязательный ответ для Robokassa — текст, не JSON
  reply.header('Content-Type', 'text/plain').send(`OK${InvId}`)
})
```

---

## Изменения во фронтенде

PaywallPage.tsx — добавить кнопку:
```tsx
<button onClick={() => handleBuyCard(plan.key, plan.tier)}>
  Оплатить картой 💳
</button>

async function handleBuyCard(productKey, tier) {
  const { paymentUrl } = await api.post('/payments/robokassa/create', { productKey })
  WebApp.openLink(paymentUrl)
}
```

App.tsx — добавить роуты и хук возврата:
```tsx
<Route path="/payment-success" element={<PaymentSuccessPage />} />
<Route path="/payment-fail"    element={<PaymentFailPage />} />

// В AppInner — слушаем возврат пользователя в TMA
WebApp.onEvent('activated', async () => {
  const data = await api.get('/users/me')
  updateTier(data.tier)
})
```

---

## Порядок внедрения

1. Зарегистрироваться на robokassa.ru → получить 3 ключа
2. Добавить robokassa в enum PaymentProvider + таблицу pending_orders в schema.prisma
3. Создать src/services/robokassaService.ts
4. Расширить src/routes/payments.ts двумя роутами
5. Добавить /payment-success и /payment-fail страницы
6. Обновить PaywallPage.tsx — кнопка "Оплатить картой"
7. Добавить WebApp.onEvent('activated') в App.tsx
8. Добавить 4 переменные в render.yaml и .env.example
9. Тест в тестовом режиме (IsTest=1, тестовая карта 4111...)
10. Переключить ROBOKASSA_TEST_MODE=false

---

## Все изменяемые файлы

| Файл | Изменение |
|---|---|
| prisma/schema.prisma | robokassa в enum + таблица pending_orders |
| src/services/robokassaService.ts | Новый файл |
| src/routes/payments.ts | Два новых роута |
| src/index.ts | robokassa/webhook в publicRoutes |
| src/pages/PaywallPage.tsx | Кнопка "Оплатить картой" |
| src/pages/PaymentSuccessPage.tsx | Новый файл |
| src/pages/PaymentFailPage.tsx | Новый файл |
| src/App.tsx | Новые роуты + onEvent('activated') |
| render.yaml | 4 новые переменные |
| .env.example | 4 новые переменные |
