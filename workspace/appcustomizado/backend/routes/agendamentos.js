import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../validate.js';
import { getDbClient } from '../db.js';

const router = Router();

const agendamentoSchema = z.object({
  cliente_nome: z.string().min(2, 'Nome do cliente obrigatório'),
  cliente_telefone: z.string().min(8, 'Telefone obrigatório'),
  servico_nome: z.string().min(2, 'Nome do serviço obrigatório'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  horario: z.string().regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:MM'),
  observacoes: z.string().optional(),
});

// POST /api/agendamentos
router.post('/', validateRequest({ body: agendamentoSchema }), async (req, res, next) => {
  try {
    const db = getDbClient();
    const novoAgendamento = {
      id: `AG-${Date.now()}`,
      ...req.body,
      status: 'Confirmado',
      created_at: new Date().toISOString(),
    };
    if (db) {
      await db.from('agendamentos').insert([novoAgendamento]);
    }
    res.status(201).json({
      success: true,
      mensagem: 'Horário reservado com sucesso!',
      agendamento: novoAgendamento,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
