import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { Session, Document, Message } from '../types/index.js';

class SessionService {
  private sessions: Map<string, Session> = new Map();

  createSession(name?: string): Session {
    const session: Session = {
      id: uuidv4(),
      documents: [],
      messages: [],
      agentStates: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    logger.info('Session created', { sessionId: session.id });
    
    return session;
  }

  getSession(id: string): Session | null {
    return this.sessions.get(id) || null;
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
    return updated;
  }

  deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted) {
      logger.info('Session deleted', { sessionId: id });
    }
    return deleted;
  }

  addDocument(sessionId: string, document: Document): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.documents.push(document);
    session.updatedAt = new Date();
    
    logger.info('Document added to session', { 
      sessionId, 
      documentId: document.id,
      documentName: document.name,
    });

    return session;
  }

  addMessage(sessionId: string, message: Message): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.messages.push(message);
    session.updatedAt = new Date();

    return session;
  }

  getDocument(sessionId: string, documentId: string): Document | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return session.documents.find(d => d.id === documentId) || null;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  // Cleanup old sessions (call periodically)
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
      logger.info('Cleaned up old sessions', { count: cleaned });
    }

    return cleaned;
  }
}

export const sessionService = new SessionService();
