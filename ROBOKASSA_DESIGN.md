# Проект интеграции Robokassa
> Язык Пламени TMA · Оплата картой РФ · Только проект, без внедрения

## Зачем

Telegram Stars недоступны части аудитории. Robokassa — российский эквайринг, карты РФ (Visa, MC, МИР), СБП, ЮMoney. Для самозанятых регистрация доступна.

---

## Флоу оплаты

```
Paywall → «Оплатить картой»
  → POST /v1/payments/rk/create { productKey }
  → бэкенд: строит URL + MD5-подпись → { paymentUrl }
  → WebApp.openLink(paymentUrl)   ← встроенный браузер TG
  → пользователь платит на странице Robokassa
  → Robokassa → POST /v1/payments/rk/webhook  (server-to-server)
  → бэкенд: проверяет MD5 → обновляет tier → возвращает "OK{InvId}"
  → при возврате в TMA: /users/me → updateTier()
```

---

## Три URL для личного кабинета Robokassa

| Поле       | URL                                                               |
|------------|-------------------------------------------------------------------|
| ResultURL  | https://yazyk-plameni-api.onrender.com/v1/payments/rk/webhook    |
| SuccessURL | https://yazyk-plameni-frontend.onrender.com/payment-success      |
| FailURL    | https://yazyk-plameni-frontend.onrender.com/payment-fail         |

ResultURL — главный. Сюда Robokassa присылает подтверждение (server-to-server).

---

## Подпись MD5

```
# Создание платежа (Password1):
md5(`${login}:${sum}:${invId}:${password1}:Shp_tier=${tier}:Shp_userId=${userId}`)

# Проверка вебхука (Password2!):
md5(`${sum}:${invId}:${password2}:Shp_tier=${tier}:Shp_userId=${userId}`)
```

Параметры Shp_* — возвращаются Robokassa в вебхуке → знаем кому и что активировать.
Порядок Shp_* в подписи — строго алфавитный: Shp_tier (t) перед Shp_userId (u).

---

## Переменные окружения

```
ROBOKASSA_LOGIN     = YazykPlameni
ROBOKASSA_PASSWORD1 = xxxxxxxx
ROBOKASSA_PASSWORD2 = yyyyyyyy
ROBOKASSA_TEST_MODE = true
```

---

## Изменения в коде

### 1. schema.prisma

```prisma
enum PaymentProvider {
  telegram_stars
  stripe
  robokassa        // добавить
}
```
После → npx prisma db push

### 2. Новые npm зависимости

```
md5                   (подпись)
@fastify/formbody     (парсинг x-www-form-urlencoded вебхука)
@types/md5            (devDependencies)
```

КРИТИЧНО: без @fastify/formbody request.body вебхука будет пустым.

### 3. index.ts — зарегистрировать плагин до роутов

```typescript
import formbody from '@fastify/formbody'
await app.register(formbody)
```

### 4. payments.ts — два новых роута

POST /v1/payments/rk/create (авторизованный)
  body: { productKey }
  response: { paymentUrl }

POST /v1/payments/rk/webhook (публичный, x-www-form-urlencoded)
  body: OutSum, InvId, SignatureValue, Shp_tier, Shp_userId
  response: "OK{InvId}"  ← строго такой формат

### 5. PaywallPage.tsx — вторая кнопка

```tsx
<button onClick={() => handleRobokassa(plan.key)}>
  💳 Оплатить картой
</button>

async function handleRobokassa(productKey) {
  const { paymentUrl } = await api.post('/payments/rk/create', { productKey })
  WebApp.openLink(paymentUrl)
  // После возврата — опросить /users/me через 3 сек
  setTimeout(async () => {
    const me = await api.get('/users/me')
    updateTier(me.tier)
  }, 3000)
}
```

### 6. Новая страница /payment-success

Простая страница которую видит пользователь в браузере после оплаты:
"Оплата прошла! Вернитесь в Telegram — доступ уже открыт"

---

## Цены в рублях (добавить в PRODUCTS)

| productKey                        | Stars | Рублей |
|-----------------------------------|-------|--------|
| subscription_practitioner_monthly | 230   | 299 ₽  |
| subscription_master_monthly       | 615   | 799 ₽  |
| ai_pack_5                         | 115   | 149 ₽  |
| diary_lifetime                    | 154   | 199 ₽  |
| ancestral_guide                   | 231   | 299 ₽  |

---

## Порядок внедрения

1. Зарегистрировать магазин на robokassa.ru (самозанятый)
2. Добавить переменные в Render → Environment
3. schema.prisma: добавить robokassa → db push
4. npm install md5 @fastify/formbody @types/md5
5. index.ts: app.register(formbody)
6. payments.ts: два новых роута
7. PaywallPage: кнопка «Оплатить картой»
8. App.tsx + роут /payment-success
9. render.yaml: добавить ROBOKASSA_* (sync: false)
10. Тест → боевой режим

---

## Риски

| Риск | Решение |
|---|---|
| Вебхук x-www-form-urlencoded | @fastify/formbody — критично |
| Двойной вебхук | Дедупликация по InvId |
| SuccessURL в браузере | Страница «Вернитесь в Telegram» |
| Пользователь не дождался вебхука | setTimeout + /users/me после возврата |
