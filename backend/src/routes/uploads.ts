import express from 'express';
import multer from 'multer';
import { diskStorageFor } from '../services/uploadService';
const router = express.Router();
const up = multer({ storage: diskStorageFor('receipts') });
router.post('/receipt', up.single('file'), async (req:any,res)=> {
  if(!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: `/uploads/receipts/${req.file.filename}` });
});
export default router;
