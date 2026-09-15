'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Sparkles, Layers, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FilaProjeto {
  id: number;
  created_at: string;
  mensagem_lead: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  resultado_json: any;
  supabase_url: string | null;
  supabase_anon_key: string | null;
}

interface FilaProjetosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilaProjetosModal({ open, onOpenChange }: FilaProjetosModalProps) {
  const [projetos, setProjetos] = useState<FilaProjeto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<FilaProjeto | null>(null);

  const fetchProjetos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projetos');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setProjetos(data);
      } else {
        toast.error(data.error || 'Falha ao carregar fila de projetos');
      }
    } catch (err) {
      toast.error('Erro de conexão ao carregar fila de projetos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchProjetos();
      setSelectedProjeto(null);
    }
  }, [open, fetchProjetos]);

  function getStatusBadge(status: FilaProjeto['status']) {
    switch (status) {
      case 'concluido':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 gap-1 font-semibold">
            <CheckCircle2 className="size-3" /> Concluído
          </Badge>
        );
      case 'processando':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 gap-1 font-semibold animate-pulse">
            <Loader2 className="size-3 animate-spin" /> Processando...
          </Badge>
        );
      case 'erro':
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 gap-1 font-semibold">
            <AlertCircle className="size-3" /> Erro
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 gap-1 font-semibold">
            <Clock className="size-3" /> Pendente
          </Badge>
        );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-popover-foreground max-w-4xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
          <div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="size-5 text-primary animate-pulse" />
              Fila de Projetos (IA Software Factory)
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Visualize todos os registros armazenados na tabela <code className="text-primary font-mono text-xs">fila_projetos</code>.
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProjetos}
            disabled={loading}
            className="border-border text-muted-foreground hover:bg-muted gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0 pt-4 overflow-hidden">
          {/* List of projects */}
          <div className="md:col-span-5 flex flex-col border border-border rounded-lg overflow-hidden bg-card">
            <div className="p-3 bg-muted/40 border-b border-border font-semibold text-xs text-muted-foreground flex justify-between items-center">
              <span>PROJETOS REGISTRADOS</span>
              <Badge variant="secondary" className="text-[10px]">
                {projetos.length} itens
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="text-xs">Carregando projetos...</span>
                </div>
              ) : projetos.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhum projeto encontrado na fila.
                </div>
              ) : (
                projetos.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjeto(p)}
                    className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedProjeto?.id === p.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-foreground">Projeto #{p.id}</span>
                      {getStatusBadge(p.status)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                      {p.mensagem_lead ? p.mensagem_lead.split('\n')[0] : 'Sem descrição'}
                    </p>
                    <div className="text-[10px] text-muted-foreground mt-1.5 opacity-70">
                      {new Date(p.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Details view */}
          <div className="md:col-span-7 flex flex-col border border-border rounded-lg bg-card overflow-hidden">
            <div className="p-3 bg-muted/40 border-b border-border font-semibold text-xs text-muted-foreground">
              DETALHES DO REGISTRO NA FILA
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedProjeto ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Projeto #{selectedProjeto.id}</h4>
                      <p className="text-xs text-muted-foreground">
                        Criado em: {new Date(selectedProjeto.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {getStatusBadge(selectedProjeto.status)}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Mensagem do Lead / Briefing
                    </label>
                    <pre className="p-3 bg-muted/60 rounded-lg text-xs text-foreground font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-border/50">
                      {selectedProjeto.mensagem_lead}
                    </pre>
                  </div>

                  {selectedProjeto.resultado_json && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Resultado / Metadados JSON
                      </label>
                      <pre className="p-3 bg-muted/60 rounded-lg text-xs text-emerald-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto border border-border/50">
                        {JSON.stringify(selectedProjeto.resultado_json, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedProjeto.supabase_url && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Supabase Tenant Vinculado
                      </label>
                      <div className="p-2.5 bg-muted/40 rounded-lg text-xs text-foreground font-mono truncate border border-border/50">
                        {selectedProjeto.supabase_url}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                  <Layers className="size-8 mb-2 opacity-40" />
                  <p className="text-xs">Selecione um projeto à esquerda para visualizar todos os dados salvos na tabela <code className="text-primary">fila_projetos</code>.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
