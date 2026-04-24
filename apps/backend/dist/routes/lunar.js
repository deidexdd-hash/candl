"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.lunarRoutes = lunarRoutes;
exports.notificationsRoutes = notificationsRoutes;
exports.diaryRoutes = diaryRoutes;
const zod_1 = require("zod");
const index_1 = require("../index");
const lunarService_1 = require("../services/lunarService");
const tierGuard_1 = require("../middleware/tierGuard");
async function lunarRoutes(app) {
    // Текущая фаза — бесплатно
    app.get('/lunar/today', async () => (0, lunarService_1.getLunarToday)());
    // Фазы на месяц — Практик+
    app.get('/lunar/month', {
        preHandler: (0, tierGuard_1.requireTier)('practitioner')
    }, async () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const { getMoonPhase, getMoonPhaseRu } = await Promise.resolve().then(() => __importStar(require('../services/lunarService')));
        const SunCalc = (await Promise.resolve().then(() => __importStar(require('suncalc')))).default;
        const days = Array.from({ length: daysInMonth }, (_, i) => {
            const date = new Date(year, month, i + 1);
            const phase = getMoonPhase(date);
            const ill = SunCalc.getMoonIllumination(date);
            return {
                date: date.toISOString().split('T')[0],
                day: i + 1,
                phase,
                phaseRu: getMoonPhaseRu(phase),
                illumination: Math.round(ill.fraction * 100),
            };
        });
        return { year, month: month + 1, days };
    });
}
const notifSchema = zod_1.z.object({
    enabled: zod_1.z.boolean().optional(),
    onNewMoon: zod_1.z.boolean().optional(),
    onFullMoon: zod_1.z.boolean().optional(),
    onWaxing: zod_1.z.boolean().optional(),
    onWaning: zod_1.z.boolean().optional(),
});
async function notificationsRoutes(app) {
    app.get('/notifications/settings', async (request) => {
        const { userId } = request.user;
        const notif = await index_1.prisma.lunarNotification.findUnique({ where: { userId } });
        return notif ?? { enabled: false };
    });
    app.patch('/notifications/settings', {
        preHandler: (0, tierGuard_1.requireTier)('practitioner') // уведомления — Практик+
    }, async (request) => {
        const { userId } = request.user;
        const data = notifSchema.parse(request.body);
        const notif = await index_1.prisma.lunarNotification.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
        });
        return notif;
    });
}
// diary stub
async function diaryRoutes(app) {
    const diaryEntrySchema = zod_1.z.object({
        entryDate: zod_1.z.string(),
        intention: zod_1.z.string().min(1).max(500),
        candleColor: zod_1.z.string().optional(),
        oils: zod_1.z.string().optional(),
        moonPhase: zod_1.z.string().optional(),
        result: zod_1.z.string().optional(),
    });
    app.get('/diary', {
        preHandler: (0, tierGuard_1.requireTier)('master')
    }, async (request) => {
        const { userId } = request.user;
        const entries = await index_1.prisma.diaryEntry.findMany({
            where: { userId },
            orderBy: { entryDate: 'desc' },
            take: 100,
        });
        return { entries };
    });
    app.post('/diary', {
        preHandler: (0, tierGuard_1.requireTier)('master')
    }, async (request) => {
        const { userId } = request.user;
        const data = diaryEntrySchema.parse(request.body);
        const entry = await index_1.prisma.diaryEntry.create({
            data: { userId, ...data, entryDate: new Date(data.entryDate) }
        });
        return entry;
    });
    app.patch('/diary/:id', {
        preHandler: (0, tierGuard_1.requireTier)('master')
    }, async (request, reply) => {
        const { userId } = request.user;
        const { id } = request.params;
        const data = diaryEntrySchema.partial().parse(request.body);
        const entry = await index_1.prisma.diaryEntry.findFirst({ where: { id, userId } });
        if (!entry)
            return reply.code(404).send({ error: 'Запись не найдена', code: 'NOT_FOUND', statusCode: 404 });
        return index_1.prisma.diaryEntry.update({ where: { id }, data: data });
    });
    app.delete('/diary/:id', {
        preHandler: (0, tierGuard_1.requireTier)('master')
    }, async (request, reply) => {
        const { userId } = request.user;
        const { id } = request.params;
        const entry = await index_1.prisma.diaryEntry.findFirst({ where: { id, userId } });
        if (!entry)
            return reply.code(404).send({ error: 'Запись не найдена', code: 'NOT_FOUND', statusCode: 404 });
        await index_1.prisma.diaryEntry.delete({ where: { id } });
        return { ok: true };
    });
}
