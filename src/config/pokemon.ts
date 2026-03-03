// Pokemon sprite configuration using PokeAPI/sprites
// Badges: https://github.com/PokeAPI/sprites/tree/master/sprites/badges

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const BADGE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges';

/** Get the front-facing sprite URL for a Pokemon by national dex ID */
export function spriteUrl(id: number | string): string {
  return `${SPRITE_BASE}/${id}.png`;
}

/** Get the animated showdown sprite (GIF) */
export function spriteAnimatedUrl(id: number | string): string {
  return `${SPRITE_BASE}/other/showdown/${id}.gif`;
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

/** 6 element sprites: one per element (water, fire, wind, grass, lightning, rock) */
export const ELEMENT_SPRITE_IDS: Record<string, number> = {
  water: 7,      // Squirtle
  fire: 4,       // Charmander
  wind: 18,      // Pidgeot
  grass: 1,      // Bulbasaur
  lightning: 25, // Pikachu
  rock: 74,      // Geodude
};

/** Pokemon assigned to each house/module type (uses element sprite for that type) */
export const MODULE_POKEMON: Record<string, number> = {
  calendar: ELEMENT_SPRITE_IDS.grass,    // grass
  tasks: ELEMENT_SPRITE_IDS.fire,       // fire
  notes: ELEMENT_SPRITE_IDS.lightning,   // lightning
  travel: ELEMENT_SPRITE_IDS.wind,      // wind
  gym: ELEMENT_SPRITE_IDS.rock,         // rock
  shopping: ELEMENT_SPRITE_IDS.water,   // water
};

/** Pool of Pokemon IDs for random resident assignment */
export const RESIDENT_POKEMON_IDS = [
  1,    // Bulbasaur
  4,    // Charmander
  7,    // Squirtle
  25,   // Pikachu
  35,   // Clefairy
  39,   // Jigglypuff
  54,   // Psyduck
  63,   // Abra
  79,   // Slowpoke
  104,  // Cubone
  129,  // Magikarp
  133,  // Eevee
  147,  // Dratini
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
  304,  // Aron
  363,  // Spheal
  387,  // Turtwig
  390,  // Chimchar
  393,  // Piplup
  403,  // Shinx
  447,  // Riolu
  495,  // Snivy
  501,  // Oshawott
];
