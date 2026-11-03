import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../validate.js';
import { getDbClient } from '../db.js';

const router = Router();

const servicoSchema = z.object({
  nome: z.string().min(2, 'Nome do serviço obrigatório'),
  duracao_minutos: z.number().int().positive().default(30),
  preco: z.number().positive('Preço deve ser positivo'),
  categoria: z.string().optional().default('Geral'),
});

// GET /api/servicos
router.get('/', async (req, res, next) => {
  try {
    const db = getDbClient();
    if (db) {
      const { data, error } = await db.from('servicos').select('*').order('nome');
      if (!error && data) return res.json({ success: true, servicos: data });
    }
    res.json({
      success: true,
      empresa: 'Clínica',
      servicos: [
        { id: 1, nome: 'Atendimento Especializado', duracao_minutos: 45, preco: 90.0 },
        { id: 2, nome: 'Consulta / Avaliação', duracao_minutos: 30, preco: 60.0 },
      ],
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/servicos
router.post('/', validateRequest({ body: servicoSchema }), async (req, res, next) => {
  try {
    const db = getDbClient();
    if (db) {
      const { data, error } = await db.from('servicos').insert([req.body]).select().single();
      if (!error) return res.status(201).json({ success: true, servico: data });
    }
    res.status(201).json({ success: true, servico: { id: Date.now(), ...req.body } });
  } catch (err) {
    next(err);
  }
});

export default router;
