import type { SheetName } from '../types';

export const SHEET_NAMES: SheetName[] = [
  'Meta',
  'Houses',
  'Residents',
  'CalendarEvents',
  'Tasks',
  'Notes',
  'TripPlans',
  'HealthMetrics',
  'ShoppingItems',
  'Session',
  'Agents',
  'AgentLogs',
  'TwitterBot',
  'LinkedInBot',
  'KnowledgeBase',
  'CalendarSync',
  'Notifications',
  'AgentOutputs',
];

// Original 9 sheets — used to detect legacy spreadsheets that need migration
export const LEGACY_SHEET_NAMES: SheetName[] = [
  'Meta', 'Houses', 'Residents', 'CalendarEvents', 'Tasks',
  'Notes', 'TripPlans', 'HealthMetrics', 'ShoppingItems',
];

export const NEW_SHEET_NAMES: SheetName[] = [
  'Session', 'Agents', 'AgentLogs', 'TwitterBot', 'LinkedInBot',
  'KnowledgeBase', 'CalendarSync', 'Notifications', 'AgentOutputs',
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
  // ─── PokéCenter sheets ───
  Session: [
    'userId', 'lastX', 'lastY', 'lastDirection', 'lastOpenPanel', 'timestamp',
  ],
  Agents: [
    'id', 'name', 'pokemon', 'pokemonId', 'type', 'typeIcon',
    'status', 'progress', 'isRunOnce', 'description', 'configJson',
    'createdAt', 'updatedAt',
  ],
  AgentLogs: [
    'id', 'agentId', 'timestamp', 'level', 'message',
  ],
  TwitterBot: [
    'id', 'content', 'status', 'scheduledAt', 'postedAt',
    'engagementLikes', 'engagementRetweets', 'engagementReplies',
  ],
  LinkedInBot: [
    'id', 'content', 'status', 'scheduledAt', 'postedAt',
    'engagementLikes', 'engagementComments', 'engagementShares',
  ],
  KnowledgeBase: [
    'id', 'agentId', 'source', 'title', 'contentSummary', 'rawRef', 'fetchedAt',
  ],
  CalendarSync: [
    'id', 'title', 'start', 'end', 'source', 'syncedAt',
  ],
  Notifications: [
    'id', 'type', 'message', 'read', 'agentId', 'createdAt',
  ],
  AgentOutputs: [
    'id', 'agentId', 'type', 'title', 'content', 'fileRef', 'createdAt',
  ],
};
