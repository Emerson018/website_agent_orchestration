'use client';

import React, { useState } from 'react';
import {
  Star,
  MapPin,
  ThumbsUp,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Loader2,
  Building2,
  Clock,
  Phone,
  Globe,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface LeadDossierData {
  place_id?: string;
  nome_verificado: string;
  endereco_formatado?: string;
  telefone?: string;
  site_oficial?: string;
  google_maps_url?: string;
  nota?: number | null;
  total_avaliacoes?: number;
  nicho_detectado?: string;
  elogios_destaque?: Array<{ author: string; rating: number; text: string }>;
  dores_destaque?: Array<{ author: string; rating: number; text: string }>;
  pitch_comercial_sugerido?: string;
  fotos?: Array<{ id: number; photo_url: string }>;
  horarios_funcionamento?: string[];
  aberto_agora?: boolean;
}

interface LeadDossierCardProps {
  dossie?: LeadDossierData | null;
  leadId?: number | string | null;
  companyName?: string;
  targetUrl?: string;
  onTriggerPwaGeneration?: () => void;
  isGeneratingPwa?: boolean;
  onDossierEnriched?: (dossie: LeadDossierData) => void;
  onArchiveLead?: () => void;
}

export function LeadDossierCard({
  dossie: initialDossie,
  leadId,
  companyName,
  targetUrl,
  onTriggerPwaGeneration,
  isGeneratingPwa,
  onDossierEnriched,
  onArchiveLead,
}: LeadDossierCardProps) {
  const [dossie, setDossie] = useState<LeadDossierData | null>(initialDossie || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegeneratingPitch, setIsRegeneratingPitch] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  // Helper para URL base da API do portal
  const apiBase =
    typeof window !== 'undefined'
      ? (window as any).__PORTAL_BACKEND_URL__ || 'http://localhost:5000'
      : 'http://localhost:5000';

  React.useEffect(() => {
    if (initialDossie) {
      setDossie(initialDossie);
    }
  }, [initialDossie]);

  async function handleEnrichDossier() {
    setIsLoading(true);
    try {
      const query = targetUrl || companyName || '';
      if (!query) {
        toast.error('Informe o site, link do Google Maps ou nome da empresa.');
        setIsLoading(false);
        return;
      }

      let res;
      if (leadId) {
        res = await fetch(`${apiBase}/api/leads/${leadId}/enrich-dossier`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
      } else {
        res = await fetch(`${apiBase}/api/dossie/consultar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
      }

      const data = await res.json();
      if (res.ok && data.success && data.dossie) {
        setDossie(data.dossie);
        onDossierEnriched?.(data.dossie);
        toast.success('Dossiê do Google Maps extraído com sucesso!');
      } else {
        if (data.code === 'MISSING_API_KEY') {
          toast.warning(data.error || 'Configure GOOGLE_MAPS_API_KEY no arquivo .env.');
        } else {
          toast.error(data.error || 'Não foi possível extrair os dados do Google Maps.');
        }
      }
    } catch (err: any) {
      toast.error('Erro de conexão ao consultar serviço de inteligência.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateAIPitch() {
    if (!dossie) return;
    setIsRegeneratingPitch(true);
    try {
      const res = await fetch(`${apiBase}/api/dossie/consultar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: dossie.nome_verificado || companyName }),
      });
      const data = await res.json();
      if (res.ok && data.dossie?.pitch_comercial_sugerido) {
        setDossie((prev) => (prev ? { ...prev, pitch_comercial_sugerido: data.dossie.pitch_comercial_sugerido } : null));
        toast.success('Novo pitch comercial sintetizado com IA!');
      } else {
        toast.info('Pitch atualizado com base nos dados do Dossiê.');
      }
    } catch {
      toast.info('Pitch mantido com base nos reviews do Maps.');
    } finally {
      setIsRegeneratingPitch(false);
    }
  }

  function handleCopyPitch() {
    if (!dossie?.pitch_comercial_sugerido) return;
    navigator.clipboard.writeText(dossie.pitch_comercial_sugerido);
    setCopiedPitch(true);
    toast.success('Pitch de vendas copiado para a área de transferência!');
    setTimeout(() => setCopiedPitch(false), 3000);
  }

  function handleArchiveLead() {
    setIsArchived(true);
    onArchiveLead?.();
    toast.info('Lead arquivado no funil comercial.');
  }

  if (isArchived) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
        <span>Lead arquivado / desqualificado pelo operador.</span>
      </div>
    );
  }

  // Estado 1: Dossiê ainda não carregado
  if (!dossie) {
    return (
      <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs text-amber-500">
            <Building2 className="h-4 w-4" />
            <span>Dossiê Google Maps (Pendente)</span>
          </div>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
            Aguardando Decisão
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Antes de gerar o site, consulte a inteligência do Google Maps para entender as avaliações,
          dores dos clientes e fotos reais deste negócio.
        </p>
        <Button
          onClick={handleEnrichDossier}
          disabled={isLoading}
          size="sm"
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Consultando Google Places API...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>Extrair Dossiê do Estabelecimento</span>
            </>
          )}
        </Button>
      </div>
    );
  }

  // Estado 2: Dossiê enriquecido e ativo (Decision Gate)
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm text-left">
      {/* Cabeçalho do Dossiê */}
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1">
              {dossie.nome_verificado}
            </h4>
            {dossie.google_maps_url && (
              <a
                href={dossie.google_maps_url}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-primary"
                title="Abrir no Google Maps"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {dossie.endereco_formatado && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-red-400 shrink-0" />
              <span className="line-clamp-1">{dossie.endereco_formatado}</span>
            </p>
          )}
        </div>

        {/* Nota / Rating */}
        {dossie.nota && (
          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded text-amber-500 font-bold text-xs">
              <Star className="h-3.5 w-3.5 fill-amber-500" />
              <span>{dossie.nota.toFixed(1)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {dossie.total_avaliacoes} reviews
            </span>
          </div>
        )}
      </div>

      {/* Dores & Reclamações Recorrentes (Inteligência Comercial) */}
      {dossie.dores_destaque && dossie.dores_destaque.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-red-500/5 border border-red-500/20 p-2.5">
          <div className="flex items-center gap-1 text-[11px] font-bold text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Dores / Reclamações dos Clientes no Google:</span>
          </div>
          <div className="space-y-1">
            {dossie.dores_destaque.map((pain, idx) => (
              <p key={idx} className="text-[11px] text-muted-foreground italic">
                "{pain.text}"
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Elogios Mais Frequentes */}
      {dossie.elogios_destaque && dossie.elogios_destaque.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5">
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>Pontos Fortes Elogiados:</span>
          </div>
          <div className="space-y-1">
            {dossie.elogios_destaque.slice(0, 2).map((praise, idx) => (
              <p key={idx} className="text-[11px] text-muted-foreground italic">
                "{praise.text}"
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Galeria de Fotos do Local */}
      {dossie.fotos && dossie.fotos.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Fotos do Estabelecimento
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {dossie.fotos.map((f, i) => (
              <a
                key={i}
                href={f.photo_url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded border border-border overflow-hidden hover:opacity-85 transition"
              >
                <img
                  src={f.photo_url}
                  alt="Fachada/Local"
                  className="h-12 w-16 object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Pitch Comercial Sugerido */}
      {dossie.pitch_comercial_sugerido && (
        <div className="space-y-1.5 rounded-lg bg-primary/5 border border-primary/20 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Pitch de Vendas Sugerido (WhatsApp)
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateAIPitch}
                disabled={isRegeneratingPitch}
                className="h-6 px-1.5 text-[10px] flex items-center gap-1 text-primary hover:bg-primary/10"
                title="Regerar pitch com IA"
              >
                <RefreshCw className={`h-3 w-3 ${isRegeneratingPitch ? 'animate-spin' : ''}`} />
                <span>IA</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPitch}
                className="h-6 px-1.5 text-[10px] flex items-center gap-1 text-primary hover:bg-primary/10"
              >
                {copiedPitch ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedPitch ? 'Copiado!' : 'Copiar'}</span>
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {dossie.pitch_comercial_sugerido}
          </p>
        </div>
      )}

      {/* Painel de Decisão do Operador (Decision Gate) */}
      <div className="pt-2 border-t border-border/60 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block text-center">
          Decisão Comercial
        </span>
        <div className="flex gap-2">
          <Button
            onClick={onTriggerPwaGeneration}
            disabled={isGeneratingPwa}
            size="sm"
            className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5"
          >
            {isGeneratingPwa ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Gerando PWA...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Aprovar & Gerar PWA</span>
              </>
            )}
          </Button>

          <Button
            onClick={handleArchiveLead}
            variant="outline"
            size="sm"
            className="px-2.5 text-xs text-muted-foreground hover:text-red-400 hover:border-red-400/40"
            title="Desqualificar ou arquivar lead"
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
