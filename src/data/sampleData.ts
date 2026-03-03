/**
 * Sample data for localhost-only "bypass sign-in" mode.
 * When running on localhost, sign-in does not call Google OAuth;
 * the app loads this data instead of a real spreadsheet.
 */

import type { SheetName } from '../types';
import type { CalendarEvent, HealthMetric, House, Note, Resident, ShoppingItem, Task, TripPlan } from '../types';

export const SAMPLE_SPREADSHEET_ID = '__sample__';

export function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

const now = new Date().toISOString();
const isoDate = now.slice(0, 10);

const sampleMeta: Array<{ key: string; value: string }> = [
  { key: 'cityName', value: 'Sample City' },
];

const sampleHouses: House[] = [
  {
    id: 'house_sample_1',
    type: 'calendar',
    name: 'Celebi Scheduler',
    gridX: 0,
    gridY: 0,
    createdAt: now,
  },
  {
    id: 'house_sample_2',
    type: 'tasks',
    name: 'Task HQ',
    gridX: 1,
    gridY: 0,
    createdAt: now,
  },
];

const sampleResidents: Resident[] = [
  {
    id: 'res_sample_1',
    houseId: 'house_sample_1',
    name: 'Scheduler',
    role: 'Scheduler',
    emoji: '251', // Celebi
    avatarBg: '#4a90d9',
    bio: 'Keeps your calendar in order.',
    createdAt: now,
  },
  {
    id: 'res_sample_2',
    houseId: 'house_sample_2',
    name: 'Task Master',
    role: 'Task Manager',
    emoji: '68', // Machamp
    avatarBg: '#50c878',
    bio: 'Tracks tasks and projects.',
    createdAt: now,
  },
];

const sampleCalendarEvents: CalendarEvent[] = [
  {
    id: 'ev_sample_1',
    residentId: 'res_sample_1',
    title: 'Welcome to PokéCity',
    startDate: isoDate,
    endDate: isoDate,
    startTime: '09:00',
    endTime: '10:00',
    allDay: 'false',
    location: '',
    description: 'Sample event — try adding more in Calendar.',
    color: '#4a90d9',
    recurrence: '',
    createdAt: now,
    updatedAt: now,
  },
];

const sampleTasks: Task[] = [
  {
    id: 'task_sample_1',
    residentId: 'res_sample_2',
    title: 'Explore the city',
    priority: 'normal',
    status: 'inProgress',
    dueDate: '',
    notes: '',
    parentId: '',
    projectName: '',
    tags: '',
    createdAt: now,
    updatedAt: now,
    dueTime: '',
    gcalEventId: '',
  },
];

const sampleNotes: Note[] = [
  {
    id: 'note_sample_1',
    residentId: 'res_sample_2',
    title: 'Sample Note',
    content: '**Hello!** This is sample data for localhost.\n\nYou can edit and add more — changes stay in memory (no Google Sheets).',
    tags: '',
    version: '1',
    createdAt: now,
    updatedAt: now,
  },
];

const sampleTripPlans: TripPlan[] = [];
const sampleHealthMetrics: HealthMetric[] = [];
const sampleShoppingItems: ShoppingItem[] = [];

const CORE_SHEETS: SheetName[] = [
  'Meta',
  'Houses',
  'Residents',
  'CalendarEvents',
  'Tasks',
  'Notes',
  'TripPlans',
  'HealthMetrics',
  'ShoppingItems',
];

const sampleBySheet: Partial<Record<SheetName, unknown[]>> = {
  Meta: sampleMeta,
  Houses: sampleHouses,
  Residents: sampleResidents,
  CalendarEvents: sampleCalendarEvents,
  Tasks: sampleTasks,
  Notes: sampleNotes,
  TripPlans: sampleTripPlans,
  HealthMetrics: sampleHealthMetrics,
  ShoppingItems: sampleShoppingItems,
};

/** Return sample data for the 9 core sheets; other sheets return empty array. */
export function getSampleData<T>(sheetName: SheetName): T[] {
  if (CORE_SHEETS.includes(sheetName) && sampleBySheet[sheetName]) {
    return sampleBySheet[sheetName] as T[];
  }
  return [];
}
