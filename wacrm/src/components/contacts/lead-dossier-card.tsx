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
  Utensils,
  Bike,
  Store,
  PhoneCall,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface LeadDossierData {
  place_id?: string;
  nome_verificado: string;
  endereco_formatado?: string;
  telefone?: string;
  telefone_estabelecimento?: string;
  site_oficial?: string;
  link_cardapio?: string | null;
  modalidades_atendimento?: {
    permite_entrega?: boolean;
    permite_consumo_local?: boolean;
    permite_retirada?: boolean;
    modalidade?: string;
  };
  avaliacoes_positivas?: Array<{
    author: string;
    rating: number;
    text: string;
    published_time?: string;
  }>;
  google_maps_url?: string;
  nota?: number | null;
  total_avaliacoes?: number;
  nicho_detectado?: string;
  elogios_destaque?: Array<{ author: string; rating: number; text: string }>;
  dores_destaque?: Array<{ author: string; rating: number; text: string }>;
  pitch_comercial_sugerido?: string;
  fotos?: Array<{
    id: number;
    photo_url: string;
    tipo?: 'cardapio' | 'foto_normal';
    attribution?: string;
  }>;
  horarios_funcionamento?: string[];
  aberto_agora?: boolean;
}

interface LeadDossierCardProps {
  dossie?: LeadDossierData | null;
  leadId?: number | string | null;
  leadPhone?: string;
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
  leadPhone,
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
  const [filterFoto, setFilterFoto] = useState<'todas' | 'cardapio' | 'foto_normal'>('todas');

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

  const mapsPhone = dossie.telefone_estabelecimento || dossie.telefone || '';
  const leadClean = (leadPhone || '').replace(/\D/g, '');
  const mapsClean = mapsPhone.replace(/\D/g, '');
  const hasPhoneDivergence = Boolean(leadClean && mapsClean && leadClean !== mapsClean);

  const fotos = dossie.fotos || [];
  const fotosFiltradas = fotos.filter((f) => {
    if (filterFoto === 'cardapio') return f.tipo === 'cardapio';
    if (filterFoto === 'foto_normal') return f.tipo !== 'cardapio';
    return true;
  });

  // Estado 2: Dossiê enriquecido e ativo (Decision Gate)
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-sm text-left">
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

      {/* Barra de Ações Rápidas: Site Oficial + Cardápio + Maps */}
      <div className="flex flex-wrap items-center gap-2">
        {dossie.site_oficial && (
          <a
            href={dossie.site_oficial}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
          >
            <Globe className="h-3 w-3 text-primary" />
            <span>Site Oficial</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </a>
        )}

        {dossie.link_cardapio && (
          <a
            href={dossie.link_cardapio}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition"
          >
            <Utensils className="h-3 w-3" />
            <span>Ver Cardápio</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
          </a>
        )}

        {dossie.google_maps_url && (
          <a
            href={dossie.google_maps_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <MapPin className="h-3 w-3 text-red-400" />
            <span>Google Maps</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </a>
        )}
      </div>

      {/* Modalidades de Atendimento (Entrega, Consumo Local, Retirada) */}
      {dossie.modalidades_atendimento && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {dossie.modalidades_atendimento.permite_entrega && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
              <Bike className="h-3 w-3" />
              Entrega / Delivery
            </Badge>
          )}
          {dossie.modalidades_atendimento.permite_consumo_local && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-blue-500/10 border-blue-500/30 text-blue-400">
              <Store className="h-3 w-3" />
              Consumo no Local
            </Badge>
          )}
          {dossie.modalidades_atendimento.permite_retirada && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 border-amber-500/30 text-amber-400">
              <Utensils className="h-3 w-3" />
              Retirada no Local
            </Badge>
          )}
        </div>
      )}

      {/* Alerta de Divergência de Telefones (Lead WhatsApp vs Maps) */}
      {hasPhoneDivergence && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-blue-400 font-semibold">
            <span className="flex items-center gap-1">
              <PhoneCall className="h-3.5 w-3.5" />
              Telefones Diferentes Detectados
            </span>
            <Badge variant="outline" className="text-[9px] border-blue-500/40 text-blue-400">
              Divergente
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-1.5 rounded bg-background/50 border border-border/50 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-bold">WhatsApp do Lead</span>
                <span className="font-mono text-foreground font-medium">{leadPhone}</span>
              </div>
              <a
                href={`https://wa.me/${leadClean}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 p-1"
                title="Conversar no WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="p-1.5 rounded bg-background/50 border border-border/50 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-bold">Maps (Estabelecimento)</span>
                <span className="font-mono text-foreground font-medium">{mapsPhone}</span>
              </div>
              <a
                href={`tel:${mapsClean}`}
                className="text-primary hover:text-primary/80 p-1"
                title="Ligar para o estabelecimento"
              >
                <Phone className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 4 Primeiras Avaliações Positivas */}
      {dossie.avaliacoes_positivas && dossie.avaliacoes_positivas.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5">
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>4 Primeiras Avaliações Positivas (Google Maps):</span>
          </div>
          <div className="space-y-1.5">
            {dossie.avaliacoes_positivas.slice(0, 4).map((pos, idx) => (
              <div key={idx} className="text-[11px] text-muted-foreground border-l-2 border-emerald-500/40 pl-2">
                <div className="flex items-center gap-1 text-[10px] text-foreground font-semibold">
                  <span>{pos.author}</span>
                  <span className="text-amber-400">★ {pos.rating}</span>
                </div>
                <p className="italic line-clamp-2">&quot;{pos.text}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
                &quot;{pain.text}&quot;
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Galeria de Fotos Curadas (Até 6) com Filtro Cardápio / Geral */}
      {fotos.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Fotos do Estabelecimento ({fotosFiltradas.length}/{fotos.length})
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setFilterFoto('todas')}
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  filterFoto === 'todas' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Todas ({fotos.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterFoto('cardapio')}
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  filterFoto === 'cardapio' ? 'bg-amber-500 text-black font-semibold' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Cardápio ({fotos.filter((f) => f.tipo === 'cardapio').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterFoto('foto_normal')}
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  filterFoto === 'foto_normal' ? 'bg-secondary text-secondary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Ambiente
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {fotosFiltradas.map((f, i) => (
              <a
                key={i}
                href={f.photo_url}
                target="_blank"
                rel="noreferrer"
                className="relative shrink-0 rounded border border-border overflow-hidden hover:opacity-85 transition group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.photo_url}
                  alt={f.tipo === 'cardapio' ? 'Cardápio' : 'Fachada/Local'}
                  className="h-14 w-20 object-cover"
                />
                {f.tipo === 'cardapio' && (
                  <span className="absolute bottom-0 inset-x-0 bg-amber-600/90 text-white font-bold text-[8px] text-center py-0.5 uppercase tracking-wide">
                    Cardápio
                  </span>
                )}
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
