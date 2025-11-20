import express from 'express';
import Client from '../models/Client';
const router = express.Router();
router.get('/', async (req,res)=> { const items = await Client.find().lean(); res.json(items); });
router.post('/', async (req,res)=> { const c = await Client.create(req.body); res.json(c); });
export default router;
