import type { HouseModuleType, SheetName } from '../types';
import { MODULE_POKEMON } from './pokemon';

export interface HouseTypeConfig {
  type: HouseModuleType;
  label: string;
  emoji: string;
  pokemonId: number;
  color: string;
  description: string;
  defaultRole: string;
  sheetName: SheetName;
}

export const HOUSE_TYPES: Record<HouseModuleType, HouseTypeConfig> = {
  calendar: {
    type: 'calendar',
    label: 'Calendar',
    emoji: '📅',
    pokemonId: MODULE_POKEMON.calendar,
    color: '#4a90d9',
    description: 'Manage your schedule and events',
    defaultRole: 'Scheduler',
    sheetName: 'CalendarEvents',
  },
  tasks: {
    type: 'tasks',
    label: 'Tasks',
    emoji: '✅',
    pokemonId: MODULE_POKEMON.tasks,
    color: '#50c878',
    description: 'Track your tasks and projects',
    defaultRole: 'Task Manager',
    sheetName: 'Tasks',
  },
  notes: {
    type: 'notes',
    label: 'Notes',
    emoji: '📝',
    pokemonId: MODULE_POKEMON.notes,
    color: '#f5a623',
    description: 'Write and organize markdown notes',
    defaultRole: 'Note Keeper',
    sheetName: 'Notes',
  },
  travel: {
    type: 'travel',
    label: 'Travel',
    emoji: '✈️',
    pokemonId: MODULE_POKEMON.travel,
    color: '#1abc9c',
    description: 'Plan trips with itinerary and packing',
    defaultRole: 'Travel Agent',
    sheetName: 'TripPlans',
  },
  gym: {
    type: 'gym',
    label: 'Gym',
    emoji: '💪',
    pokemonId: MODULE_POKEMON.gym,
    color: '#e74c3c',
    description: 'Track your workouts and fitness',
    defaultRole: 'Trainer',
    sheetName: 'HealthMetrics',
  },
  shopping: {
    type: 'shopping',
    label: 'Shopping',
    emoji: '🛒',
    pokemonId: MODULE_POKEMON.shopping,
    color: '#e67e22',
    description: 'Manage shopping lists',
    defaultRole: 'Shopkeeper',
    sheetName: 'ShoppingItems',
  },
};

export const HOUSE_TYPE_LIST = Object.values(HOUSE_TYPES);

export const AVATAR_COLORS = [
  '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
  '#5f27cd', '#01a3a4', '#10ac84', '#ee5a24', '#c8d6e5',
];
