import { describe, it, expect } from 'vitest';
import {
  filterProjectsForContact,
  extractProjectBrandName,
  getContactProjectStatus,
  PWA_GENERATION_STAGES,
  getStageByProgress,
  type ProjectQueueItem,
} from './project-queue';

describe('project-queue utilities', () => {
  const dummyContact = {
    id: 'contact-uuid-123',
    name: 'Barbearia Estilo & Corte',
    phone: '+55 11 99999-8888',
    email: 'contato@estilo.com',
  };

  it('correctly filters projects matching contact_id or name', () => {
    const list: ProjectQueueItem[] = [
      {
        id: 1,
        created_at: '2026-10-28T10:00:00Z',
        mensagem_lead: "Nome do Estabelecimento / Marca: 'Barbearia Estilo & Corte'",
        status: 'pendente',
        resultado_json: { contact_id: 'contact-uuid-123', project_name: 'Barbearia Estilo & Corte' },
        supabase_url: null,
        supabase_anon_key: null,
      },
      {
        id: 2,
        created_at: '2026-10-28T11:00:00Z',
        mensagem_lead: "Nome do Estabelecimento / Marca: 'Outra Empresa'",
        status: 'pendente',
        resultado_json: { contact_id: 'other-uuid', project_name: 'Outra Empresa' },
        supabase_url: null,
        supabase_anon_key: null,
      },
    ];

    const filtered = filterProjectsForContact(list, dummyContact);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(1);
  });

  it('determines project status as OK / concluido when already generated', () => {
    const projects: ProjectQueueItem[] = [
      {
        id: 42,
        created_at: '2026-10-28T10:00:00Z',
        mensagem_lead: 'Briefing barb',
        status: 'concluido',
        resultado_json: {
          contact_id: 'contact-uuid-123',
          project_name: 'Barbearia Estilo & Corte',
          preview_url: 'http://localhost:5174',
        },
        supabase_url: 'https://test.supabase.co',
        supabase_anon_key: 'anon-key',
      },
    ];

    const status = getContactProjectStatus(projects);
    expect(status.isGenerated).toBe(true);
    expect(status.isProcessing).toBe(false);
    expect(status.status).toBe('concluido');
    expect(status.progressPercentage).toBe(100);
    expect(status.completedProject?.id).toBe(42);
    expect(status.statusMessage).toContain('OK');
  });

  it('determines project status as processing when an active job is running', () => {
    const projects: ProjectQueueItem[] = [
      {
        id: 43,
        created_at: '2026-10-28T10:00:00Z',
        mensagem_lead: 'Briefing barb',
        status: 'processando',
        resultado_json: {
          contact_id: 'contact-uuid-123',
        },
        supabase_url: null,
        supabase_anon_key: null,
      },
    ];

    const status = getContactProjectStatus(projects);
    expect(status.isGenerated).toBe(false);
    expect(status.isProcessing).toBe(true);
    expect(status.status).toBe('processando');
    expect(status.progressPercentage).toBeGreaterThanOrEqual(15);
  });

  it('determines project status as idle when no projects exist', () => {
    const status = getContactProjectStatus([]);
    expect(status.isGenerated).toBe(false);
    expect(status.isProcessing).toBe(false);
    expect(status.status).toBe('idle');
    expect(status.progressPercentage).toBe(0);
  });

  it('determines project status as pending without active processing loop', () => {
    const projects: ProjectQueueItem[] = [
      {
        id: 44,
        created_at: '2026-10-28T10:00:00Z',
        mensagem_lead: 'Briefing barb',
        status: 'pendente',
        resultado_json: {
          contact_id: 'contact-uuid-123',
        },
        supabase_url: null,
        supabase_anon_key: null,
      },
    ];

    const status = getContactProjectStatus(projects);
    expect(status.isGenerated).toBe(false);
    expect(status.isProcessing).toBe(false);
    expect(status.status).toBe('pendente');
    expect(status.progressPercentage).toBe(0);
    expect(status.statusMessage).toContain('fila de produção');
  });

  it('retrieves correct generation stages based on percentage', () => {
    expect(PWA_GENERATION_STAGES.length).toBeGreaterThanOrEqual(5);
    const stage1 = getStageByProgress(15);
    expect(stage1.stage).toBe(1);

    const stageDone = getStageByProgress(100);
    expect(stageDone.stage).toBe(6);
    expect(stageDone.percentage).toBe(100);
  });
});
