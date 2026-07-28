import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Controller from './UploadController.js';
import { requireAuth } from '../../../middlewares/auth.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
const router = express.Router();

router.post('/', requireAuth, upload.single('image'), Controller.handleUploadResponse);
router.post('/register', upload.single('image'), Controller.handleUploadResponse);

export default router;
