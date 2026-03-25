import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { orchestrator } from '../agents/orchestrator.js';
import { sessionService } from '../services/session.js';
import { llmService } from '../services/llm.js';
import { ragService } from '../services/rag.js';
import { vectorStore } from '../services/vectorStore.js';
import { telemetryService } from '../services/telemetry.js';
import { evalService } from '../services/evals.js';
import { databaseSyncService } from '../services/databaseSync.js';
import { reportingService } from '../services/reporting.js';
import { getErrorMessage, getErrorStatus } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { register } from '../utils/metrics.js';
import type { Document, DocumentType, Message } from '../types/index.js';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function getWorkspaceId(req: Request): string {
  return req.header('x-workspace-id')?.trim() || 'local-workspace';
}

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Metrics endpoint
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Session endpoints
router.get('/sessions', (req: Request, res: Response) => {
  res.json(sessionService.getAllSessions(getWorkspaceId(req)));
});

router.get('/telemetry', (req: Request, res: Response) => {
  res.json(telemetryService.getSummary());
});

router.get('/persistence/status', (_req: Request, res: Response) => {
  res.json(databaseSyncService.getStatus());
});

router.post('/sessions', (req: Request, res: Response) => {
  try {
    const session = sessionService.createSession(getWorkspaceId(req), req.body.name);
    res.status(201).json(session);
  } catch (error) {
    logger.error('Failed to create session', { error });
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'Failed to create session') });
  }
});

router.get('/sessions/:id', (req: Request, res: Response) => {
  const session = sessionService.getSession(req.params.id, getWorkspaceId(req));
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

router.delete('/sessions/:id', (req: Request, res: Response) => {
  const session = sessionService.getSession(req.params.id, getWorkspaceId(req));
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const deleted = sessionService.deleteSession(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.status(204).send();
});

router.post('/sessions/:id/persist', async (req: Request, res: Response) => {
  try {
    const session = sessionService.getSession(req.params.id, getWorkspaceId(req));
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const result = await databaseSyncService.syncSession(session);
    res.json(result);
  } catch (error) {
    logger.error('Session persistence handoff failed', { error });
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'Failed to queue session persistence') });
  }
});

router.get('/sessions/:id/reports', (req: Request, res: Response) => {
  const session = sessionService.getSession(req.params.id, getWorkspaceId(req));
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    reports: sessionService.getReports(session.id),
  });
});

router.post('/sessions/:id/reports/generate', async (req: Request, res: Response) => {
  try {
    const session = sessionService.getSession(req.params.id, getWorkspaceId(req));
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const documentId = typeof req.body?.documentId === 'string' ? req.body.documentId : undefined;
    const document = documentId
      ? sessionService.getDocument(session.id, documentId)
      : session.documents[session.documents.length - 1];

    const report = await reportingService.generateWorkspaceReport(session, document || undefined);
    sessionService.addReport(session.id, report);

    res.status(201).json(report);
  } catch (error) {
    logger.error('Workspace report generation failed', { error });
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'Failed to generate workspace report') });
  }
});

router.post('/sessions/:sessionId/documents/parsed', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = sessionService.getSession(sessionId, getWorkspaceId(req));
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { name, type, size, content, data, columns } = req.body as Partial<Document>;

    if (!name || !type || !size) {
      return res.status(400).json({ error: 'Document name, type, and size are required' });
    }

    const normalizedType = type as DocumentType;
    const document: Document = {
      id: uuidv4(),
      name,
      type: normalizedType,
      size,
      content,
      data,
      columns,
      metadata: {
        uploadedAt: new Date(),
        rowCount: Array.isArray(data) ? data.length : undefined,
        wordCount: typeof content === 'string' ? content.split(/\s+/).filter(word => word).length : undefined,
      },
    };

    sessionService.addDocument(sessionId, document);

    logger.info('Parsed document added to session', {
      sessionId,
      documentId: document.id,
      type: document.type,
      size: document.size,
    });

    res.status(201).json(document);
  } catch (error) {
    logger.error('Parsed document save failed', { error });
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'Failed to save document') });
  }
});

router.delete('/sessions/:sessionId/documents/:documentId', (req: Request, res: Response) => {
  const { sessionId, documentId } = req.params;
  const session = sessionService.getSession(sessionId, getWorkspaceId(req));
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const deleted = sessionService.deleteDocument(sessionId, documentId);
  if (!deleted) {
    return res.status(404).json({ error: 'Document not found' });
  }

  vectorStore.deleteDocument(documentId);
  res.status(204).send();
});

// Document upload
router.post('/sessions/:sessionId/documents', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const session = sessionService.getSession(sessionId, getWorkspaceId(req));
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    let document: Document;

    if (ext === 'csv') {
      const content = file.buffer.toString('utf-8');
      const parsed = Papa.parse(content, { header: true });
      const data = (parsed.data as Record<string, unknown>[]).filter(
        row => Object.values(row).some(v => v)
      );

      document = {
        id: uuidv4(),
        name: file.originalname,
        type: 'csv',
        size: file.size,
        data,
        columns: parsed.meta.fields || [],
        metadata: {
          uploadedAt: new Date(),
          rowCount: data.length,
        },
      };
    } else if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

      document = {
        id: uuidv4(),
        name: file.originalname,
        type: 'xlsx',
        size: file.size,
        data,
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        metadata: {
          uploadedAt: new Date(),
          rowCount: data.length,
        },
      };
    } else if (ext === 'txt') {
      const content = file.buffer.toString('utf-8');
      document = {
        id: uuidv4(),
        name: file.originalname,
        type: 'txt',
        size: file.size,
        content,
        metadata: {
          uploadedAt: new Date(),
          wordCount: content.split(/\s+/).filter(w => w).length,
        },
      };
    } else if (ext === 'pdf') {
      // For PDF, we'd need pdf-parse - simplified for now
      document = {
        id: uuidv4(),
        name: file.originalname,
        type: 'pdf',
        size: file.size,
        content: 'PDF content extraction not implemented',
        metadata: {
          uploadedAt: new Date(),
        },
      };
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    sessionService.addDocument(sessionId, document);
    
    logger.info('Document uploaded', { 
      sessionId, 
      documentId: document.id,
      type: document.type,
      size: document.size,
    });

    res.status(201).json(document);
  } catch (error) {
    logger.error('Document upload failed', { error });
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'Failed to upload document') });
  }
});

// Chat endpoint
router.post('/sessions/:sessionId/chat', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { message, documentId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const session = sessionService.getSession(sessionId, getWorkspaceId(req));
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    sessionService.addMessage(sessionId, userMessage);

    // Get document if specified
    const document = documentId 
      ? sessionService.getDocument(sessionId, documentId)
      : session.documents[session.documents.length - 1];

    if (document && !document.metadata.indexed) {
      await ragService.indexSessionDocument(sessionId, document);
      document.metadata.indexed = true;
      document.metadata.processedAt = new Date();
    }

    // Get conversation history
    const history = session.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Process with orchestrator
    const result = await orchestrator.handleMessage(message, document || undefined, history);

    // Add assistant message
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: result.response,
      agentType: result.agentUsed as any,
      timestamp: new Date(),
      sources: result.sources,
      metadata: {
        tokensUsed: result.tokensUsed,
        responseTime: 0,
      },
    };
    sessionService.addMessage(sessionId, assistantMessage);

    res.json({
      message: assistantMessage,
      agentUsed: result.agentUsed,
      confidence: result.confidence,
      sources: result.sources,
    });
  } catch (error) {
    logger.error('Chat failed', { error });
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'Failed to process message') });
  }
});

// Streaming chat endpoint
router.post('/sessions/:sessionId/chat/stream', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { message, documentId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const session = sessionService.getSession(sessionId, getWorkspaceId(req));
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    sessionService.addMessage(sessionId, userMessage);

    const document = documentId 
      ? sessionService.getDocument(sessionId, documentId)
      : session.documents[session.documents.length - 1];

    if (document && !document.metadata.indexed) {
      await ragService.indexSessionDocument(sessionId, document);
      document.metadata.indexed = true;
      document.metadata.processedAt = new Date();
    }

    const history = session.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const result = await orchestrator.handleMessage(message, document || undefined, history);

    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: result.response,
      agentType: result.agentUsed as any,
      timestamp: new Date(),
      sources: result.sources,
      metadata: {
        tokensUsed: result.tokensUsed,
        responseTime: 0,
      },
    };
    sessionService.addMessage(sessionId, assistantMessage);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response
    const words = result.response.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ content: word + ' ' })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    if (result.sources && result.sources.length > 0) {
      res.write(`data: ${JSON.stringify({ sources: result.sources })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true, agentUsed: result.agentUsed, messageId: assistantMessage.id })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error('Streaming chat failed', { error });
    const message = getErrorMessage(error, 'Failed to process message');
    const status = getErrorStatus(error);

    if (!res.headersSent) {
      res.status(status).json({ error: message });
      return;
    }

    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Agent status
router.get('/agents/status', (req: Request, res: Response) => {
  const states = orchestrator.getAllAgentStates();
  const queue = orchestrator.getQueueStatus();
  
  res.json({
    agents: states,
    queue,
    timestamp: new Date().toISOString(),
  });
});

// Budget status
router.get('/budget', (req: Request, res: Response) => {
  const budget = llmService.getBudgetStatus();
  res.json(budget);
});

// System stats
router.get('/stats', (req: Request, res: Response) => {
  const agentStates = orchestrator.getAllAgentStates();
  const queue = orchestrator.getQueueStatus();
  const budget = llmService.getBudgetStatus();
  const ragStats = ragService.getStats();
  const telemetry = telemetryService.getSummary();
  const latestEval = evalService.listRuns(1)[0] || null;

  res.json({
    sessions: sessionService.getAllSessions(getWorkspaceId(req)).length,
    agents: {
      total: agentStates.length,
      active: agentStates.filter(a => a.status === 'processing').length,
      idle: agentStates.filter(a => a.status === 'idle').length,
    },
    tasks: queue,
    budget,
    rag: ragStats,
    telemetry,
    latestEval,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// RAG Endpoints
router.post('/rag/index', async (req: Request, res: Response) => {
  try {
    const { sessionId, documentId } = req.body;
    
    const document = sessionService.getDocument(sessionId, documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const chunkCount = await ragService.indexDocument(document);
    
    res.json({
      success: true,
      documentId: document.id,
      chunksCreated: chunkCount,
    });
  } catch (error) {
    logger.error('RAG indexing failed', { error });
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'Failed to index document') });
  }
});

router.post('/rag/query', async (req: Request, res: Response) => {
  try {
    const { question, documentId, topK = 5 } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const response = await ragService.query(question, documentId, topK);
    
    res.json(response);
  } catch (error) {
    logger.error('RAG query failed', { error });
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'Failed to process RAG query') });
  }
});

router.post('/rag/search', async (req: Request, res: Response) => {
  try {
    const { query, documentId, topK = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await vectorStore.search(query, topK, documentId);
    
    res.json({
      results: results.map(r => ({
        content: r.document.content,
        score: r.score,
        documentId: r.document.documentId,
        chunkIndex: r.document.chunkIndex,
      })),
    });
  } catch (error) {
    logger.error('Semantic search failed', { error });
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'Failed to perform semantic search') });
  }
});

router.get('/rag/stats', (req: Request, res: Response) => {
  const stats = ragService.getStats();
  res.json(stats);
});

router.get('/evals/suites', (req: Request, res: Response) => {
  res.json({
    suites: evalService.listSuites(),
  });
});

router.get('/evals/runs', (req: Request, res: Response) => {
  res.json({
    runs: evalService.listRuns(),
  });
});

router.post('/evals/run', async (req: Request, res: Response) => {
  try {
    const suiteId = typeof req.body?.suiteId === 'string'
      ? req.body.suiteId
      : 'baseline-document-qa';

    const run = await evalService.runSuite(suiteId);
    res.json(run);
  } catch (error) {
    logger.error('Eval run failed', { error });
    res.status(getErrorStatus(error)).json({ error: getErrorMessage(error, 'Failed to run eval suite') });
  }
});

export default router;
