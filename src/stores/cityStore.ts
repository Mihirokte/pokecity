import { create } from 'zustand';
import type { AllModuleData, CalendarEvent, HealthMetric, House, HouseModuleType, Note, Resident, ShoppingItem, Task, TripPlan } from '../types';
import { SheetsService } from '../services/sheetsService';
import { AVATAR_COLORS, HOUSE_TYPES } from '../config/houseTypes';
import { RESIDENT_POKEMON_IDS } from '../config/pokemon';

interface CityState {
  cityName: string;
  houses: House[];
  residents: Resident[];
  moduleData: AllModuleData;
  dataLoaded: boolean;

  // Actions
  setCityName: (name: string) => void;
  placeHouse: (type: HouseModuleType) => Promise<House>;
  removeHouse: (id: string) => Promise<void>;
  renameHouse: (id: string, name: string) => Promise<void>;
  findOrCreateHouse: (type: HouseModuleType) => Promise<House>;
  addResident: (houseId: string, name: string) => Promise<void>;
  removeResident: (id: string) => Promise<void>;
  updateResident: (id: string, updates: Partial<Resident>) => Promise<void>;
  setModuleData: <K extends keyof AllModuleData>(key: K, data: AllModuleData[K]) => void;
  loadAllData: () => Promise<void>;
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

  setCityName: (name) => {
    set({ cityName: name });
    SheetsService.update('Meta', { id: 'cityName', key: 'cityName', value: name }).catch(() => {});
  },

  placeHouse: async (type) => {
    const { houses } = get();
    const house: House = {
      id: `house_${Date.now()}`,
      type,
      name: HOUSE_TYPES[type].label,
      gridX: 0,
      gridY: 0,
      createdAt: new Date().toISOString(),
    };

    set({ houses: [...houses, house] });
    SheetsService.append('Houses', house).catch(() => {});
    return house;
  },

  removeHouse: async (id) => {
    set({ houses: get().houses.filter(h => h.id !== id) });
    SheetsService.deleteRow('Houses', id).catch(() => {});
  },

  renameHouse: async (id, name) => {
    const houses = get().houses.map(h => h.id === id ? { ...h, name } : h);
    set({ houses });
    const house = houses.find(h => h.id === id);
    if (house) SheetsService.update('Houses', house).catch(() => {});
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
      id: `res_${Date.now()}`,
      houseId,
      name,
      role: config.defaultRole,
      emoji: String(RESIDENT_POKEMON_IDS[Math.floor(Math.random() * RESIDENT_POKEMON_IDS.length)]),
      avatarBg: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      bio: `A dedicated ${config.defaultRole} living in ${house.name}.`,
      createdAt: new Date().toISOString(),
    };

    set({ residents: [...get().residents, resident] });
    SheetsService.append('Residents', resident).catch(() => {});
  },

  removeResident: async (id) => {
    set({ residents: get().residents.filter(r => r.id !== id) });
    SheetsService.deleteRow('Residents', id).catch(() => {});
  },

  updateResident: async (id, updates) => {
    const residents = get().residents.map(r =>
      r.id === id ? { ...r, ...updates } : r
    );
    set({ residents });
    const updated = residents.find(r => r.id === id);
    if (updated) SheetsService.update('Residents', updated).catch(() => {});
  },

  setModuleData: (key, data) => {
    set({ moduleData: { ...get().moduleData, [key]: data } });
  },

  loadAllData: async () => {
    try {
      const [houses, residents, calendarEvents, tasks, notes, tripPlans, healthMetrics, shoppingItems] =
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

      const meta = await SheetsService.readAll<{ key: string; value: string }>('Meta');
      const cityNameRow = meta.find(m => m.key === 'cityName');

      set({
        houses,
        residents,
        moduleData: { calendarEvents, tasks, notes, tripPlans, healthMetrics, shoppingItems },
        cityName: cityNameRow?.value ?? 'My City',
        dataLoaded: true,
      });
    } catch (e) {
      console.error('Failed to load data:', e);
      set({ dataLoaded: true });
      throw e;
    }
  },
}));
