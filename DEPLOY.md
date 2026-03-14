# Язык Пламени — Чеклист запуска

## Шаг 1: Подготовка бота в Telegram

1. Открыть @BotFather → /newbot
2. Придумать имя бота и username (например: @YazykPlameniBot)
3. Сохранить BOT_TOKEN
4. /newapp → выбрать бота → задать название "Язык Пламени" → загрузить иконку
5. Указать URL приложения (после деплоя)
6. Для приёма Stars: /mybots → Bot Settings → Payments → Stars → включить

---

## Шаг 2: Получить API ключи

### Google Gemini (для v2, но можно сейчас)
1. console.cloud.google.com → создать проект
2. APIs & Services → Enable: Generative Language API
3. Credentials → Create API Key → скопировать

---

## Шаг 3: Деплой на Render.com

### 3.1 Создать аккаунт на render.com

### 3.2 Связать GitHub репозиторий
```bash
git init
git add .
git commit -m "initial: scaffold + content"
git remote add origin https://github.com/USERNAME/yazyk-plameni.git
git push -u origin main
```

### 3.3 Создать сервисы через render.yaml
В Render Dashboard → New → Blueprint → выбрать репозиторий
Render автоматически создаст все сервисы из render.yaml

### 3.4 Заполнить переменные окружения в Render Dashboard
Backend сервис → Environment:
```
BOT_TOKEN=         ← из @BotFather
GEMINI_API_KEY=    ← из Google Cloud Console
TMA_URL=           ← https://t.me/YazykPlameniBot/app
```
Остальные (DATABASE_URL, REDIS_URL, JWT_SECRET) Render заполнит автоматически.

### 3.5 После деплоя: обновить URL в BotFather
/mybots → @YazykPlameniBot → Bot Settings → Menu Button → Edit URL → вставить URL фронтенда

---

## Шаг 4: Первый запуск локально (для тестирования)

```bash
# 1. Установить зависимости
npm install

# 2. Создать .env файлы
cp .env.example apps/backend/.env
# Заполнить BOT_TOKEN, etc.

# 3. Запустить PostgreSQL и Redis (Docker)
docker run -d --name pg -e POSTGRES_DB=yazyk_plameni \
  -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass \
  -p 5432:5432 postgres:16

docker run -d --name redis -p 6379:6379 redis:7

# 4. Создать таблицы в БД
cd apps/backend
npx prisma migrate dev --name init
npx prisma generate

# 5. Запустить бэкенд
npm run dev

# 6. В другом терминале — фронтенд
cd apps/frontend
npm run dev
```

Фронтенд будет на http://localhost:5173
Бэкенд на http://localhost:3000

### Тест авторизации (без Telegram):
```bash
curl -X POST http://localhost:3000/v1/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"initData": "test"}'
```
Должен вернуть 401 — значит маршрут работает.

Для полного теста нужен реальный Telegram: откройте бота и нажмите кнопку.

---

## Шаг 5: Настройка вебхука бота

После деплоя зарегистрировать вебхук:
```bash
curl "https://api.telegram.org/bot{BOT_TOKEN}/setWebhook?url=https://your-api.onrender.com/v1/payments/stars/webhook"
```

---

## Шаг 6: Проверка работоспособности MVP

Пройти весь флоу вручную:
- [ ] Открыть TMA через бота
- [ ] Пройти онбординг (3 экрана)
- [ ] Увидеть главный экран с лунной фазой
- [ ] Попробовать подбор свечи (должно вернуть результат)
- [ ] Зайти в библиотеку (5 глав открыты, остальные с замком)
- [ ] Нажать на заблокированную главу → попасть на Paywall
- [ ] Нажать "Оплатить Stars" → открылся нативный диалог Telegram
- [ ] Пройти тестовую оплату → tier обновился
- [ ] Убедиться что заблокированные главы открылись

---

## Чеклист перед релизом

Технические:
- [ ] Все маршруты возвращают правильные ответы
- [ ] JWT верификация работает
- [ ] Stars вебхук принимает платежи
- [ ] Лунный крон запускается (проверить логи)
- [ ] Уведомления отправляются тестовому пользователю

Контент:
- [ ] Все 21 глава отображается корректно
- [ ] Tier-gating работает на всех уровнях
- [ ] Таблицы открываются у Мастера

Монетизация:
- [ ] Paywall показывает правильные цены в Stars
- [ ] После оплаты tier обновляется мгновенно
- [ ] Страница успеха показывается

Уведомления:
- [ ] Тестовый пользователь получил уведомление о фазе Луны
- [ ] Настройки уведомлений сохраняются
