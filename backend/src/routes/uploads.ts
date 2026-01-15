import express from 'express';
import { createUploader } from '../services/uploadService';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

// Create secure uploaders with file validation
const receiptUpload = createUploader('receipts');
const billUpload = createUploader('bills');
const invoiceUpload = createUploader('invoices');

// Error handler for multer errors
const handleUploadError = (err: any, req: any, res: any, next: any) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (err.message.includes('Invalid file type')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(400).json({ error: 'Upload failed: ' + err.message });
  }
  next();
};

router.post('/receipt', receiptUpload.single('file'), handleUploadError, async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ 
    url: `/uploads/receipts/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

router.post('/bill', billUpload.single('file'), handleUploadError, async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ 
    url: `/uploads/bills/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

router.post('/invoice', invoiceUpload.single('file'), handleUploadError, async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ 
    url: `/uploads/invoices/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

export default router;
