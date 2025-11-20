import express from 'express';
import multer from 'multer';
import { diskStorageFor } from '../services/uploadService';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

const receiptUpload = multer({ storage: diskStorageFor('receipts') });
const billUpload = multer({ storage: diskStorageFor('bills') });
const invoiceUpload = multer({ storage: diskStorageFor('invoices') });

router.post('/receipt', receiptUpload.single('file'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ 
    url: `/uploads/receipts/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

router.post('/bill', billUpload.single('file'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ 
    url: `/uploads/bills/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

router.post('/invoice', invoiceUpload.single('file'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ 
    url: `/uploads/invoices/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

export default router;
