/**
 * City-wide achievements (badges). Conditions are checked when XP is granted or on load.
 * Store snapshot type used for checks to avoid circular deps.
 */
import type { AllModuleData, House } from '../types';

export const DAILY_GOAL_BONUS_XP = 25;

function levelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export interface CitySnapshot {
  cityXP: number;
  cityLevel: number;
  dailyStreak: number;
  badges: string[];
  houses: House[];
  moduleData: AllModuleData;
}

export interface Achievement {
  id: string;
  name: string;
  /** Return true if this achievement is now unlocked (given current state and optional action). */
  check: (state: CitySnapshot, actionType?: 'task' | 'calendar' | 'note' | 'gym' | 'travel' | 'shopping') => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_task',
    name: 'First steps',
    check: (s, a) => a === 'task' && s.moduleData.tasks.some(t => t.status === 'done'),
  },
  {
    id: 'first_event',
    name: 'Time keeper',
    check: (s, a) => a === 'calendar' && s.moduleData.calendarEvents.length >= 1,
  },
  {
    id: 'first_note',
    name: 'Scribbler',
    check: (s, a) => a === 'note' && s.moduleData.notes.length >= 1,
  },
  {
    id: 'first_workout',
    name: 'Gains!',
    check: (s, a) => a === 'gym' && s.moduleData.healthMetrics.length >= 1,
  },
  {
    id: 'first_trip',
    name: 'Wanderlust',
    check: (s, a) => a === 'travel' && s.moduleData.tripPlans.length >= 1,
  },
  {
    id: 'first_shop',
    name: 'Shopkeeper',
    check: (s, a) => a === 'shopping' && s.moduleData.shoppingItems.some(i => i.checked === 'true'),
  },
  {
    id: 'week_streak',
    name: 'Week warrior',
    check: (s) => s.dailyStreak >= 7,
  },
  {
    id: 'level_5',
    name: 'Rising star',
    check: (s) => levelFromXP(s.cityXP) >= 5,
  },
  {
    id: 'ten_notes',
    name: 'Note master',
    check: (s) => s.moduleData.notes.length >= 10,
  },
  {
    id: 'all_agents',
    name: 'Full city',
    check: (s) => {
      const types = new Set(s.houses.map(h => h.type));
      return types.size >= 6;
    },
  },
];

/** Returns achievement ids that are newly unlocked (not in state.badges). */
export function getNewlyUnlockedBadges(
  state: CitySnapshot,
  actionType?: 'task' | 'calendar' | 'note' | 'gym' | 'travel' | 'shopping'
): string[] {
  const unlocked: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (state.badges.includes(a.id)) continue;
    if (a.check(state, actionType)) unlocked.push(a.id);
  }
  return unlocked;
}

/** Get display name for an achievement id. */
export function getAchievementName(id: string): string {
  return ACHIEVEMENTS.find(a => a.id === id)?.name ?? id;
}
