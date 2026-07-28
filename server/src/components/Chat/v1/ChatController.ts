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
      title: title || 'Chat with Sahayak',
      language: language || user.language || 'hi'
    });
    return res.status(201).json(session);
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

    const history = await ChatMessage.findAll({
      where: { sessionId: session_id },
      order: [['createdAt', 'ASC']],
      limit: 10
    });

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

    const systemPrompt = `You are AgriSmart AI Sahayak, a helpful assistant for rural Indian farmers and buyers.
Your goal is to answer queries about crop diseases, weather anomalies, farming methods, market rates, and government schemes.
Keep responses concise, practical, easy to read, and formatted in Markdown.
Always reply in the farmer's language of choice (English or Hindi).

${context ? `Here is some verified agricultural context that might help answer the user's question:\n${context}` : ''}`;

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
      model: 'llama-3.1-8b-instant',
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

export default { getActiveSession, createSession, getSessionMessages, sendMessageStream };
