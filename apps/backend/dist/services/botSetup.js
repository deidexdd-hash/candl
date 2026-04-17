"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBot = setupBot;
exports.handleBotUpdate = handleBotUpdate;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const BOT_TOKEN = process.env.BOT_TOKEN;
const TMA_URL = process.env.TMA_URL;
async function botFetch(method, body) {
    try {
        const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await r.json();
        if (json.ok)
            console.log(`[bot] ${method} OK`);
        else
            console.warn(`[bot] ${method} failed:`, json.description);
    }
    catch (err) {
        // Не роняем сервер если Telegram API недоступен
        console.warn(`[bot] ${method} error (non-fatal):`, err);
    }
}
async function setupBot() {
    if (!BOT_TOKEN || !TMA_URL) {
        console.warn('[bot] BOT_TOKEN или TMA_URL не заданы — пропускаем настройку');
        return;
    }
    await botFetch('setChatMenuButton', {
        menu_button: { type: 'web_app', text: '🕯 Открыть', web_app: { url: TMA_URL } },
    });
    await botFetch('setMyCommands', {
        commands: [
            { command: 'start', description: 'Открыть Язык Пламени' },
            { command: 'help', description: 'Как пользоваться приложением' },
        ],
    });
    await botFetch('setMyDescription', {
        description: '🕯 Язык Пламени — полная энциклопедия свечной магии.\n\n' +
            'Подбор свечи по намерению, лунный календарь, ритуалы, дневник практик.\n\n' +
            'Нажмите кнопку ниже чтобы открыть приложение.',
    });
    await botFetch('setMyShortDescription', {
        short_description: '🕯 Энциклопедия свечной магии. Подбор свечи, ритуалы, лунный календарь.',
    });
    console.log('[bot] Настройка завершена');
}
async function handleBotUpdate(body) {
    if (!BOT_TOKEN || !TMA_URL)
        return;
    const message = body?.message;
    if (!message)
        return;
    const bot = new node_telegram_bot_api_1.default(BOT_TOKEN, { polling: false });
    const chatId = message.chat.id;
    const text = message.text ?? '';
    const openButton = {
        inline_keyboard: [[
                { text: '🕯 Открыть Язык Пламени', web_app: { url: TMA_URL } }
            ]]
    };
    try {
        if (text.startsWith('/start')) {
            await bot.sendMessage(chatId, '🕯 *Добро пожаловать в Язык Пламени*\n\n' +
                'Здесь вы найдёте:\n' +
                '• Подбор свечи по намерению\n' +
                '• Лунный календарь с рекомендациями\n' +
                '• Полную энциклопедию свечной магии\n' +
                '• Дневник практик\n\n' +
                'Нажмите кнопку ниже чтобы открыть приложение 👇', { parse_mode: 'Markdown', reply_markup: openButton });
        }
        else if (text.startsWith('/help')) {
            await bot.sendMessage(chatId, '📖 *Как пользоваться Язык Пламени*\n\n' +
                '*Луна* — фаза Луны сегодня и рекомендации по свечам\n\n' +
                '*Подбор* — введите намерение (например «Любовь» или «Деньги») ' +
                'и получите подходящую свечу, масло и камень\n\n' +
                '*Библиотека* — полная энциклопедия: история, цвета, масла, ритуалы\n\n' +
                '*Профиль* — ваш тариф и настройки уведомлений о фазах Луны\n\n' +
                '_Бесплатно: первые 5 глав и 3 подбора свечи в день._', { parse_mode: 'Markdown', reply_markup: openButton });
        }
        else if (!message.successful_payment) {
            // Любое другое текстовое сообщение — подсказка
            await bot.sendMessage(chatId, 'Нажмите кнопку «🕯 Открыть» внизу экрана или воспользуйтесь командой /start', { reply_markup: openButton });
        }
    }
    catch (err) {
        console.error('[bot] handleBotUpdate error:', err);
    }
}
