import { Router } from 'express';
import { checkDbHealth } from '../db.js';

const router = Router();

router.get('/health', async (req, res) => {
  const dbHealth = await checkDbHealth();
  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbHealth.status,
  });
});

export default router;
