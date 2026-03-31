import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { prisma } from '../index'
import { getLunarToday } from '../services/lunarService'
import type { Tier } from '../middleware/tierGuard'

const DAILY_LIMITS: Record<Tier, number> = {
  free: 0, practitioner: 5, master: 15, annual: 30,
}

const SYSTEM_PROMPT = `Ты — Огонь, ИИ-помощник приложения «Язык Пламени».
Ты эксперт по свечной магии, дивинации, лунным практикам и народным традициям работы с огнём. Говоришь только по-русски.

Знания: цвета свечей и их соответствия (чакры, планеты, намерения, масла, камни), лунные фазы и ритуалы, ароматические масла и травы, кристаллы, программирование намерений (5 законов), ритуалы (финансовые, любовные, защита, очищение, родовые), церомантия, алтарная работа, изготовление свечей, скручивание и нумерология, народные традиции (русская, скандинавская, кельтская, финская, германская), трансгенерационные практики.

Стиль: тёплый, мудрый, конкретный. Давай точные рекомендации (цвет, масло, камень, фаза, день). Отвечай 3–6 предложений. Используй эмодзи умеренно: 🕯 🌙 ✦ 🌿. Если вопрос неясен — задай один уточняющий вопрос. Не давай медицинских и юридических советов.`

// ─── Rule-based fallback — работает без Gemini API ───────────────────────────

const RULES: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['деньги','финансы','достаток','богатство','доход','процветание','прибыль'],
    answer: `🕯 Для финансовых намерений:\n\n✦ Цвет — зелёная или золотая свеча\n✦ Масло — базилик, пачули или корица\n✦ Камень — пирит, авантюрин или цитрин\n✦ День — четверг (Юпитер) или воскресенье\n✦ Фаза — растущая Луна до полнолуния\n\nНамерение в настоящем времени: «Деньги приходят ко мне легко из множества источников». Поставьте монету или купюру рядом со свечой как физический якорь.`,
  },
  {
    keywords: ['любовь','отношения','партнёр','романтика','встреча','привлечь','сердце'],
    answer: `🕯 Для любовных намерений:\n\n✦ Цвет — розовая (самолюбовь, нежность) или красная (страсть, союз)\n✦ Масло — роза, жасмин или иланг-иланг\n✦ Камень — розовый кварц или родонит\n✦ День — пятница (Венера)\n✦ Фаза — растущая Луна\n\nРаботайте только со своим полем: описывайте качества и ощущения от отношений, не называйте имён. «Я в тёплых, уважительных отношениях, где меня видят и принимают».`,
  },
  {
    keywords: ['защита','очищение','сглаз','негатив','чистка','очистить','порча','отвести'],
    answer: `🕯 Для защиты и очищения:\n\n✦ Цвет — белая (мягкое) или чёрная (мощная защита)\n✦ Масло — ладан, шалфей или можжевельник\n✦ Камень — чёрный турмалин или обсидиан\n✦ День — суббота (Сатурн)\n✦ Фаза — убывающая Луна или новолуние\n\nДля дома: зажгите белую свечу, пройдите по часовой стрелке с благовониями, уделяя внимание углам. Соль вдоль порога — физический защитный барьер.`,
  },
  {
    keywords: ['здоровье','исцеление','болезнь','сила','энергия','восстановление','самочувствие'],
    answer: `🕯 Для здоровья и восстановления:\n\n✦ Цвет — синяя или белая свеча\n✦ Масло — лаванда, эвкалипт или розмарин\n✦ Камень — прозрачный кварц или аквамарин\n✦ День — понедельник или воскресенье\n✦ Фаза — убывающая (работа с болезнью) или растущая (восстановление сил)\n\nВо время ритуала положите ладонь на область, требующую внимания. Намерение: «Моё тело сильное, здоровое, полное энергии».`,
  },
  {
    keywords: ['карьера','работа','успех','признание','повышение','бизнес','проект','цель'],
    answer: `🕯 Для карьеры и достижений:\n\n✦ Цвет — золотая или оранжевая свеча\n✦ Масло — ладан, апельсин или имбирь\n✦ Камень — тигровый глаз или пирит\n✦ День — воскресенье (Солнце) или четверг\n✦ Фаза — растущая Луна\n\nДержите рядом визитку, договор или символ вашего дела. Намерение: «Мои таланты ценят и замечают. Мой труд приносит достойное вознаграждение».`,
  },
  {
    keywords: ['духовность','медитация','интуиция','развитие','рост','сны','осознанность'],
    answer: `🕯 Для духовных практик:\n\n✦ Цвет — фиолетовая или белая свеча\n✦ Масло — ладан, сандал или мирра\n✦ Камень — аметист или лабрадорит\n✦ День — четверг или понедельник\n✦ Фаза — полнолуние или убывающая Луна\n\nПопробуйте тратаку — смотрите на кончик пламени без моргания 3–5 минут. Это тренирует концентрацию и открывает интуицию.`,
  },
  {
    keywords: ['предки','род','родовой','семья','поминание','родители','прародители'],
    answer: `🕯 Для родовых практик:\n\n✦ Три линии: золотая (отец), белая (мать), зелёная (ваш путь)\n✦ Масло — мирра и пачули\n✦ Камень — обсидиан или тигровый глаз\n✦ День — суббота\n✦ Фаза — убывающая Луна или новолуние\n\nНачните с благодарности: «Я благодарю всех предков, которые желали мне добра». Меняйте воду на алтаре ежедневно — она вбирает тяжёлое.`,
  },
  {
    keywords: ['новолуние','полнолуние','луна','фаза','лунный','растущая','убывающая','лунная'],
    answer: `🌙 Лунный справочник:\n\n🌑 Новолуние — посев намерений → белая/чёрная\n🌒 Растущий серп — начало действий → зелёная/оранжевая\n🌓 Первая четверть — преодоление → красная/жёлтая\n🌔 Растущая — притяжение → зелёная/золотая\n🌕 Полнолуние — пик силы, благодарность → белая/серебряная\n🌖 Убывающая — отпускание → синяя/серая\n🌗 Последняя четверть — завершение → чёрная\n🌘 Убывающий серп — покой → белая\n\nСовет: полнолуние — время не просить, а благодарить за то, что уже есть.`,
  },
  {
    keywords: ['какую свечу','выбрать свечу','подобрать','цвет свечи','какой цвет','помоги выбрать'],
    answer: `🕯 Три способа выбрать цвет:\n\n✦ По намерению: деньги→зелёная, любовь→розовая, защита→белая/чёрная, карьера→золотая, духовность→фиолетовая, мир→синяя\n✦ По дню: пн=белая, вт=красная, ср=жёлтая, чт=фиолетовая, пт=зелёная/розовая, сб=чёрная, вс=золотая\n✦ Интуитивно: закройте глаза на 10 секунд, подумайте о запросе. Первый цвет который притянет взгляд — ваш\n\nЕсли нужного цвета нет — белая свеча заменит любой при чётком намерении.`,
  },
  {
    keywords: ['воск','отливка','церомантия','форма воска','гадание','олово','молибдомантия'],
    answer: `🪄 Церомантия — чтение воска:\n\n✦ Наклоните горящую свечу над миской с холодной водой\n✦ Выливайте 3–9 капель, каждую после застывания\n✦ Читайте по 5 уровням: первое впечатление → поверхность → расположение в миске → символ → синтез\n\nОсновные символы: круг=завершённость, птица=новость, рыба=изобилие, змея=трансформация, якорь=опора придёт, сердце=любовь. Контекст вопроса важнее словаря — рыба в вопросе о деньгах читается иначе, чем в вопросе об отношениях.`,
  },
  {
    keywords: ['масло','аромат','благовония','эфирное'],
    answer: `🌿 Выбор масла для свечи:\n\n✦ Деньги: базилик, пачули, корица, мята\n✦ Любовь: роза, жасмин, иланг-иланг, нероли\n✦ Защита: ладан, мирра, можжевельник, шалфей\n✦ Успех: апельсин, имбирь, ладан, бергамот\n✦ Покой: лаванда, сандал, ромашка, мелисса\n✦ Духовность: ладан, мирра, сандал\n\nНаносите от центра к концам свечи для привлечения, от концов к центру — для завершения и отпускания. Достаточно 5–7 капель на свечу.`,
  },
  {
    keywords: ['камень','кристалл','минерал','самоцвет'],
    answer: `💎 Камни к свечам:\n\n✦ Белая свеча → прозрачный кварц, лунный камень, селенит\n✦ Зелёная → авантюрин, малахит, нефрит, изумруд\n✦ Золотая → пирит, тигровый глаз, цитрин\n✦ Розовая → розовый кварц, родонит\n✦ Синяя → лазурит, аквамарин, содалит\n✦ Чёрная → чёрный турмалин, обсидиан, оникс\n✦ Фиолетовая → аметист, флюорит, чароит\n\nПоложите камень рядом с основанием свечи. Прозрачный кварц — универсальный усилитель для любого намерения.`,
  },
]

function ruleBasedAnswer(query: string): string {
  const q = query.toLowerCase()
  const match = RULES.find(r => r.keywords.some(k => q.includes(k)))
  return match?.answer ?? `🕯 Расскажите подробнее о своём намерении — чего вы хотите достичь или от чего освободиться? Тогда смогу дать точную рекомендацию по свече, маслу, фазе луны и формулировке.`
}

// ─── Роуты ────────────────────────────────────────────────────────────────────

const askSchema = z.object({
  messages: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2000),
  })).min(1).max(20),
})

export async function assistantRoutes(app: FastifyInstance) {

  const GEMINI_KEY   = process.env.GEMINI_API_KEY
  const geminiClient = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null

  console.log(geminiClient
    ? '[assistant] Gemini Flash — активен'
    : '[assistant] Rule-based режим (GEMINI_API_KEY не задан)'
  )

  // ── GET /assistant/usage ──────────────────────────────────────────────────────
  app.get('/assistant/usage', async (request) => {
    const { userId } = request.user as { userId: string }
    const user  = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
    const tier  = (user?.tier ?? 'free') as Tier
    const limit = DAILY_LIMITS[tier]
    if (limit === 0) return { used: 0, limit: 0 }

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const usage = await prisma.aiUsage.findUnique({
      where: { userId_usageDate: { userId, usageDate: today } },
    })
    return { used: usage?.count ?? 0, limit }
  })

  // ── POST /assistant/ask ───────────────────────────────────────────────────────
  app.post('/assistant/ask', async (request, reply) => {
    const { userId } = request.user as { userId: string }

    const user  = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true, firstName: true } })
    const tier  = (user?.tier ?? 'free') as Tier
    const limit = DAILY_LIMITS[tier]

    if (limit === 0) {
      return reply.code(403).send({ error: 'ИИ-помощник доступен с тарифа Практик', code: 'TIER_REQUIRED', statusCode: 403 })
    }

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const usageRecord = await prisma.aiUsage.findUnique({
      where: { userId_usageDate: { userId, usageDate: today } },
    })
    const usedToday = usageRecord?.count ?? 0

    if (usedToday >= limit) {
      return reply.code(429).send({
        error: `Лимит на сегодня исчерпан (${limit} вопросов). Возвращайтесь завтра.`,
        code: 'LIMIT_REACHED', statusCode: 429,
      })
    }

    const { messages } = askSchema.parse(request.body)
    const lastUserMsg  = messages.filter(m => m.role === 'user').at(-1)?.content ?? ''

    let lunarCtx = ''
    try {
      const l = getLunarToday()
      lunarCtx = `\nСейчас: ${l.phaseRu}, освещённость ${Math.round(l.illumination * 100)}%. ${l.tip}`
    } catch {}

    let answer: string

    if (geminiClient) {
      try {
        const model = geminiClient.getGenerativeModel({
          model: 'gemini-1.5-flash',
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          ],
          systemInstruction: SYSTEM_PROMPT + lunarCtx +
            (user?.firstName ? `\nИмя пользователя: ${user.firstName}.` : '') +
            `\nТариф: ${tier}.`,
        })

        const history = messages.slice(0, -1).map(m => ({
          role:  m.role === 'assistant' ? 'model' as const : 'user' as const,
          parts: [{ text: m.content }],
        }))

        const chat   = model.startChat({ history })
        const result = await chat.sendMessage(lastUserMsg)
        answer = result.response.text()

      } catch (err: any) {
        console.error('[assistant] Gemini error, falling back:', err?.message ?? err)
        answer = ruleBasedAnswer(lastUserMsg)
      }
    } else {
      answer = ruleBasedAnswer(lastUserMsg)
    }

    const newCount = usedToday + 1
    await prisma.aiUsage.upsert({
      where:  { userId_usageDate: { userId, usageDate: today } },
      create: { userId, usageDate: today, count: 1, dailyLimit: limit },
      update: { count: newCount },
    })

    return { answer, usage: { used: newCount, limit } }
  })
}
