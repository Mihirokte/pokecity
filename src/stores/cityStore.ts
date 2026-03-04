import { create } from 'zustand';
import type { AllModuleData, CalendarEvent, HealthMetric, House, HouseModuleType, Note, Resident, ShoppingItem, Task, TripPlan } from '../types';
import { SheetsService } from '../services/sheetsService';
import { useUIStore } from './uiStore';
import { AVATAR_COLORS, HOUSE_TYPES, HOUSE_TYPE_LIST } from '../config/houseTypes';
import { RESIDENT_POKEMON_IDS } from '../config/pokemon';
import { getHexIndexForHouse, BOARD_HEX_COUNT, ORDERED_HOME_HEX_INDICES } from '../components/Landing/catanData';
import { getNewlyUnlockedBadges, getAchievementName, DAILY_GOAL_BONUS_XP } from '../config/achievements';

function syncFailedToast(message: string) {
  useUIStore.getState().addToast(message, 'error');
}

/** XP needed at start of level (level 1 = 0, level 2 = 100, level 3 = 400, ...) */
export function xpForLevel(level: number): number {
  return level <= 0 ? 0 : (level - 1) * (level - 1) * 100;
}

/** Level from total XP: level = floor(sqrt(xp/100)) + 1 */
export function levelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export interface DailyGoals {
  date: string;
  task: boolean;
  calendarNote: boolean;
  gymShop: boolean;
  bonusGiven: boolean;
}

export type SpriteStyle = '2d' | '3d';

export interface CityProgress {
  cityXP: number;
  cityLevel: number;
  lastActiveDate: string;
  dailyStreak: number;
  badges: string[];
  dailyGoals: DailyGoals;
  spriteStyle: SpriteStyle;
}

function getLocalDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_DAILY_GOALS: DailyGoals = {
  date: '',
  task: false,
  calendarNote: false,
  gymShop: false,
  bonusGiven: false,
};

const DEFAULT_PROGRESS: CityProgress = {
  cityXP: 0,
  cityLevel: 1,
  lastActiveDate: '',
  dailyStreak: 0,
  badges: [],
  dailyGoals: { ...DEFAULT_DAILY_GOALS },
  spriteStyle: '2d',
};

interface CityState {
  cityName: string;
  houses: House[];
  residents: Resident[];
  moduleData: AllModuleData;
  dataLoaded: boolean;
  cityProgress: CityProgress;

  // Actions
  setCityName: (name: string) => void;
  setSpriteStyle: (style: SpriteStyle) => void;
  /** Grant XP and update streak; syncs to Meta. actionType used for daily goals and achievements. */
  addCityXP: (amount: number, actionType?: 'task' | 'calendar' | 'note' | 'gym' | 'travel' | 'shopping') => void;
  placeHouse: (type: HouseModuleType) => Promise<House>;
  removeHouse: (id: string) => Promise<void>;
  renameHouse: (id: string, name: string) => Promise<void>;
  /** Set board hex index (0..BOARD_HEX_COUNT-1) for a house so the agent can be moved to any unoccupied tile */
  updateHousePosition: (houseId: string, hexIndex: number) => Promise<void>;
  findOrCreateHouse: (type: HouseModuleType) => Promise<House>;
  addResident: (houseId: string, name: string) => Promise<void>;
  removeResident: (id: string) => Promise<void>;
  updateResident: (id: string, updates: Partial<Resident>) => Promise<void>;
  setModuleData: <K extends keyof AllModuleData>(key: K, data: AllModuleData[K]) => void;
  setDataLoaded: (loaded: boolean) => void;
  loadAllData: () => Promise<void>;
  /** Map any house with invalid type to one of the 6 valid types (default: tasks). Returns count fixed. */
  resetHouseTypes: (defaultType?: HouseModuleType) => Promise<number>;
}

const emptyModuleData: AllModuleData = {
  calendarEvents: [],
  tasks: [],
  notes: [],
  tripPlans: [],
  healthMetrics: [],
  shoppingItems: [],
};

export const useCityStore = create<CityState>((set, get) => ({
  cityName: 'My City',
  houses: [],
  residents: [],
  moduleData: { ...emptyModuleData },
  dataLoaded: false,
  cityProgress: { ...DEFAULT_PROGRESS },

  setCityName: (name) => {
    set({ cityName: name });
    SheetsService.update('Meta', { key: 'cityName', value: name }, 'key').catch(() => syncFailedToast('Failed to save city name'));
  },

  setSpriteStyle: (style) => {
    const prev = get().cityProgress;
    if (prev.spriteStyle === style) return;
    const next = { ...prev, spriteStyle: style };
    set({ cityProgress: next });
    SheetsService.update('Meta', { key: 'spriteStyle', value: style }, 'key')
      .catch(() => SheetsService.append('Meta', { key: 'spriteStyle', value: style }).catch(() => syncFailedToast('Failed to save sprite style')));
  },

  placeHouse: async (type) => {
    const { houses } = get();
    const occupied = new Set(houses.map(h => getHexIndexForHouse(h.gridX)));
    const preferred = ORDERED_HOME_HEX_INDICES.find(i => !occupied.has(i));
    const hexIndex = preferred ?? Array.from({ length: BOARD_HEX_COUNT }, (_, i) => i).find(i => !occupied.has(i)) ?? 0;
    const house: House = {
      id: `house_${crypto.randomUUID()}`,
      type,
      name: HOUSE_TYPES[type].label,
      gridX: hexIndex,
      gridY: 0,
      createdAt: new Date().toISOString(),
    };

    set({ houses: [...houses, house] });
    SheetsService.append('Houses', house).catch(() => syncFailedToast('Failed to save house'));
    return house;
  },

  removeHouse: async (id) => {
    const orphanedResidents = get().residents.filter(r => r.houseId === id);
    set({
      houses: get().houses.filter(h => h.id !== id),
      residents: get().residents.filter(r => r.houseId !== id),
    });
    SheetsService.deleteRow('Houses', id).catch(() => syncFailedToast('Failed to remove house'));
    for (const r of orphanedResidents) {
      SheetsService.deleteRow('Residents', r.id).catch(() => syncFailedToast('Failed to remove resident'));
    }
  },

  renameHouse: async (id, name) => {
    const houses = get().houses.map(h => h.id === id ? { ...h, name } : h);
    set({ houses });
    const house = houses.find(h => h.id === id);
    if (house) SheetsService.update('Houses', house).catch(() => syncFailedToast('Failed to rename house'));
  },

  updateHousePosition: async (houseId, hexIndex) => {
    const clamped = Math.max(0, Math.min(BOARD_HEX_COUNT - 1, Math.floor(hexIndex)));
    const houses = get().houses.map(h =>
      h.id === houseId ? { ...h, gridX: clamped } : h
    );
    set({ houses });
    const house = houses.find(h => h.id === houseId);
    if (house) SheetsService.update('Houses', house).catch(() => syncFailedToast('Failed to update position'));
  },

  findOrCreateHouse: async (type) => {
    const existing = get().houses.find(h => h.type === type);
    if (existing) return existing;
    return get().placeHouse(type);
  },

  addResident: async (houseId, name) => {
    const house = get().houses.find(h => h.id === houseId);
    if (!house) return;
    const config = HOUSE_TYPES[house.type];

    const resident: Resident = {
      id: `res_${crypto.randomUUID()}`,
      houseId,
      name,
      role: config.defaultRole,
      emoji: String(RESIDENT_POKEMON_IDS[Math.floor(Math.random() * RESIDENT_POKEMON_IDS.length)]),
      avatarBg: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      bio: `A dedicated ${config.defaultRole} living in ${house.name}.`,
      createdAt: new Date().toISOString(),
    };

    set({ residents: [...get().residents, resident] });
    SheetsService.append('Residents', resident).catch(() => syncFailedToast('Failed to save resident'));
  },

  removeResident: async (id) => {
    set({ residents: get().residents.filter(r => r.id !== id) });
    SheetsService.deleteRow('Residents', id).catch(() => syncFailedToast('Failed to remove resident'));
  },

  updateResident: async (id, updates) => {
    const residents = get().residents.map(r =>
      r.id === id ? { ...r, ...updates } : r
    );
    set({ residents });
    const updated = residents.find(r => r.id === id);
    if (updated) SheetsService.update('Residents', updated).catch(() => syncFailedToast('Failed to update resident'));
  },

  setModuleData: (key, data) => {
    set({ moduleData: { ...get().moduleData, [key]: data } });
  },

  setDataLoaded: (loaded) => set({ dataLoaded: loaded }),

  addCityXP: (amount, actionType) => {
    const state = get();
    const { cityProgress } = state;
    const today = getLocalDateStr();
    let { dailyStreak, lastActiveDate, dailyGoals } = cityProgress;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (lastActiveDate === today) {
      // already counted today
    } else if (lastActiveDate === yesterday) {
      dailyStreak += 1;
      lastActiveDate = today;
    } else {
      dailyStreak = 1;
      lastActiveDate = today;
    }

    // Daily goals: reset if new day; mark goal by actionType; grant bonus once when all three done
    let goals = dailyGoals.date === today ? { ...dailyGoals } : { date: today, task: false, calendarNote: false, gymShop: false, bonusGiven: false };
    if (actionType === 'task') goals = { ...goals, task: true };
    if (actionType === 'calendar' || actionType === 'note') goals = { ...goals, calendarNote: true };
    if (actionType === 'gym' || actionType === 'shopping') goals = { ...goals, gymShop: true };
    let bonusXP = 0;
    if (goals.task && goals.calendarNote && goals.gymShop && !goals.bonusGiven) {
      bonusXP = DAILY_GOAL_BONUS_XP;
      goals = { ...goals, bonusGiven: true };
      useUIStore.getState().addToast('Daily goals complete! +25 XP', 'success');
    }

    let newXP = cityProgress.cityXP + amount + bonusXP;
    const cityLevel = levelFromXP(newXP);
    const next: CityProgress = {
      ...cityProgress,
      cityXP: newXP,
      cityLevel,
      lastActiveDate,
      dailyStreak,
      dailyGoals: goals,
    };
    set({ cityProgress: next });

    const metaRows = [
      { key: 'cityXP', value: String(newXP) },
      { key: 'cityLevel', value: String(cityLevel) },
      { key: 'lastActiveDate', value: lastActiveDate },
      { key: 'dailyStreak', value: String(dailyStreak) },
      { key: 'dailyGoals', value: JSON.stringify(goals) },
    ];
    metaRows.forEach((row) => {
      SheetsService.update('Meta', row, 'key').catch(() => SheetsService.append('Meta', row).catch(() => {}));
    });

    // Achievements: check for newly unlocked badges
    const snapshot = {
      cityXP: newXP,
      cityLevel,
      dailyStreak,
      badges: cityProgress.badges,
      houses: state.houses,
      moduleData: state.moduleData,
    };
    const newlyUnlocked = getNewlyUnlockedBadges(snapshot, actionType);
    if (newlyUnlocked.length > 0) {
      const nextBadges = [...cityProgress.badges, ...newlyUnlocked];
      set({ cityProgress: { ...next, badges: nextBadges } });
      SheetsService.update('Meta', { key: 'badges', value: JSON.stringify(nextBadges) }, 'key').catch(() => {});
      newlyUnlocked.forEach((id) => useUIStore.getState().addToast(`Achievement: ${getAchievementName(id)}!`, 'success'));
    }
  },

  loadAllData: async () => {
    try {
      const [rawHouses, rawResidents, calendarEvents, tasks, notes, tripPlans, healthMetrics, shoppingItems] =
        await Promise.all([
          SheetsService.readAll<House>('Houses'),
          SheetsService.readAll<Resident>('Residents'),
          SheetsService.readAll<CalendarEvent>('CalendarEvents'),
          SheetsService.readAll<Task>('Tasks'),
          SheetsService.readAll<Note>('Notes'),
          SheetsService.readAll<TripPlan>('TripPlans'),
          SheetsService.readAll<HealthMetric>('HealthMetrics'),
          SheetsService.readAll<ShoppingItem>('ShoppingItems'),
        ]);

      // Normalize gridX from sheet (strings) to number and deduplicate so each house has a unique hex
      const defaultEmoji = String(RESIDENT_POKEMON_IDS[0]);
      const houses: House[] = rawHouses.map((h) => ({
        ...h,
        gridX: Math.max(0, Math.min(BOARD_HEX_COUNT - 1, parseInt(String(h.gridX), 10) || 0)),
        gridY: 0,
      }));
      const occupied = new Set<number>();
      const normalizedHouses = houses.map((h) => {
        let hexIndex = getHexIndexForHouse(h.gridX);
        if (occupied.has(hexIndex)) {
          const preferred = ORDERED_HOME_HEX_INDICES.find((i) => !occupied.has(i));
          hexIndex = preferred ?? Array.from({ length: BOARD_HEX_COUNT }, (_, i) => i).find((i) => !occupied.has(i)) ?? 0;
        }
        occupied.add(hexIndex);
        return { ...h, gridX: hexIndex };
      });

      // Normalize resident emoji (sheet returns string; ensure valid Pokémon id for sprites)
      const residents: Resident[] = rawResidents.map((r) => {
        const parsed = parseInt(String(r.emoji), 10);
        const emoji = !Number.isNaN(parsed) && parsed > 0 ? String(parsed) : defaultEmoji;
        return { ...r, emoji };
      });

      // Persist corrected positions so reload stays consistent
      for (let i = 0; i < normalizedHouses.length; i++) {
        if (normalizedHouses[i].gridX !== houses[i].gridX) {
          SheetsService.update('Houses', normalizedHouses[i]).catch(() => syncFailedToast('Failed to save house position'));
        }
      }

      const meta = await SheetsService.readAll<{ key: string; value: string }>('Meta');
      const cityNameRow = meta.find(m => m.key === 'cityName');
      const getMeta = (key: string) => meta.find(m => m.key === key)?.value ?? '';

      const cityXP = Math.max(0, parseInt(getMeta('cityXP'), 10) || 0);
      const cityLevel = levelFromXP(cityXP);
      const lastActiveDate = getMeta('lastActiveDate');
      const dailyStreak = Math.max(0, parseInt(getMeta('dailyStreak'), 10) || 0);
      let badges: string[] = [];
      try {
        const raw = getMeta('badges');
        if (raw) badges = JSON.parse(raw) as string[];
      } catch {
        badges = [];
      }
      const today = getLocalDateStr();
      let dailyGoals: DailyGoals = { ...DEFAULT_DAILY_GOALS, date: today };
      try {
        const raw = getMeta('dailyGoals');
        if (raw) {
          const parsed = JSON.parse(raw) as DailyGoals;
          if (parsed.date === today) dailyGoals = parsed;
        }
      } catch {
        // use default for today
      }
      const spriteStyleRaw = getMeta('spriteStyle');
      const spriteStyle: SpriteStyle = spriteStyleRaw === '3d' ? '3d' : '2d';
      const cityProgress: CityProgress = {
        cityXP,
        cityLevel,
        lastActiveDate,
        dailyStreak,
        badges,
        dailyGoals,
        spriteStyle,
      };

      const progressKeys = ['cityXP', 'cityLevel', 'lastActiveDate', 'dailyStreak', 'badges', 'dailyGoals', 'spriteStyle'];
      for (const key of progressKeys) {
        if (!meta.some(m => m.key === key)) {
          const value = key === 'badges' ? '[]'
            : key === 'dailyGoals' ? JSON.stringify(dailyGoals)
              : key === 'spriteStyle' ? '2d'
              : key === 'cityLevel' ? '1' : key === 'dailyStreak' ? '0' : '';
          SheetsService.append('Meta', { key, value }).catch(() => {});
        }
      }

      set({
        houses: normalizedHouses,
        residents,
        moduleData: { calendarEvents, tasks, notes, tripPlans, healthMetrics, shoppingItems },
        cityName: cityNameRow?.value ?? 'My City',
        dataLoaded: true,
        cityProgress,
      });
    } catch (e) {
      console.error('Failed to load data:', e);
      set({ dataLoaded: true });
      throw e;
    }
  },

  resetHouseTypes: async (defaultType: HouseModuleType = 'tasks') => {
    const validTypes = new Set<string>(HOUSE_TYPE_LIST.map(h => h.type));
    const houses = get().houses;
    let fixed = 0;
    const updated = houses.map(h => {
      const type = String(h.type);
      if (!validTypes.has(type)) {
        fixed++;
        const house: House = { ...h, type: defaultType, name: HOUSE_TYPES[defaultType].label };
        SheetsService.update('Houses', house).catch(() => syncFailedToast('Failed to fix house type'));
        return house;
      }
      return h;
    });
    if (fixed > 0) set({ houses: updated });
    return fixed;
  },
}));
