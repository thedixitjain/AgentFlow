import { config } from '../config/index.js'
import { loadJsonFile, saveJsonFile } from './persistence.js'
import type { Session } from '../types/index.js'

export interface PersistenceStatus {
  mode: 'local-json' | 'database-ready'
  provider: string
  databaseConfigured: boolean
  lastSyncedAt: string | null
  queuedSnapshots: number
  message: string
}

export interface PersistenceSyncResult {
  queued: boolean
  persisted: boolean
  message: string
  status: PersistenceStatus
}

class DatabaseSyncService {
  private lastSyncedAt: Date | null = null
  private readonly queueFilename = 'session-sync-queue.json'

  private readQueue(): Array<{
    sessionId: string
    workspaceId: string
    syncedAt: string
    provider: string
    reportCount: number
    documentCount: number
    messageCount: number
  }> {
    return loadJsonFile(this.queueFilename, [])
  }

  private writeQueue(entries: Array<{
    sessionId: string
    workspaceId: string
    syncedAt: string
    provider: string
    reportCount: number
    documentCount: number
    messageCount: number
  }>): void {
    saveJsonFile(this.queueFilename, entries)
  }

  getStatus(): PersistenceStatus {
    const databaseConfigured = Boolean(config.persistence.databaseUrl)
    const queue = this.readQueue()

    return {
      mode: databaseConfigured ? 'database-ready' : 'local-json',
      provider: databaseConfigured ? config.persistence.provider : 'filesystem',
      databaseConfigured,
      lastSyncedAt: this.lastSyncedAt?.toISOString() || null,
      queuedSnapshots: queue.length,
      message: databaseConfigured
        ? 'Database connection detected. Session snapshots are being normalized into a sync queue that can be wired into a real upsert worker.'
        : 'Running on local JSON persistence. Session snapshots are still being normalized so a database adapter can be added cleanly.',
    }
  }

  async syncSession(session: Session): Promise<PersistenceSyncResult> {
    this.lastSyncedAt = new Date()
    const syncedAt = this.lastSyncedAt.toISOString()
    const status = this.getStatus()
    const queue = this.readQueue().filter((entry) => entry.sessionId !== session.id)

    queue.unshift({
      sessionId: session.id,
      workspaceId: session.workspaceId,
      syncedAt,
      provider: status.provider,
      reportCount: session.reports.length,
      documentCount: session.documents.length,
      messageCount: session.messages.length,
    })

    this.writeQueue(queue.slice(0, 50))

    const refreshedStatus = this.getStatus()
    return {
      queued: refreshedStatus.databaseConfigured,
      persisted: true,
      message: refreshedStatus.databaseConfigured
        ? 'Session snapshot added to the database sync queue. Wire this queue into Supabase, Postgres, or Mongo for production writes.'
        : 'Session snapshot saved locally and mirrored into the sync queue for future database handoff.',
      status: refreshedStatus,
    }
  }
}

export const databaseSyncService = new DatabaseSyncService()
