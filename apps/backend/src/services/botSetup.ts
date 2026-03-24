import TelegramBot from 'node-telegram-bot-api'

const BOT_TOKEN = process.env.BOT_TOKEN!
const TMA_URL   = process.env.TMA_URL!

export async function setupBot() {
  if (!BOT_TOKEN || !TMA_URL) {
    console.warn('[bot] BOT_TOKEN или TMA_URL не заданы — пропускаем настройку бота')
    return
  }

  const base = `https://api.telegram.org/bot${BOT_TOKEN}`

  // 1. Кнопка меню — открывает TMA одним нажатием
  await fetch(`${base}/setChatMenuButton`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      menu_button: {
        type: 'web_app',
        text: '🕯 Открыть',
        web_app: { url: TMA_URL },
      },
    }),
  }).then((r: Response) => r.json()).then((r: any) => {
    if (r.ok) console.log('[bot] Кнопка меню установлена')
    else console.warn('[bot] Ошибка кнопки меню:', r.description)
  })

  // 2. Команды бота
  await fetch(`${base}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start', description: 'Открыть Язык Пламени' },
        { command: 'help',  description: 'Как пользоваться приложением' },
      ],
    }),
  }).then((r: Response) => r.json()).then((r: any) => {
    if (r.ok) console.log('[bot] Команды установлены')
    else console.warn('[bot] Ошибка команд:', r.description)
  })

  // 3. Описание бота (показывается новым пользователям)
  await fetch(`${base}/setMyDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: '🕯 Язык Пламени — полная энциклопедия свечной магии.\n\nПодбор свечи по намерению, лунный календарь, ритуалы, дневник практик и ИИ-помощник.\n\nНажмите кнопку ниже чтобы открыть приложение.',
    }),
  }).then((r: Response) => r.json()).then((r: any) => {
    if (r.ok) console.log('[bot] Описание установлено')
  })

  // 4. Короткое описание (в списке ботов)
  await fetch(`${base}/setMyShortDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      short_description: '🕯 Энциклопедия свечной магии. Подбор свечи, ритуалы, лунный календарь.',
    }),
  }).then((r: Response) => r.json()).then((r: any) => {
    if (r.ok) console.log('[bot] Краткое описание установлено')
  })

  console.log('[bot] Настройка завершена')
}

// Обработчик входящих сообщений от бота (вызывается из вебхука)
export async function handleBotUpdate(body: any) {
  if (!BOT_TOKEN || !TMA_URL) return

  const bot = new TelegramBot(BOT_TOKEN, { polling: false })
  const message = body?.message
  if (!message) return

  const chatId = message.chat.id
  const text   = message.text ?? ''

  // /start
  if (text.startsWith('/start')) {
    await bot.sendMessage(chatId,
      '🕯 *Добро пожаловать в Язык Пламени*\n\n' +
      'Здесь вы найдёте:\n' +
      '• Подбор свечи по намерению\n' +
      '• Лунный календарь с рекомендациями\n' +
      '• Полную энциклопедию свечной магии\n' +
      '• Дневник практик\n\n' +
      'Нажмите кнопку ниже чтобы открыть приложение 👇',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🕯 Открыть Язык Пламени', web_app: { url: TMA_URL } }
          ]]
        }
      }
    )
    return
  }

  // /help
  if (text.startsWith('/help')) {
    await bot.sendMessage(chatId,
      '📖 *Как пользоваться Язык Пламени*\n\n' +
      '*Луна* — фаза Луны сегодня и рекомендации по свечам\n\n' +
      '*Подбор* — введите намерение (например «Любовь» или «Деньги») и получите подходящую свечу, масло и камень\n\n' +
      '*Библиотека* — полная энциклопедия: история, цвета, масла, ритуалы\n\n' +
      '*Профиль* — ваш тариф и настройки уведомлений о фазах Луны\n\n' +
      '_Бесплатно доступны первые 5 глав и 3 подбора свечи в день._',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🕯 Открыть приложение', web_app: { url: TMA_URL } }
          ]]
        }
      }
    )
    return
  }

  // Любое другое сообщение
  await bot.sendMessage(chatId,
    'Нажмите кнопку «Открыть» внизу экрана или воспользуйтесь командой /start',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🕯 Открыть Язык Пламени', web_app: { url: TMA_URL } }
        ]]
      }
    }
  )
}
