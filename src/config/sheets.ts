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
  'CalendarSync',
  'Notifications',
  'AgentOutputs',
  'CuratedTweets',
];

// Original 9 sheets — used to detect legacy spreadsheets that need migration
export const LEGACY_SHEET_NAMES: SheetName[] = [
  'Meta', 'Houses', 'Residents', 'CalendarEvents', 'Tasks',
  'Notes', 'TripPlans', 'HealthMetrics', 'ShoppingItems',
];

export const NEW_SHEET_NAMES: SheetName[] = [
  'Session', 'Agents', 'AgentLogs', 'TwitterBot', 'LinkedInBot',
  'CalendarSync', 'Notifications', 'AgentOutputs', 'CuratedTweets',
];

// Indexed tab names shown in Google Sheets for easy identification
export const TAB_NAMES: Record<SheetName, string> = {
  Meta:           '01_Meta',
  Houses:         '02_Houses',
  Residents:      '03_Residents',
  Session:        '04_Session',
  Agents:         '05_Agents',
  AgentLogs:      '06_AgentLogs',
  AgentOutputs:   '07_AgentOutputs',
  Tasks:          '08_Tasks',
  CalendarEvents: '09_Calendar',
  Notes:          '10_Notes',
  TwitterBot:     '11_TwitterBot',
  LinkedInBot:    '12_LinkedInBot',
  TripPlans:      '13_Travel',
  HealthMetrics:  '14_Gym',
  ShoppingItems:  '15_Shopping',
  Notifications:  '16_Notifications',
  CalendarSync:   '17_CalendarSync',
  CuratedTweets:  '18_CuratedTweets',
};

// Reverse map: tab name → internal SheetName
export const TAB_TO_SHEET: Record<string, SheetName> = Object.fromEntries(
  Object.entries(TAB_NAMES).map(([k, v]) => [v, k as SheetName])
) as Record<string, SheetName>;

// Get the Google Sheets tab name for an internal sheet name
export function tabName(sheet: SheetName): string {
  return TAB_NAMES[sheet];
}

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
    'dueTime', 'gcalEventId', 'sortOrder',
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
  CalendarSync: [
    'id', 'title', 'start', 'end', 'source', 'syncedAt',
  ],
  Notifications: [
    'id', 'type', 'message', 'read', 'agentId', 'createdAt',
  ],
  AgentOutputs: [
    'id', 'agentId', 'type', 'title', 'content', 'fileRef', 'createdAt',
  ],
  CuratedTweets: [
    'id', 'tweetId', 'author', 'authorHandle', 'content', 'mediaUrl', 'tweetUrl',
    'likes', 'retweets', 'replies', 'collectedAt', 'tags', 'starred', 'category', 'notes',
  ],
};
