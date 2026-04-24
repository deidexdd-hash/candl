"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTier = requireTier;
exports.hasAccess = hasAccess;
const index_1 = require("../index");
const TIER_ORDER = {
    free: 0, practitioner: 1, master: 2, annual: 3,
};
function requireTier(minTier) {
    return async (request, reply) => {
        const { userId } = request.user;
        const user = await index_1.prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
        if (!user)
            return reply.code(401).send({ error: 'User not found', code: 'UNAUTHORIZED', statusCode: 401 });
        if (TIER_ORDER[user.tier] < TIER_ORDER[minTier]) {
            return reply.code(403).send({
                error: `Требуется тариф ${minTier}`,
                code: 'TIER_REQUIRED',
                requiredTier: minTier,
                statusCode: 403,
            });
        }
    };
}
function hasAccess(userTier, minTier) {
    return TIER_ORDER[userTier] >= TIER_ORDER[minTier];
}
