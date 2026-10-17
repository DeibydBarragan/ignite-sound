'use strict';

const { z } = require('zod');
const { sendProblem } = require('../contracts');
const config = require('../../config');

const SNOWFLAKE_PATTERN = /^\d{17,20}$/;
const SOUND_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const snowflake = z.string().regex(SNOWFLAKE_PATTERN, 'must be a Discord snowflake (17-20 digits)');
const optionalSnowflake = z.union([z.literal(''), z.null(), snowflake]).optional();
const soundId = z.string().regex(SOUND_ID_PATTERN, 'must be a valid sound id');

const schemas = {
    params: {
        soundId: z.object({ id: soundId }),
    },
    body: {
        ttsSpeak: z.object({
            text: z.string().trim().min(1, 'El campo "text" es obligatorio.').max(config.bot.maxTtsLength || 300),
            guildId: optionalSnowflake,
            channelId: optionalSnowflake,
            voice: z.string().trim().max(100).optional(),
            rate: z.union([z.string().max(20), z.number()]).optional(),
            pitch: z.union([z.string().max(20), z.number()]).optional(),
        }),
        ttsPreview: z.object({
            text: z.string().trim().min(1, 'El campo "text" es obligatorio.').max(config.bot.maxTtsLength || 300),
            voice: z.string().trim().max(100).optional(),
            rate: z.union([z.string().max(20), z.number()]).optional(),
            pitch: z.union([z.string().max(20), z.number()]).optional(),
        }),
        soundPlay: z.object({
            soundId: z.string().trim().min(1, 'El campo "soundId" es obligatorio.').max(64),
            guildId: optionalSnowflake,
            channelId: optionalSnowflake,
            volume: z.coerce.number().min(1).max(100).optional(),
        }),
        soundUpdate: z.object({
            name: z.string().trim().min(1, 'El nombre no puede estar vacío.').max(60).optional(),
            emoji: z.string().trim().max(10).optional(),
            category: z.enum(['memes', 'gaming', 'reactions', 'sfx', 'anime']).optional(),
            uploadedBy: optionalSnowflake,
        }),
        soundUploadMeta: z.object({
            name: z.string().trim().min(1, 'El campo "name" es obligatorio.').max(60),
            emoji: z.string().trim().max(10).optional(),
            category: z.enum(['memes', 'gaming', 'reactions', 'sfx', 'anime']).optional(),
            duration: z.coerce.number().min(1).max(30).optional(),
            userId: optionalSnowflake,
        }),
    },
};

function firstIssue(error) {
    const issue = error.issues?.[0];
    if (!issue) return 'invalid value';
    const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
}

function validate(schema, source, code) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req[source]);
        if (!parsed.success) {
            return sendProblem(res, 400, code, firstIssue(parsed.error));
        }
        req.validated ??= {};
        req.validated[source] = parsed.data;
        return next();
    };
}

const validateParams = (schema, code = 'INVALID_PARAMETER') => validate(schema, 'params', code);
const validateBody = (schema, code = 'INVALID_BODY') => validate(schema, 'body', code);
const validateQuery = (schema, code = 'INVALID_QUERY') => validate(schema, 'query', code);

module.exports = {
    z,
    snowflake,
    soundId,
    schemas,
    validateParams,
    validateBody,
    validateQuery,
};
