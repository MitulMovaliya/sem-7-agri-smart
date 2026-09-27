import { Request, Response, NextFunction } from 'express';
import { ChatSession, ChatMessage, Document, User } from '../../index.js';
import Helper from './ChatHelper.js';
import { Groq } from 'groq-sdk';
import logger from '../../../utils/logger.js';

const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
  logger.warn("WARNING: GROQ_API_KEY is missing from environment variables.");
}
const groq = new Groq({ apiKey: groqApiKey || '' });
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export const getAllSessions = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as User;
  try {
    const sessions = await ChatSession.findAll({
      where: { userId: user.id },
      order: [['updatedAt', 'DESC']]
    });
    return res.json(sessions);
  } catch (err) {
    return next(err);
  }
};

export const getActiveSession = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as User;
  try {
    const session = await ChatSession.findOne({
      where: { userId: user.id },
      order: [['updatedAt', 'DESC']]
    });
    return res.json(session || null);
  } catch (err) {
    return next(err);
  }
};

export const createSession = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as User;
  const { title, language } = req.body;
  const threadId = `thread_${Math.random().toString(36).substring(7)}`;

  try {
    const session = await ChatSession.create({
      userId: user.id,
      threadId,
      title: title || 'Chat with AI Assistant',
      language: language || user.language || 'en'
    });
    return res.status(201).json(session);
  } catch (err) {
    return next(err);
  }
};

export const deleteSession = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = req.user as User;

  try {
    const session = await ChatSession.findByPk(id);
    if (!session || session.userId !== user.id) {
      return res.status(404).json({ error: 'Chat session not found or access denied.' });
    }

    await ChatMessage.destroy({ where: { sessionId: id } });
    await session.destroy();

    return res.json({ message: 'Chat session deleted successfully.' });
  } catch (err) {
    return next(err);
  }
};

export const getSessionMessages = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = req.user as User;

  try {
    const session = await ChatSession.findByPk(id);
    if (!session || session.userId !== user.id) {
      return res.status(404).json({ error: 'Chat session not found or access denied.' });
    }

    const messages = await ChatMessage.findAll({
      where: { sessionId: id },
      order: [['createdAt', 'ASC']]
    });

    return res.json(messages);
  } catch (err) {
    return next(err);
  }
};

export const sendMessageStream = async (req: Request, res: Response) => {
  const { session_id, prompt } = req.body;
  const user = req.user as User;

  if (!session_id || !prompt) {
    return res.status(400).json({ error: "session_id and prompt are required." });
  }

  try {
    const session = await ChatSession.findByPk(session_id);
    if (!session || session.userId !== user.id) {
      return res.status(404).json({ error: "Chat session not found or access denied." });
    }

    // Auto-update session title on first message if default
    if (session.title === 'Chat with Sahayak' || session.title === 'Chat with AI Assistant' || session.title === 'New Chat' || !session.title) {
      const generatedTitle = prompt.trim().substring(0, 35) + (prompt.trim().length > 35 ? '...' : '');
      session.title = generatedTitle;
    }

    // Fetch only the most recent 6 messages to keep context focused & efficient
    const rawHistory = await ChatMessage.findAll({
      where: { sessionId: session_id },
      order: [['createdAt', 'DESC']],
      limit: 6
    });
    const history = rawHistory.reverse();

    // 1. Generate query embeddings
    let context = '';
    try {
      const embedResponse = await fetch(`${ML_SERVICE_URL}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt })
      });

      if (embedResponse.ok) {
        const { embedding } = await embedResponse.json();

        // 2. Query documents and compute similarity
        const allDocs = await Document.findAll();
        const scoredDocs = allDocs
          .map((doc: any) => ({
            content: doc.content,
            similarity: Helper.cosineSimilarity(embedding, doc.embedding)
          }))
          .filter(doc => doc.similarity >= 0.7)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3);

        if (scoredDocs.length > 0) {
          context = scoredDocs.map(d => d.content).join('\n---\n');
        }
      }
    } catch (err) {
      logger.warn("RAG embedding retrieval failed, falling back to basic prompt.", { error: err });
    }

    const systemPrompt = `You are AgriSmart AI Assistant, an expert agricultural advisor for farmers and agricultural traders.

CRITICAL LANGUAGE RULE:
- You MUST reply EXCLUSIVELY in clear, natural, and professional English language.
- Even if the user submits queries in Hindi, Gujarati, Hinglish, or any other non-English language, understand their intent but provide your response STRICTLY in English.

CORE RESPONSIBILITIES & GUIDELINES:
- Provide high-quality, accurate, and practical advice on crop health, soil nutrients (NPK), pest/disease control, irrigation, weather adaptation, market prices, and government schemes.
- Structure your response cleanly using GitHub-flavored Markdown (bold headings, key highlights, clear bullet points, step-by-step instructions).
- Keep answers direct, professional, concise, and easy to read.

${context ? `VERIFIED AGRICULTURAL KNOWLEDGE BASE CONTEXT:\n${context}` : ''}`;

    const groqMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      { role: 'user' as const, content: prompt }
    ];

    // SSE headers setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await groq.chat.completions.create({
      messages: groqMessages,
      model: GROQ_MODEL,
      stream: true,
    });

    let completeResponse = '';

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      completeResponse += text;
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    // Save messages to DB
    await ChatMessage.create({
      sessionId: session_id,
      role: 'user',
      content: prompt
    });

    await ChatMessage.create({
      sessionId: session_id,
      role: 'assistant',
      content: completeResponse
    });

    // Mark session updated
    session.changed('updatedAt', true);
    await session.save();

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    logger.error("Chatbot processing controller error:", { error });
    res.status(500).end();
  }
};

export default { getAllSessions, getActiveSession, createSession, deleteSession, getSessionMessages, sendMessageStream };
