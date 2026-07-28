import { Request, Response } from 'express';

export const handleUploadResponse = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.status(201).json({ url: fileUrl });
};

export default { handleUploadResponse };
