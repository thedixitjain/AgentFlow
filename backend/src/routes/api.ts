import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { orchestrator } from '../agents/orchestrator.js';
import { sessionService } from '../services/session.js';
import { llmService } from '../services/llm.js';
import { logger } from '../utils/logger.js';
import { register } from '../utils/metrics.js';
import type { Document, Message, DocumentType } from '../types/index.js';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

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
router.post('/sessions', (req: Request, res: Response) => {
  try {
    const session = sessionService.createSession(req.body.name);
    res.status(201).json(session);
  } catch (error) {
    logger.error('Failed to create session', { error });
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.get('/sessions/:id', (req: Request, res: Response) => {
  const session = sessionService.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

router.delete('/sessions/:id', (req: Request, res: Response) => {
  const deleted = sessionService.deleteSession(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Session not found' });
  }
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

    const session = sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() as DocumentType;
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
    res.status(500).json({ error: 'Failed to upload document' });
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

    const session = sessionService.getSession(sessionId);
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
    });
  } catch (error) {
    logger.error('Chat failed', { error });
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Streaming chat endpoint
router.post('/sessions/:sessionId/chat/stream', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { message, documentId } = req.body;

    const session = sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const document = documentId 
      ? sessionService.getDocument(sessionId, documentId)
      : session.documents[session.documents.length - 1];

    const history = session.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const result = await orchestrator.handleMessage(message, document || undefined, history);

    // Stream the response
    const words = result.response.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ content: word + ' ' })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    res.write(`data: ${JSON.stringify({ done: true, agentUsed: result.agentUsed })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error('Streaming chat failed', { error });
    res.write(`data: ${JSON.stringify({ error: 'Failed to process message' })}\n\n`);
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

  res.json({
    sessions: sessionService.getSessionCount(),
    agents: {
      total: agentStates.length,
      active: agentStates.filter(a => a.status === 'processing').length,
      idle: agentStates.filter(a => a.status === 'idle').length,
    },
    tasks: queue,
    budget,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

export default router;
