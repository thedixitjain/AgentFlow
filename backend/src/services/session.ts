import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { loadJsonFile, saveJsonFile } from './persistence.js';
import type { Session, Document, Message, AgentState, WorkspaceReport } from '../types/index.js';

interface PersistedSession {
  id: string;
  workspaceId?: string;
  documents: Array<Omit<Document, 'metadata'> & {
    metadata: {
      uploadedAt: string;
      processedAt?: string;
      rowCount?: number;
      wordCount?: number;
      indexed?: boolean;
    };
  }>;
  messages: Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
  reports?: Array<Omit<WorkspaceReport, 'generatedAt'> & { generatedAt: string }>;
  agentStates: Record<string, AgentState>;
  createdAt: string;
  updatedAt: string;
}

class SessionService {
  private sessions: Map<string, Session>;
  private readonly defaultWorkspaceId = 'local-workspace';

  constructor() {
    this.sessions = this.loadSessions();
  }

  private loadSessions(): Map<string, Session> {
    const stored = loadJsonFile<PersistedSession[]>('sessions.json', []);
    const sessions = new Map<string, Session>();

    stored.forEach(session => {
      sessions.set(session.id, {
        id: session.id,
        workspaceId: session.workspaceId || this.defaultWorkspaceId,
        documents: session.documents.map(document => ({
          ...document,
          metadata: {
            ...document.metadata,
            uploadedAt: new Date(document.metadata.uploadedAt),
            processedAt: document.metadata.processedAt ? new Date(document.metadata.processedAt) : undefined,
          },
        })),
        messages: session.messages.map(message => ({
          ...message,
          timestamp: new Date(message.timestamp),
        })),
        reports: (session.reports || []).map(report => ({
          ...report,
          generatedAt: new Date(report.generatedAt),
        })),
        agentStates: session.agentStates,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
      });
    });

    return sessions;
  }

  private persist(): void {
    const serialized: PersistedSession[] = Array.from(this.sessions.values()).map(session => ({
      ...session,
      documents: session.documents.map(document => ({
        ...document,
        metadata: {
          ...document.metadata,
          uploadedAt: document.metadata.uploadedAt.toISOString(),
          processedAt: document.metadata.processedAt?.toISOString(),
        },
      })),
      messages: session.messages.map(message => ({
        ...message,
        timestamp: message.timestamp.toISOString(),
      })),
      reports: session.reports.map(report => ({
        ...report,
        generatedAt: report.generatedAt.toISOString(),
      })),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    }));

    saveJsonFile('sessions.json', serialized);
  }

  createSession(workspaceId: string, _name?: string): Session {
    const session: Session = {
      id: uuidv4(),
      workspaceId,
      documents: [],
      messages: [],
      reports: [],
      agentStates: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    this.persist();
    logger.info('Session created', { sessionId: session.id });

    return session;
  }

  getSession(id: string, workspaceId?: string): Session | null {
    const session = this.sessions.get(id) || null;
    if (!session) return null;
    if (workspaceId && session.workspaceId !== workspaceId) return null;
    return session;
  }

  getAllSessions(workspaceId?: string): Session[] {
    return Array.from(this.sessions.values())
      .filter(session => !workspaceId || session.workspaceId === workspaceId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  updateSession(id: string, updates: Partial<Session>): Session | null {
    const session = this.sessions.get(id);
    if (!session) return null;

    const updated = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };

    this.sessions.set(id, updated);
    this.persist();
    return updated;
  }

  deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted) {
      this.persist();
      logger.info('Session deleted', { sessionId: id });
    }
    return deleted;
  }

  addDocument(sessionId: string, document: Document): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.documents.push(document);
    session.updatedAt = new Date();
    this.persist();

    logger.info('Document added to session', {
      sessionId,
      documentId: document.id,
      documentName: document.name,
    });

    return session;
  }

  deleteDocument(sessionId: string, documentId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const nextDocuments = session.documents.filter(document => document.id !== documentId);
    if (nextDocuments.length === session.documents.length) {
      return false;
    }

    session.documents = nextDocuments;
    session.updatedAt = new Date();
    this.persist();
    return true;
  }

  updateDocument(sessionId: string, documentId: string, updater: (document: Document) => Document): Document | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const index = session.documents.findIndex(document => document.id === documentId);
    if (index === -1) return null;

    const updatedDocument = updater(session.documents[index]);
    session.documents[index] = updatedDocument;
    session.updatedAt = new Date();
    this.persist();

    return updatedDocument;
  }

  addMessage(sessionId: string, message: Message): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.messages.push(message);
    session.updatedAt = new Date();
    this.persist();

    return session;
  }

  addReport(sessionId: string, report: WorkspaceReport): WorkspaceReport | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.reports = [report, ...session.reports].slice(0, 10);
    session.updatedAt = new Date();
    this.persist();

    logger.info('Report added to session', {
      sessionId,
      reportId: report.id,
      reportTitle: report.title,
    });

    return report;
  }

  getReports(sessionId: string): WorkspaceReport[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.reports;
  }

  getDocument(sessionId: string, documentId: string): Document | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return session.documents.find(document => document.id === documentId) || null;
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    this.sessions.forEach((session, id) => {
      if (now - session.updatedAt.getTime() > maxAgeMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.persist();
      logger.info('Cleaned up old sessions', { count: cleaned });
    }

    return cleaned;
  }
}

export const sessionService = new SessionService();
