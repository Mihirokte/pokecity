import type { SheetName } from '../types';

export const SHEET_NAMES: SheetName[] = [
  'Meta',
  'Houses',
  'Residents',
  'CalendarEvents',
  'Tasks',
  'Notes',
  'TimeEntries',
  'Habits',
  'TripPlans',
  'HealthMetrics',
  'ShoppingItems',
];

export const SHEET_HEADERS: Record<SheetName, string[]> = {
  Meta: ['key', 'value'],
  Houses: ['id', 'type', 'name', 'gridX', 'gridY', 'createdAt'],
  Residents: ['id', 'houseId', 'name', 'role', 'emoji', 'avatarBg', 'bio', 'createdAt'],
  CalendarEvents: [
    'id', 'residentId', 'title', 'startDate', 'endDate', 'startTime',
    'endTime', 'allDay', 'location', 'description', 'color', 'recurrence',
    'createdAt', 'updatedAt',
  ],
  Tasks: [
    'id', 'residentId', 'title', 'priority', 'status', 'dueDate',
    'notes', 'parentId', 'projectName', 'tags', 'createdAt', 'updatedAt',
  ],
  Notes: [
    'id', 'residentId', 'title', 'content', 'tags', 'version',
    'createdAt', 'updatedAt',
  ],
  TimeEntries: [
    'id', 'residentId', 'taskRef', 'description', 'startTime', 'endTime',
    'durationMinutes', 'date', 'createdAt',
  ],
  Habits: [
    'id', 'residentId', 'name', 'frequency', 'currentStreak', 'longestStreak',
    'completionHistory', 'createdAt', 'updatedAt',
  ],
  TripPlans: [
    'id', 'residentId', 'tripName', 'startDate', 'endDate', 'destination',
    'legs', 'packingList', 'notes', 'createdAt', 'updatedAt',
  ],
  HealthMetrics: [
    'id', 'residentId', 'date', 'metricType', 'value', 'unit',
    'notes', 'createdAt',
  ],
  ShoppingItems: [
    'id', 'residentId', 'listName', 'itemName', 'quantity', 'unit',
    'estimatedPrice', 'checked', 'category', 'createdAt', 'updatedAt',
  ],
};
