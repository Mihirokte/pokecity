// ─── Auth ───
export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  given_name: string;
}

// ─── Sheet Names ───
export type SheetName =
  | 'Meta'
  | 'Houses'
  | 'Residents'
  | 'CalendarEvents'
  | 'Tasks'
  | 'Notes'
  | 'TripPlans'
  | 'HealthMetrics'
  | 'ShoppingItems';

// ─── House Module Types ───
export type HouseModuleType =
  | 'calendar'
  | 'tasks'
  | 'notes'
  | 'travel'
  | 'gym'
  | 'shopping';

// ─── City ───
export interface House {
  id: string;
  type: HouseModuleType;
  name: string;
  gridX: number;
  gridY: number;
  createdAt: string;
}

export interface Resident {
  id: string;
  houseId: string;
  name: string;
  role: string;
  emoji: string;
  avatarBg: string;
  bio: string;
  createdAt: string;
}

// ─── Views ───
export type AppView = 'shop';

// ─── Toast ───
export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

// ─── Module Data Models ───
export interface CalendarEvent {
  id: string;
  residentId: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: string;
  location: string;
  description: string;
  color: string;
  recurrence: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  residentId: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'backlog' | 'inProgress' | 'done';
  dueDate: string;
  notes: string;
  parentId: string;
  projectName: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  residentId: string;
  title: string;
  content: string;
  tags: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripPlan {
  id: string;
  residentId: string;
  tripName: string;
  startDate: string;
  endDate: string;
  destination: string;
  legs: string; // JSON array of TripLeg
  packingList: string; // JSON array of PackingItem
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripLeg {
  from: string;
  to: string;
  date: string;
  transport: 'flight' | 'train' | 'car' | 'bus' | 'ferry' | 'other';
  details: string;
}

export interface PackingItem {
  item: string;
  packed: boolean;
}

export interface HealthMetric {
  id: string;
  residentId: string;
  date: string;
  metricType: string;
  value: string;
  unit: string;
  notes: string;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  residentId: string;
  listName: string;
  itemName: string;
  quantity: string;
  unit: string;
  estimatedPrice: string;
  checked: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

// ─── All Module Data ───
export interface AllModuleData {
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  notes: Note[];
  tripPlans: TripPlan[];
  healthMetrics: HealthMetric[];
  shoppingItems: ShoppingItem[];
}
