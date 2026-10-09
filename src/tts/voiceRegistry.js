'use strict';

/**
 * Catálogo curado de voces populares para autocompletado y selección rápida en Discord y el Dashboard.
 */
const VOICES = [
    // ─── Loquendo Clásico & Especiales ────────────────────────
    {
        id: 'loquendo',
        name: 'Loquendo (Jorge)',
        gender: 'Masculino',
        lang: 'es-ES',
        flag: '🇪🇸',
        provider: 'loquendo',
        description: 'Voz clásica y legendaria de Jorge de Loquendo.',
    },
    {
        id: 'loquendo-carlos',
        name: 'Loquendo (Carlos)',
        gender: 'Masculino',
        lang: 'es-ES',
        flag: '🇪🇸',
        provider: 'loquendo',
        description: 'Voz clásica de Carlos de Loquendo.',
    },

    // ─── Microsoft Neural (Español) ───────────────────────────
    {
        id: 'es-MX-DaliaNeural',
        name: 'Dalia (México)',
        gender: 'Femenino',
        lang: 'es-MX',
        flag: '🇲🇽',
        provider: 'edge',
        description: 'Voz neuronal suave y ultra natural mexicana.',
    },
    {
        id: 'es-MX-JorgeNeural',
        name: 'Jorge Neural (México)',
        gender: 'Masculino',
        lang: 'es-MX',
        flag: '🇲🇽',
        provider: 'edge',
        description: 'Voz masculina mexicana cálida y formal.',
    },
    {
        id: 'es-ES-AlvaroNeural',
        name: 'Álvaro (España)',
        gender: 'Masculino',
        lang: 'es-ES',
        flag: '🇪🇸',
        provider: 'edge',
        description: 'Voz neuronal masculina natural de España.',
    },
    {
        id: 'es-ES-ElviraNeural',
        name: 'Elvira (España)',
        gender: 'Femenino',
        lang: 'es-ES',
        flag: '🇪🇸',
        provider: 'edge',
        description: 'Voz neuronal femenina expresiva de España.',
    },
    {
        id: 'es-AR-TomasNeural',
        name: 'Tomás (Argentina)',
        gender: 'Masculino',
        lang: 'es-AR',
        flag: '🇦🇷',
        provider: 'edge',
        description: 'Voz neuronal masculina con acento argentino.',
    },
    {
        id: 'es-CO-GonzaloNeural',
        name: 'Gonzalo (Colombia)',
        gender: 'Masculino',
        lang: 'es-CO',
        flag: '🇨🇴',
        provider: 'edge',
        description: 'Voz neuronal masculina colombiana.',
    },
    {
        id: 'es-CL-LorenzoNeural',
        name: 'Lorenzo (Chile)',
        gender: 'Masculino',
        lang: 'es-CL',
        flag: '🇨🇱',
        provider: 'edge',
        description: 'Voz neuronal masculina chilena.',
    },
    {
        id: 'es-PE-AlexNeural',
        name: 'Alex (Perú)',
        gender: 'Masculino',
        lang: 'es-PE',
        flag: '🇵🇪',
        provider: 'edge',
        description: 'Voz neuronal masculina peruana.',
    },
    {
        id: 'es-US-AlonsoNeural',
        name: 'Alonso (EE. UU. Latino)',
        gender: 'Masculino',
        lang: 'es-US',
        flag: '🇺🇸',
        provider: 'edge',
        description: 'Voz neuronal neutra masculina en español.',
    },

    // ─── Microsoft Neural (Inglés) ────────────────────────────
    {
        id: 'en-US-JennyNeural',
        name: 'Jenny (EE. UU.)',
        gender: 'Femenino',
        lang: 'en-US',
        flag: '🇺🇸',
        provider: 'edge',
        description: 'Voz en inglés estándar de alta claridad.',
    },
    {
        id: 'en-US-GuyNeural',
        name: 'Guy (EE. UU.)',
        gender: 'Masculino',
        lang: 'en-US',
        flag: '🇺🇸',
        provider: 'edge',
        description: 'Voz masculina casual en inglés americano.',
    },
    {
        id: 'en-GB-RyanNeural',
        name: 'Ryan (Reino Unido)',
        gender: 'Masculino',
        lang: 'en-GB',
        flag: '🇬🇧',
        provider: 'edge',
        description: 'Voz masculina con acento británico.',
    },
];

const getVoiceById = (id) => {
    if (!id) return null;
    const clean = id.trim().toLowerCase();
    return VOICES.find((v) => v.id.toLowerCase() === clean || v.name.toLowerCase().includes(clean)) || null;
};

const getAllVoices = () => VOICES;

module.exports = {
    VOICES,
    getVoiceById,
    getAllVoices,
};
