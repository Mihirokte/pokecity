// ─── Google Calendar API helpers ───
import { getLocalDate } from '../utils/dateUtils';
import type { Task } from '../types';

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function gcalHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function buildEventBody(task: Task): Record<string, unknown> {
  const isAllDay = !task.dueTime;
  const body: Record<string, unknown> = {
    summary: task.title,
    description: task.notes || undefined,
  };

  if (isAllDay) {
    body.start = { date: task.dueDate };
    const end = new Date(task.dueDate + 'T00:00:00');
    end.setDate(end.getDate() + 1);
    body.end = { date: getLocalDate(end) };
  } else {
    const startDt = `${task.dueDate}T${task.dueTime}:00`;
    const endDate = new Date(startDt);
    endDate.setHours(endDate.getHours() + 1);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    body.start = { dateTime: startDt, timeZone: tz };
    body.end = {
      dateTime: endDate.toISOString().replace('Z', '').slice(0, 19),
      timeZone: tz,
    };
  }

  return body;
}

export async function createGcalEvent(token: string, task: Task): Promise<string> {
  const res = await fetch(GCAL_BASE, {
    method: 'POST',
    headers: gcalHeaders(token),
    body: JSON.stringify(buildEventBody(task)),
  });
  if (!res.ok) throw new Error('Failed to create GCal event');
  const data = await res.json();
  return data.id as string;
}

export async function updateGcalEvent(token: string, eventId: string, task: Task): Promise<void> {
  const res = await fetch(`${GCAL_BASE}/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: gcalHeaders(token),
    body: JSON.stringify(buildEventBody(task)),
  });
  if (!res.ok) throw new Error('Failed to update GCal event');
}

export async function deleteGcalEvent(token: string, eventId: string): Promise<void> {
  const res = await fetch(`${GCAL_BASE}/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  // 204 = deleted, 410 = already gone — both OK
  if (!res.ok && res.status !== 410) throw new Error('Failed to delete GCal event');
}
