import express from 'express';
import Controller from './ChatController.js';
import { requireAuth } from '../../../middlewares/auth.js';

const router = express.Router();

router.get('/sessions/active', requireAuth, Controller.getActiveSession);
router.post('/sessions', requireAuth, Controller.createSession);
router.get('/sessions/:id/messages', requireAuth, Controller.getSessionMessages);
router.post('/message', requireAuth, Controller.sendMessageStream);

export default router;
