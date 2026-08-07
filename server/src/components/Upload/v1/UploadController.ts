import { Request, Response } from 'express';

export const handleUploadResponse = (req: Request, res: Response) => {
  const uploadedFiles: Express.Multer.File[] = [];

  if (req.file) {
    uploadedFiles.push(req.file);
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      uploadedFiles.push(...req.files);
    } else if (typeof req.files === 'object') {
      Object.values(req.files).forEach((fileVal) => {
        if (Array.isArray(fileVal)) {
          uploadedFiles.push(...fileVal);
        }
      });
    }
  }

  if (uploadedFiles.length === 0) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const urls = uploadedFiles.map((f) => `/uploads/${f.filename}`);
  return res.status(201).json({ url: urls[0], urls });
};

export default { handleUploadResponse };
