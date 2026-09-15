'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, RefreshCw, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilaProjetosModal } from '@/components/projects/fila-projetos-modal';

interface FilaProjetoItem {
  id: number;
  created_at: string;
  mensagem_lead: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
}

export function FilaProjetosWidget() {
  const [projetos, setProjetos] = useState<FilaProjetoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadFila = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projetos');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setProjetos(data.slice(0, 5));
      }
    } catch (err) {
      console.error('Erro ao carregar projetos no widget do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFila();
  }, []);

  function extractBrandName(mensagem: string, id: number) {
    if (!mensagem) return `Projeto #${id}`;
    const match = mensagem.match(/Nome do Estabelecimento \/ Marca'?:\s*'([^']+)'/i);
    return match ? match[1] : `Projeto #${id}`;
  }

  function extractContactInfo(mensagem: string) {
    if (!mensagem) return 'Contato não informado';
    const match = mensagem.match(/Contato do Cliente'?:\s*([^\n]+)/i);
    return match ? match[1] : 'Contato registrado';
  }

  function renderStatusBadge(status: string) {
    switch (status) {
      case 'concluido':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] py-0 font-semibold">
            Concluído
          </Badge>
        );
      case 'processando':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] py-0 font-semibold animate-pulse">
            Processando...
          </Badge>
        );
      case 'erro':
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] py-0 font-semibold">
            Erro
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] py-0 font-semibold">
            Pendente
          </Badge>
        );
    }
  }

  return (
    <>
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary animate-pulse" />
            <h2 className="text-sm font-semibold text-foreground">Novos Leads de Projetos (Fila IA)</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="text-xs text-primary hover:text-primary/80 hover:bg-muted/50 gap-1 px-2 h-7"
          >
            Ver Fila Completa <ArrowRight className="size-3" />
          </Button>
        </header>

        {loading ? (
          <div className="p-6 flex items-center justify-center text-muted-foreground gap-2 text-xs">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Carregando novos leads da fábrica...</span>
          </div>
        ) : projetos.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Nenhum lead de projeto registrado recentemente.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projetos.map((p) => {
              const brand = extractBrandName(p.mensagem_lead, p.id);
              const contactInfo = extractContactInfo(p.mensagem_lead);
              return (
                <div
                  key={p.id}
                  onClick={() => setModalOpen(true)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">{brand}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">#{p.id}</span>
                      {renderStatusBadge(p.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{contactInfo}</p>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                    {new Date(p.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <FilaProjetosModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
