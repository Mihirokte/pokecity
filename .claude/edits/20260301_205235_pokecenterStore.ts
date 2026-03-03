import { create } from 'zustand';
import type { PCAgent, AgentLog, SessionData, TwitterPost, LinkedInPost, CachedCalendarEvent, PCNotification, AgentOutput, AgentStatus, CuratedTweet } from '../types';
import { SheetsService } from '../services/sheetsService';
import { DEFAULT_AGENTS } from './default-agents';

interface PokecenterState {
  // Data
  agents: PCAgent[];
  agentLogs: AgentLog[];
  session: SessionData | null;
  twitterPosts: TwitterPost[];
  linkedInPosts: LinkedInPost[];
  cachedCalendarEvents: CachedCalendarEvent[];
  notifications: PCNotification[];
  agentOutputs: AgentOutput[];
  curatedTweets: CuratedTweet[];
  pcDataLoaded: boolean;

  // Navigation
  currentPage: string;

  // Actions
  setCurrentPage: (page: string) => void;
  loadPCData: () => Promise<void>;
  seedDefaults: () => Promise<void>;

  // Agent CRUD
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;
  updateAgentProgress: (agentId: string, progress: number) => void;
  addAgentLog: (agentId: string, level: string, message: string) => void;

  // Twitter
  addTwitterPost: (content: string, status: string, scheduledAt: string) => void;
  updateTwitterPost: (id: string, updates: Partial<TwitterPost>) => void;

  // Curated Tweets
  updateCuratedTweet: (id: string, updates: Partial<CuratedTweet>) => void;
  deleteCuratedTweet: (id: string) => void;

  // Agent Config
  updateAgentConfig: (agentId: string, configJson: string) => void;

  // LinkedIn
  addLinkedInPost: (content: string, status: string, scheduledAt: string) => void;
  updateLinkedInPost: (id: string, updates: Partial<LinkedInPost>) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (type: string, message: string, agentId: string) => void;
}

const now = () => new Date().toISOString();

export const usePokecenterStore = create<PokecenterState>((set, get) => ({
  agents: [],
  agentLogs: [],
  session: null,
  twitterPosts: [],
  linkedInPosts: [],
  cachedCalendarEvents: [],
  notifications: [],
  agentOutputs: [],
  curatedTweets: [],
  pcDataLoaded: false,

  currentPage: 'dashboard',

  setCurrentPage: (page) => set({ currentPage: page }),

  loadPCData: async () => {
    try {
      const [agents, agentLogs, sessionRows, twitterPosts, linkedInPosts, cachedCalendarEvents, notifications, agentOutputs, curatedTweets] =
        await Promise.all([
          SheetsService.readAll<PCAgent>('Agents'),
          SheetsService.readAll<AgentLog>('AgentLogs'),
          SheetsService.readAll<SessionData>('Session'),
          SheetsService.readAll<TwitterPost>('TwitterBot'),
          SheetsService.readAll<LinkedInPost>('LinkedInBot'),
          SheetsService.readAll<CachedCalendarEvent>('CalendarSync'),
          SheetsService.readAll<PCNotification>('Notifications'),
          SheetsService.readAll<AgentOutput>('AgentOutputs'),
          SheetsService.readAll<CuratedTweet>('CuratedTweets'),
        ]);

      const session = sessionRows[0] || null;

      set({
        agents,
        agentLogs,
        session,
        twitterPosts,
        linkedInPosts,
        cachedCalendarEvents,
        notifications,
        agentOutputs,
        curatedTweets,
        pcDataLoaded: true,
      });

      // Seed defaults if no agents exist
      if (agents.length === 0) {
        await get().seedDefaults();
      } else {
        // Merge any missing default agents for existing users
        const existingIds = new Set(agents.map(a => a.id));
        const missing = DEFAULT_AGENTS.filter(d => !existingIds.has(d.id));
        if (missing.length > 0) {
          const ts = now();
          const newAgents = missing.map(a => ({ ...a, createdAt: ts, updatedAt: ts }));
          set({ agents: [...agents, ...newAgents] });
          for (const agent of newAgents) {
            SheetsService.append('Agents', agent).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error('Failed to load PC data:', e);
      set({ pcDataLoaded: true });
      // Seed in-memory defaults so the UI still works
      if (get().agents.length === 0) {
        const ts = now();
        set({
          agents: DEFAULT_AGENTS.map(a => ({ ...a, createdAt: ts, updatedAt: ts })),
        });
      }
    }
  },

  seedDefaults: async () => {
    const ts = now();
    const agents: PCAgent[] = DEFAULT_AGENTS.map(a => ({
      ...a,
      createdAt: ts,
      updatedAt: ts,
    }));

    set({ agents });

    // Persist to sheets (fire and forget)
    for (const agent of agents) {
      SheetsService.append('Agents', agent).catch(() => {});
    }
  },

  // ── Agent actions ──
  updateAgentStatus: (agentId, status) => {
    const agents = get().agents.map(a =>
      a.id === agentId ? { ...a, status, updatedAt: now() } : a
    );
    set({ agents });
    const agent = agents.find(a => a.id === agentId);
    if (agent) SheetsService.update('Agents', agent).catch(() => {});
  },

  updateAgentProgress: (agentId, progress) => {
    const agents = get().agents.map(a =>
      a.id === agentId ? { ...a, progress: String(Math.min(100, Math.max(0, progress))), updatedAt: now() } : a
    );
    set({ agents });
  },

  addAgentLog: (agentId, level, message) => {
    const log: AgentLog = {
      id: `log_${crypto.randomUUID()}`,
      agentId,
      timestamp: now(),
      level,
      message,
    };
    set({ agentLogs: [...get().agentLogs, log] });
    SheetsService.append('AgentLogs', log).catch(() => {});
  },

  // ── Twitter ──
  addTwitterPost: (content, status, scheduledAt) => {
    const post: TwitterPost = {
      id: `tweet_${crypto.randomUUID()}`,
      content,
      status,
      scheduledAt,
      postedAt: '',
      engagementLikes: '0',
      engagementRetweets: '0',
      engagementReplies: '0',
    };
    set({ twitterPosts: [...get().twitterPosts, post] });
    SheetsService.append('TwitterBot', post).catch(() => {});
  },

  updateTwitterPost: (id, updates) => {
    const posts = get().twitterPosts.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    set({ twitterPosts: posts });
    const post = posts.find(p => p.id === id);
    if (post) SheetsService.update('TwitterBot', post).catch(() => {});
  },

  // ── LinkedIn ──
  addLinkedInPost: (content, status, scheduledAt) => {
    const post: LinkedInPost = {
      id: `li_${crypto.randomUUID()}`,
      content,
      status,
      scheduledAt,
      postedAt: '',
      engagementLikes: '0',
      engagementComments: '0',
      engagementShares: '0',
    };
    set({ linkedInPosts: [...get().linkedInPosts, post] });
    SheetsService.append('LinkedInBot', post).catch(() => {});
  },

  updateLinkedInPost: (id, updates) => {
    const posts = get().linkedInPosts.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    set({ linkedInPosts: posts });
    const post = posts.find(p => p.id === id);
    if (post) SheetsService.update('LinkedInBot', post).catch(() => {});
  },

  // ── Notifications ──
  markNotificationRead: (id) => {
    const notifs = get().notifications.map(n =>
      n.id === id ? { ...n, read: 'true' } : n
    );
    set({ notifications: notifs });
    const notif = notifs.find(n => n.id === id);
    if (notif) SheetsService.update('Notifications', notif).catch(() => {});
  },

  markAllNotificationsRead: () => {
    const notifs = get().notifications.map(n => ({ ...n, read: 'true' }));
    set({ notifications: notifs });
    for (const n of notifs) {
      if (n.read !== 'true') SheetsService.update('Notifications', n).catch(() => {});
    }
  },

  addNotification: (type, message, agentId) => {
    const notif: PCNotification = {
      id: `notif_${crypto.randomUUID()}`,
      type,
      message,
      read: 'false',
      agentId,
      createdAt: now(),
    };
    set({ notifications: [...get().notifications, notif] });
    SheetsService.append('Notifications', notif).catch(() => {});
  },
}));
