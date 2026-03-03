// Pokemon sprite configuration using PokeAPI/sprites
// Badges: https://github.com/PokeAPI/sprites/tree/master/sprites/badges

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const BADGE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges';

/** Get the front-facing sprite URL for a Pokemon by national dex ID */
export function spriteUrl(id: number | string): string {
  return `${SPRITE_BASE}/${id}.png`;
}

/** Get the animated showdown sprite (GIF) — moving sprite used on the board */
export function spriteAnimatedUrl(id: number | string): string {
  return `${SPRITE_BASE}/other/showdown/${id}.gif`;
}

/** Gen V Black/White animated (alternative; use for board if preferred) */
export function spriteAnimatedGen5Url(id: number | string): string {
  return `${SPRITE_BASE}/versions/generation-v/black-white/animated/${id}.gif`;
}

/** Get the high-res official artwork (clean, no pixels) */
export function spriteArtworkUrl(id: number | string): string {
  return `${SPRITE_BASE}/other/official-artwork/${id}.png`;
}

/** Get the back-facing sprite */
export function spriteBackUrl(id: number | string): string {
  return `${SPRITE_BASE}/back/${id}.png`;
}

/** Get badge image URL by id (1–69, Kanto/Johto etc.) */
export function badgeUrl(id: number | string): string {
  return `${BADGE_BASE}/${id}.png`;
}

/** Badge id per module type (for headers, panels, UI accents) */
export const MODULE_BADGE_IDS: Record<string, number> = {
  calendar: 4,   // Rainbow
  tasks: 1,      // Boulder
  notes: 3,      // Thunder
  travel: 5,     // Soul
  gym: 2,        // Cascade
  shopping: 6,   // Marsh
};

/** Badge shown in city header (generic PokéCity badge) */
export const HEADER_BADGE_ID = 25;

/** The player's Pokemon — Pikachu */
export const PLAYER_POKEMON_ID = 25;

/** 6 element sprites: water, fire, lightning, grass, rock, ghost — mapped to canonical Pokémon */
export const ELEMENT_SPRITE_IDS: Record<string, number> = {
  water: 7,      // Squirtle
  fire: 4,       // Charmander
  lightning: 25, // Pikachu
  grass: 1,      // Bulbasaur
  rock: 95,      // Onix
  ghost: 94,     // Gengar
};

/** Pokemon assigned to each house/module type (one element per type) */
export const MODULE_POKEMON: Record<string, number> = {
  calendar: ELEMENT_SPRITE_IDS.grass,    // grass — Bulbasaur
  tasks: ELEMENT_SPRITE_IDS.fire,       // fire — Charmander
  notes: ELEMENT_SPRITE_IDS.lightning,   // lightning — Pikachu
  travel: ELEMENT_SPRITE_IDS.water,      // water — Squirtle
  gym: ELEMENT_SPRITE_IDS.rock,          // rock — Onix
  shopping: ELEMENT_SPRITE_IDS.ghost,    // ghost — Gengar
};

/** Most popular Pokémon (2024 polls: Pikachu, Charizard, Eevee, Umbreon, Gengar, Bulbasaur, Gardevoir, etc.) + varied pool */
export const RESIDENT_POKEMON_IDS = [
  1,    // Bulbasaur
  4,    // Charmander
  6,    // Charizard
  7,    // Squirtle
  25,   // Pikachu
  35,   // Clefairy
  39,   // Jigglypuff
  54,   // Psyduck
  63,   // Abra
  94,   // Gengar
  79,   // Slowpoke
  104,  // Cubone
  129,  // Magikarp
  133,  // Eevee
  147,  // Dratini
  150,  // Mewtwo
  152,  // Chikorita
  155,  // Cyndaquil
  158,  // Totodile
  172,  // Pichu
  175,  // Togepi
  196,  // Espeon
  197,  // Umbreon
  246,  // Larvitar
  252,  // Treecko
  255,  // Torchic
  258,  // Mudkip
  280,  // Ralts
  282,  // Gardevoir
  304,  // Aron
  330,  // Flygon
  363,  // Spheal
  387,  // Turtwig
  390,  // Chimchar
  393,  // Piplup
  403,  // Shinx
  447,  // Riolu
  495,  // Snivy
  501,  // Oshawott
];

/** Display name by national dex ID (for dialogue speaker and UI) */
export const POKEMON_NAMES: Record<number, string> = {
  1: 'Bulbasaur', 4: 'Charmander', 6: 'Charizard', 7: 'Squirtle', 25: 'Pikachu',
  35: 'Clefairy', 39: 'Jigglypuff', 54: 'Psyduck', 63: 'Abra', 79: 'Slowpoke',
  94: 'Gengar', 104: 'Cubone', 129: 'Magikarp', 133: 'Eevee', 147: 'Dratini',
  150: 'Mewtwo', 152: 'Chikorita', 155: 'Cyndaquil', 158: 'Totodile', 172: 'Pichu',
  175: 'Togepi', 196: 'Espeon', 197: 'Umbreon', 246: 'Larvitar', 252: 'Treecko',
  255: 'Torchic', 258: 'Mudkip', 280: 'Ralts', 282: 'Gardevoir', 304: 'Aron',
  330: 'Flygon', 363: 'Spheal', 387: 'Turtwig', 390: 'Chimchar', 393: 'Piplup',
  403: 'Shinx', 447: 'Riolu', 495: 'Snivy', 501: 'Oshawott',
};

/** Dialogue by Pokémon ID — speaker and text match the sprite shown in the panel */
export const POKEMON_DIALOGUES: Record<number, { speaker: string; text: string }> = {
  1:  { speaker: 'Bulbasaur', text: 'The seed on my back grows with me. I\'ll help your ideas blossom!' },
  4:  { speaker: 'Charmander', text: 'My tail flame never goes out. Let\'s keep the momentum burning!' },
  6:  { speaker: 'Charizard', text: 'I fly where the work takes us. Ready to tackle the biggest tasks!' },
  7:  { speaker: 'Squirtle', text: 'Cool and steady wins the race. I\'ll keep everything flowing smoothly!' },
  25: { speaker: 'Pikachu', text: 'Pika pika! I\'m here to spark energy into your day. Let\'s go!' },
  35: { speaker: 'Clefairy', text: 'The moon guides me. I\'ll help you plan with a clear head!' },
  39: { speaker: 'Jigglypuff', text: 'Singing keeps the mood light. I\'ll make sure nothing feels too heavy!' },
  54: { speaker: 'Psyduck', text: 'Sometimes the best ideas come when we relax. I\'ve got your back!' },
  63: { speaker: 'Abra', text: 'I sense what needs doing. Focus and we\'ll get it done!' },
  79: { speaker: 'Slowpoke', text: 'Slow and steady. I\'ll help you take things one step at a time!' },
  94: { speaker: 'Gengar', text: 'A little mischief keeps things fun. Let\'s get creative with it!' },
  104: { speaker: 'Cubone', text: 'Strength comes from heart. I\'ll stand by you on every task!' },
  129: { speaker: 'Magikarp', text: 'Even the smallest splash matters. I\'ll keep trying with you!' },
  133: { speaker: 'Eevee', text: 'I adapt to any role. Whatever you need, I\'m your partner!' },
  147: { speaker: 'Dratini', text: 'Growth takes time. I\'ll help you build something lasting!' },
  150: { speaker: 'Mewtwo', text: 'Power and precision. Tell me the goal and we\'ll achieve it.' },
  152: { speaker: 'Chikorita', text: 'A calm leaf in the wind. I\'ll keep your plans grounded!' },
  155: { speaker: 'Cyndaquil', text: 'A small flame that grows. Let\'s light up your schedule!' },
  158: { speaker: 'Totodile', text: 'Bite-sized progress every day. I won\'t let anything slip!' },
  172: { speaker: 'Pichu', text: 'Tiny but full of spark! I\'ll bring the energy!' },
  175: { speaker: 'Togepi', text: 'Good luck follows me. Let\'s make today a good one!' },
  196: { speaker: 'Espeon', text: 'I read the situation. We\'ll stay one step ahead!' },
  197: { speaker: 'Umbreon', text: 'Calm in the dark. I\'ll help you focus when it matters!' },
  246: { speaker: 'Larvitar', text: 'Growing strong under pressure. We\'ll get through the list!' },
  252: { speaker: 'Treecko', text: 'Cool and collected. I\'ve got the details covered!' },
  255: { speaker: 'Torchic', text: 'Warm and eager! Let\'s get started!' },
  258: { speaker: 'Mudkip', text: 'Sturdy and reliable. You can count on me!' },
  280: { speaker: 'Ralts', text: 'I feel what you need. Let\'s work together!' },
  282: { speaker: 'Gardevoir', text: 'I protect what matters. Your plans are in good hands!' },
  304: { speaker: 'Aron', text: 'Tough and steady. I\'ll help you build something solid!' },
  330: { speaker: 'Flygon', text: 'I soar over the details. Big picture and execution!' },
  363: { speaker: 'Spheal', text: 'Roll with it! I\'ll keep the mood positive!' },
  387: { speaker: 'Turtwig', text: 'Steady growth. I\'ll help you plant and finish tasks!' },
  390: { speaker: 'Chimchar', text: 'Fire in my heart! Let\'s move fast and smart!' },
  393: { speaker: 'Piplup', text: 'Pride and precision. I\'ll keep things in order!' },
  403: { speaker: 'Shinx', text: 'A little spark goes far. I\'m ready to help!' },
  447: { speaker: 'Riolu', text: 'I sense your resolve. We\'ll push through together!' },
  495: { speaker: 'Snivy', text: 'Cool and confident. I\'ve got the plan!' },
  501: { speaker: 'Oshawott', text: 'Scalchop at the ready. Let\'s cut through the workload!' },
};
