import cron from 'node-cron'
import SunCalc from 'suncalc'
import TelegramBot from 'node-telegram-bot-api'
import { prisma } from '../index'

function getBot(): TelegramBot | null {
  const token = process.env.BOT_TOKEN
  if (!token) return null
  return new TelegramBot(token, { polling: false })
}

const TMA_URL = process.env.TMA_URL ?? ''

export type MoonPhase =
  | 'new_moon' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous'
  | 'full_moon' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent'

// ─── ИСПРАВЛЕНО: реалистичные полосы фаз ────────────────────────────────────
// SunCalc.phase: 0 = новолуние, 0.5 = полнолуние, 1 = новолуние
// Каждая переходная фаза (четверть) занимает ~1.5 дня = ~5% цикла
// Остальные фазы равномерно делят оставшиеся ~88%
export function getMoonPhase(date: Date): MoonPhase {
  const { phase } = SunCalc.getMoonIllumination(date)
  if (phase < 0.033 || phase >= 0.967) return 'new_moon'        // ~2 дня
  if (phase < 0.22)                    return 'waxing_crescent'  // ~5.5 дней
  if (phase < 0.30)                    return 'first_quarter'    // ~2.5 дня
  if (phase < 0.47)                    return 'waxing_gibbous'   // ~5 дней
  if (phase < 0.53)                    return 'full_moon'        // ~2 дня
  if (phase < 0.72)                    return 'waning_gibbous'   // ~5.5 дней
  if (phase < 0.80)                    return 'last_quarter'     // ~2.5 дня
  return 'waning_crescent'                                       // ~5 дней
}

export function getMoonPhaseRu(phase: MoonPhase): string {
  const map: Record<MoonPhase, string> = {
    new_moon:        'Новолуние',
    waxing_crescent: 'Растущий серп',
    first_quarter:   'Первая четверть',
    waxing_gibbous:  'Растущая Луна',
    full_moon:       'Полнолуние',
    waning_gibbous:  'Убывающая Луна',
    last_quarter:    'Последняя четверть',
    waning_crescent: 'Убывающий серп',
  }
  return map[phase]
}

// ─── ИСПРАВЛЕНО: советы соответствуют традиционной логике ───────────────────
const PHASE_TIPS: Record<MoonPhase, string> = {
  new_moon:
    'Время посева намерений. Луна невидима — энергия обращена внутрь. ' +
    'Медитируйте, записывайте цели. Зажгите белую или серебряную свечу. ' +
    'Сейчас не время начинать внешние действия — только внутренний посев.',

  waxing_crescent:
    'Луна начинает расти — пора делать первые шаги. ' +
    'Начинайте новые дела, делайте первые звонки и встречи. ' +
    'Зелёная или оранжевая свеча поддержат движение и рост.',

  first_quarter:
    'Луна на полпути к полнолунию — и путь не всегда прост. ' +
    'Это время сопротивления и выбора: продолжать или отступить. ' +
    'Оранжевая или красная свеча даст решимость преодолеть препятствия.',

  waxing_gibbous:
    'Лучшее время для практик притяжения — энергия на подъёме перед кульминацией. ' +
    'Зажигайте зелёные и золотые свечи для денег, розовые — для любви. ' +
    'Намерения, поставленные сейчас, достигнут пика на полнолуние.',

  full_moon:
    'Кульминация цикла. Не время начинать новое — время завершать и благодарить. ' +
    'Заряжайте кристаллы под лунным светом, выражайте благодарность. ' +
    'Белая или серебряная свеча. Эмоции сейчас обострены — важные решения отложите.',

  waning_gibbous:
    'Луна начинает убывать — время отпускать то, что больше не служит. ' +
    'Работайте с избавлением от вредных привычек, токсичных паттернов и обид. ' +
    'Синяя или серая свеча поможет мягко расстаться с лишним.',

  last_quarter:
    'Время глубокого прощения и принятия. Что вы готовы отпустить навсегда? ' +
    'Серая или синяя свеча — для мягкого завершения. ' +
    'Чёрная — только если нужна серьёзная работа с тенью или завершение тяжёлого.',

  waning_crescent:
    'Луна почти невидима — время тишины и восстановления. ' +
    'Отдыхайте, наблюдайте за снами, подводите итоги цикла. ' +
    'Белая или серебряная свеча. Сейчас не время для активных ритуалов — только покой.',
}

// ─── ИСПРАВЛЕНО: рекомендации согласованы с логикой фаз ─────────────────────
const RECOMMENDATIONS: Record<MoonPhase, { candles: string[]; intentions: string[] }> = {
  new_moon: {
    candles:    ['Белая', 'Серебряная', 'Тёмно-синяя'],
    intentions: ['Намерения', 'Медитация', 'Планирование'],
  },
  waxing_crescent: {
    candles:    ['Зелёная', 'Оранжевая', 'Розовая'],
    intentions: ['Новые начала', 'Привлечение', 'Рост'],
  },
  first_quarter: {
    candles:    ['Оранжевая', 'Красная', 'Жёлтая'],
    intentions: ['Действие', 'Преодоление', 'Смелость'],
  },
  waxing_gibbous: {
    candles:    ['Зелёная', 'Золотая', 'Розовая'],
    intentions: ['Деньги', 'Любовь', 'Изобилие'],
  },
  full_moon: {
    candles:    ['Белая', 'Серебряная', 'Золотая'],
    intentions: ['Благодарность', 'Завершение', 'Манифестация'],
  },
  waning_gibbous: {
    candles:    ['Синяя', 'Серая', 'Белая'],
    intentions: ['Отпускание', 'Исцеление', 'Очищение'],
  },
  last_quarter: {
    candles:    ['Серая', 'Синяя', 'Чёрная'],
    intentions: ['Прощение', 'Завершение', 'Принятие'],
  },
  waning_crescent: {
    candles:    ['Белая', 'Серебряная', 'Синяя'],
    intentions: ['Покой', 'Сны', 'Восстановление'],
  },
}

// ─── Уведомления и cron (без изменений) ──────────────────────────────────────

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

  const bot = getBot()
  if (!bot || !TMA_URL) {
    console.warn('[lunar] BOT_TOKEN или TMA_URL не заданы — уведомления пропущены')
    return
  }

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
      const cronState = await prisma.cronState.findUnique({ where: { key: 'lunar:last_phase' } })
      const lastPhase = cronState?.value ?? null

      if (phase === lastPhase) return

      await prisma.cronState.upsert({
        where:  { key: 'lunar:last_phase' },
        create: { key: 'lunar:last_phase', value: phase },
        update: { value: phase },
      })

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
  const now          = new Date()
  const phase        = getMoonPhase(now)
  const illumination = SunCalc.getMoonIllumination(now)
  // Дни до полнолуния: phase 0.5 = полнолуние
  const daysUntilFull = Math.round(((0.5 - illumination.phase + 1) % 1) * 29.53)
  return {
    phase,
    phaseRu:         getMoonPhaseRu(phase),
    illumination:    Math.round(illumination.fraction * 100) / 100,
    daysUntilFull,
    tip:             PHASE_TIPS[phase],
    recommendations: RECOMMENDATIONS[phase],
  }
}
