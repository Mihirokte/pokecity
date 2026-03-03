// Pokemon Types Configuration for Catan Board
// Each type maps to a Catan tile color with 3D effect

export interface PokemonTypeConfig {
  type: string;
  name: string;
  color: string;
  colorDark: string;
  emoji: string;
  representative: string; // Pokemon that represents this type
}

export const POKEMON_TYPES: Record<string, PokemonTypeConfig> = {
  normal: {
    type: 'normal',
    name: 'Normal',
    color: '#A8A77A',
    colorDark: '#8A875E',
    emoji: '⚪',
    representative: 'pikachu',
  },
  fire: {
    type: 'fire',
    name: 'Fire',
    color: '#EE8130',
    colorDark: '#C96A25',
    emoji: '🔥',
    representative: 'charizard',
  },
  water: {
    type: 'water',
    name: 'Water',
    color: '#6390F0',
    colorDark: '#4F73C2',
    emoji: '💧',
    representative: 'blastoise',
  },
  grass: {
    type: 'grass',
    name: 'Grass',
    color: '#7AC74C',
    colorDark: '#5F9E3B',
    emoji: '🌿',
    representative: 'venusaur',
  },
  electric: {
    type: 'electric',
    name: 'Electric',
    color: '#F7D02C',
    colorDark: '#C5A623',
    emoji: '⚡',
    representative: 'pikachu',
  },
  ice: {
    type: 'ice',
    name: 'Ice',
    color: '#96D9D6',
    colorDark: '#78AEA9',
    emoji: '❄️',
    representative: 'articuno',
  },
  fighting: {
    type: 'fighting',
    name: 'Fighting',
    color: '#C22E28',
    colorDark: '#9C2520',
    emoji: '🥊',
    representative: 'machamp',
  },
  poison: {
    type: 'poison',
    name: 'Poison',
    color: '#A33EA1',
    colorDark: '#82327F',
    emoji: '☠️',
    representative: 'gengar',
  },
  ground: {
    type: 'ground',
    name: 'Ground',
    color: '#E2BF65',
    colorDark: '#B4984F',
    emoji: '🏜️',
    representative: 'garchomp',
  },
  flying: {
    type: 'flying',
    name: 'Flying',
    color: '#A98FF3',
    colorDark: '#8772C2',
    emoji: '🕊️',
    representative: 'togekiss',
  },
  psychic: {
    type: 'psychic',
    name: 'Psychic',
    color: '#F95587',
    colorDark: '#C6446C',
    emoji: '🔮',
    representative: 'mewtwo',
  },
  bug: {
    type: 'bug',
    name: 'Bug',
    color: '#A6B91A',
    colorDark: '#859415',
    emoji: '🐛',
    representative: 'scizor',
  },
  rock: {
    type: 'rock',
    name: 'Rock',
    color: '#B6A136',
    colorDark: '#91812B',
    emoji: '🪨',
    representative: 'tyranitar',
  },
  ghost: {
    type: 'ghost',
    name: 'Ghost',
    color: '#735797',
    colorDark: '#5C4779',
    emoji: '👻',
    representative: 'gengar',
  },
  dragon: {
    type: 'dragon',
    name: 'Dragon',
    color: '#6F35FC',
    colorDark: '#592AC9',
    emoji: '🐉',
    representative: 'dragonite',
  },
  steel: {
    type: 'steel',
    name: 'Steel',
    color: '#B7B7CE',
    colorDark: '#9393A5',
    emoji: '⚙️',
    representative: 'metagross',
  },
  dark: {
    type: 'dark',
    name: 'Dark',
    color: '#705746',
    colorDark: '#5A4638',
    emoji: '🌑',
    representative: 'tyranitar',
  },
  fairy: {
    type: 'fairy',
    name: 'Fairy',
    color: '#D685AD',
    colorDark: '#AC6A8B',
    emoji: '✨',
    representative: 'jigglypuff',
  },
};

// Catan board layout - positions for each type in the hex grid
// Using axial coordinates (q, r) where center is (0, 0)
export const CATAN_LAYOUT = {
  // Center tile (capital/logo)
  center: { q: 0, r: 0, type: 'logo' },
  
  // Inner ring (6 tiles)
  inner: [
    { q: 0, r: -1, type: 'fire' },
    { q: 1, r: -1, type: 'water' },
    { q: 1, r: 0, type: 'grass' },
    { q: 0, r: 1, type: 'electric' },
    { q: -1, r: 1, type: 'ice' },
    { q: -1, r: 0, type: 'fighting' },
  ],
  
  // Outer ring (12 tiles)
  outer: [
    { q: 0, r: -2, type: 'poison' },
    { q: 1, r: -2, type: 'ground' },
    { q: 2, r: -2, type: 'flying' },
    { q: 2, r: -1, type: 'psychic' },
    { q: 2, r: 0, type: 'bug' },
    { q: 1, r: 1, type: 'rock' },
    { q: 0, r: 2, type: 'ghost' },
    { q: -1, r: 2, type: 'dragon' },
    { q: -2, r: 2, type: 'steel' },
    { q: -2, r: 1, type: 'dark' },
    { q: -2, r: 0, type: 'fairy' },
    { q: -1, r: -1, type: 'normal' },
  ],
};

export const POKEMON_TYPE_LIST = Object.values(POKEMON_TYPES);

// Get sprite URL for a Pokemon (using PokeAPI for 3DS-style sprites)
export function getPokemonSpriteUrl(pokemonName: string, style: 'dream_world' | 'official' | 'xy' = 'xy'): string {
  const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  
  // Map common Pokemon names to their IDs
  const pokemonIds: Record<string, number> = {
    pikachu: 25,
    charizard: 6,
    blastoise: 9,
    venusaur: 3,
    articuno: 144,
    machamp: 68,
    gengar: 94,
    garchomp: 445,
    togekiss: 468,
    mewtwo: 150,
    scizor: 212,
    tyranitar: 248,
    dragonite: 149,
    metagross: 376,
    jigglypuff: 39,
  };
  
  const id = pokemonIds[pokemonName.toLowerCase()] || 25;
  
  if (style === 'xy') {
    return `${baseUrl}/other/official-artwork/${id}.png`;
  }
  
  return `${baseUrl}/${style}/${id}.png`;
}

// Get animated sprite URL
export function getAnimatedSpriteUrl(pokemonName: string): string {
  const pokemonIds: Record<string, number> = {
    pikachu: 25,
    charizard: 6,
    blastoise: 9,
    venusaur: 3,
    articuno: 144,
    machamp: 68,
    gengar: 94,
    garchomp: 445,
    togekiss: 468,
    mewtwo: 150,
    scizor: 212,
    tyranitar: 248,
    dragonite: 149,
    metagross: 376,
    jigglypuff: 39,
  };
  
  const id = pokemonIds[pokemonName.toLowerCase()] || 25;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
}
