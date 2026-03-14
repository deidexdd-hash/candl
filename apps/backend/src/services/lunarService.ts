import cron from 'node-cron'
import SunCalc from 'suncalc'
import TelegramBot from 'node-telegram-bot-api'
import { prisma, redis } from '../index'

const bot = new TelegramBot(process.env.BOT_TOKEN!, { polling: false })
const TMA_URL = process.env.TMA_URL!

export type MoonPhase =
  | 'new_moon' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous'
  | 'full_moon' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent'

export function getMoonPhase(date: Date): MoonPhase {
  const { phase } = SunCalc.getMoonIllumination(date)
  if (phase < 0.025 || phase >= 0.975) return 'new_moon'
  if (phase < 0.25)  return 'waxing_crescent'
  if (phase < 0.275) return 'first_quarter'
  if (phase < 0.5)   return 'waxing_gibbous'
  if (phase < 0.525) return 'full_moon'
  if (phase < 0.75)  return 'waning_gibbous'
  if (phase < 0.775) return 'last_quarter'
  return 'waning_crescent'
}

export function getMoonPhaseRu(phase: MoonPhase): string {
  const map: Record<MoonPhase, string> = {
    new_moon: 'Новолуние', waxing_crescent: 'Растущий серп',
    first_quarter: 'Первая четверть', waxing_gibbous: 'Растущая Луна',
    full_moon: 'Полнолуние', waning_gibbous: 'Убывающая Луна',
    last_quarter: 'Последняя четверть', waning_crescent: 'Убывающий серп',
  }
  return map[phase]
}

const PHASE_TIPS: Record<MoonPhase, string> = {
  new_moon:        'Время сеять намерения. Зажгите чёрную или белую свечу, медитируйте, записывайте новые цели.',
  waxing_crescent: 'Луна набирает силу — начинайте новые дела. Подходят зелёные и розовые свечи.',
  first_quarter:   'Преодолевайте препятствия. Оранжевая или жёлтая свеча даст энергию действия.',
  waxing_gibbous:  'Активное время притяжения. Зажигайте зелёные, золотые, розовые свечи.',
  full_moon:       'Пик силы. Самое мощное время для ритуалов. Белая или серебристая свеча.',
  waning_gibbous:  'Начинайте отпускать лишнее. Серая или синяя свеча помогут.',
  last_quarter:    'Время очищения и прощения. Чёрная свеча — для завершения старого.',
  waning_crescent: 'Глубокое очищение. Дайте себе отдых перед новым циклом.',
}

const RECOMMENDATIONS: Record<MoonPhase, { candles: string[]; intentions: string[] }> = {
  new_moon:        { candles: ['Чёрная', 'Белая', 'Тёмно-синяя'],  intentions: ['Новые начала', 'Планирование', 'Медитация'] },
  waxing_crescent: { candles: ['Зелёная', 'Розовая', 'Оранжевая'], intentions: ['Рост', 'Привлечение', 'Здоровье'] },
  first_quarter:   { candles: ['Оранжевая', 'Жёлтая', 'Красная'],  intentions: ['Действие', 'Преодоление', 'Карьера'] },
  waxing_gibbous:  { candles: ['Зелёная', 'Золотая', 'Розовая'],   intentions: ['Деньги', 'Любовь', 'Изобилие'] },
  full_moon:       { candles: ['Белая', 'Серебристая', 'Золотая'],  intentions: ['Любовь', 'Успех', 'Ответы'] },
  waning_gibbous:  { candles: ['Серая', 'Синяя', 'Чёрная'],        intentions: ['Отпускание', 'Исцеление', 'Очищение'] },
  last_quarter:    { candles: ['Чёрная', 'Серая', 'Синяя'],        intentions: ['Завершение', 'Прощение', 'Карма'] },
  waning_crescent: { candles: ['Чёрная', 'Белая', 'Серебристая'],  intentions: ['Отдых', 'Подготовка', 'Сны'] },
}

interface NotificationWithUser {
  user: { telegramId: bigint; tier: string }
}

function phaseToDbField(phase: MoonPhase): string | null {
  if (phase === 'new_moon')  return 'onNewMoon'
  if (phase === 'full_moon') return 'onFullMoon'
  if (['waxing_crescent', 'first_quarter', 'waxing_gibbous'].includes(phase)) return 'onWaxing'
  if (['waning_gibbous', 'last_quarter', 'waning_crescent'].includes(phase))  return 'onWaning'
  return null
}

async function sendLunarNotifications(phase: MoonPhase) {
  const dbField = phaseToDbField(phase)
  if (!dbField) return

  const notifications = await prisma.lunarNotification.findMany({
    where: { enabled: true, [dbField]: true },
    include: { user: { select: { telegramId: true, tier: true } } },
  }) as NotificationWithUser[]

  const eligible = notifications.filter((n: NotificationWithUser) => n.user.tier !== 'free')
  if (eligible.length === 0) return

  const text = `🌙 *${getMoonPhaseRu(phase)}*\n\n${PHASE_TIPS[phase]}`
  const keyboard = { inline_keyboard: [[{ text: 'Открыть практику →', url: TMA_URL }]] }

  const BATCH = 30
  for (let i = 0; i < eligible.length; i += BATCH) {
    await Promise.allSettled(
      eligible.slice(i, i + BATCH).map((n: NotificationWithUser) =>
        bot.sendMessage(n.user.telegramId.toString(), text, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        })
      )
    )
    if (i + BATCH < eligible.length) await new Promise(r => setTimeout(r, 35))
  }

  console.log(`[lunar] Sent ${getMoonPhaseRu(phase)} to ${eligible.length} users`)
}

export function startLunarCron() {
  cron.schedule('0 * * * *', async () => {
    try {
      const phase = getMoonPhase(new Date())
      const lastPhase = await redis.get<string>('lunar:last_phase')
      if (phase === lastPhase) return

      await redis.set('lunar:last_phase', phase, { ex: 60 * 60 * 24 * 30 })

      const majorPhases: MoonPhase[] = ['new_moon', 'full_moon', 'waxing_gibbous', 'waning_gibbous']
      if (majorPhases.includes(phase)) {
        await sendLunarNotifications(phase)
      }
    } catch (err) {
      console.error('[lunar cron] Error:', err)
    }
  })
  console.log('[lunar] Cron started')
}

export function getLunarToday() {
  const now = new Date()
  const phase = getMoonPhase(now)
  const illumination = SunCalc.getMoonIllumination(now)
  const daysUntilFull = Math.round(((0.5 - illumination.phase + 1) % 1) * 29.53)
  return {
    phase,
    phaseRu: getMoonPhaseRu(phase),
    illumination: Math.round(illumination.fraction * 100) / 100,
    daysUntilFull,
    tip: PHASE_TIPS[phase],
    recommendations: RECOMMENDATIONS[phase],
  }
}
