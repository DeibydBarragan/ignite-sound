'use strict';

const config = require('../config');

/**
 * Escapes raw text so it cannot corrupt XML or SSML templates.
 * @param {string} text
 * @returns {string}
 */
function escapeXml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Cleans Discord-specific syntax, emojis, and long URLs into readable spoken text.
 * @param {string} rawText
 * @param {number} [maxLength]
 * @returns {string}
 */
function cleanDiscordText(rawText, maxLength = config.bot.maxTtsLength || 300) {
    if (!rawText || typeof rawText !== 'string') return '';

    let text = rawText
        // Replace user mentions <@123456789> or <@!123456789>
        .replace(/<@!?\d+>/g, 'un usuario')
        // Replace channel mentions <#123456789>
        .replace(/<#\d+>/g, 'un canal')
        // Replace role mentions <@&123456789>
        .replace(/<@&\d+>/g, 'un rol')
        // Replace custom emojis <:name:123456789> or animated emojis <a:name:123456789>
        .replace(/<a?:([a-zA-Z0-9_]+):\d+>/g, '$1')
        // Replace web links
        .replace(/https?:\/\/\S+/gi, 'un enlace')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();

    if (text.length > maxLength) {
        text = text.substring(0, maxLength).trim() + '...';
    }

    return text;
}

/**
 * Full sanitization pipeline for TTS synthesis.
 * @param {string} rawText
 * @param {number} [maxLength]
 * @returns {string}
 */
function sanitizeForTts(rawText, maxLength) {
    const cleaned = cleanDiscordText(rawText, maxLength);
    return escapeXml(cleaned);
}

module.exports = {
    escapeXml,
    cleanDiscordText,
    sanitizeForTts,
};
