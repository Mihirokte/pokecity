// Pokemon sprite configuration using PokeAPI/sprites

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

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

/** The player's Pokemon — Pikachu */
export const PLAYER_POKEMON_ID = 25;

/** Pokemon assigned to each house/module type */
export const MODULE_POKEMON: Record<string, number> = {
  calendar: 251,     // Celebi — time travel Pokemon
  tasks: 68,         // Machamp — hard worker, gets things done
  notes: 235,        // Smeargle — the artist/writer Pokemon
  timetracker: 483,  // Dialga — lord of time
  habits: 143,       // Snorlax — all about daily routine
  travel: 18,        // Pidgeot — the traveler bird
  health: 113,       // Chansey — the healer
  shopping: 52,      // Meowth — Pay Day, loves coins
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
