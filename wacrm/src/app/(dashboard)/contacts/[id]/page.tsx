'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getContactById } from '@/lib/crm-repository';
import type { Contact, Tag, ContactTag } from '@/types';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Star,
  Clock,
  Globe,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  ThumbsUp,
  AlertTriangle,
  RotateCcw,
  MessageCircle,
  Utensils,
  Bike,
  Store,
  PhoneCall,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function ContactProfilePage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const supabase = createClient();

  const [contact, setContact] = useState<Contact | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrichingDossier, setEnrichingDossier] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  // Master Prompt State (Editable)
  const [promptMestre, setPromptMestre] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);

  const fetchContactData = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const data = await getContactById(supabase, contactId);
      if (data) {
        setContact(data);
        const addData = data.additional_data as Record<string, any> || {};
        const savedPrompt = addData.prompt_mestre || '';
        setPromptMestre(savedPrompt);
        setOriginalPrompt(savedPrompt);

        // Fetch associated tags
        const { data: tagData } = await supabase
          .from('contact_tags')
          .select('tags(*)')
          .eq('contact_id', contactId);

        if (tagData) {
          const resolvedTags = tagData.map((t: any) => t.tags).filter(Boolean);
          setTags(resolvedTags);
        }
      }
    } catch (err: any) {
      toast.error('Erro ao carregar dados do contato: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [contactId, supabase]);

  useEffect(() => {
    fetchContactData();
  }, [fetchContactData]);

  const additionalData = (contact?.additional_data || {}) as Record<string, any>;
  const dossie = additionalData.dossie || null;
  const diagnostico = additionalData.diagnostico_ia || null;
  const companyName = contact?.company || dossie?.nome_verificado || contact?.name || 'Lead Sem Nome';

  // Handler para enriquecer dossiê do Google Maps
  const handleEnrichDossier = async () => {
    if (!contactId) return;
    setEnrichingDossier(true);
    try {
      const additionalLinks = ((contact?.additional_data as any)?.links as Array<{ url: string; label?: string }>) || [];
      const mapsLink = additionalLinks.find(
        (l) => l?.url && (l.url.includes('google.com/maps') || l.url.includes('maps.app.goo.gl') || l.url.includes('share.google'))
      )?.url;
      const siteLink = additionalLinks.find(
        (l) => l?.url && (l.label?.toLowerCase().includes('site') || l.url.startsWith('http'))
      )?.url;

      const businessName =
        companyName !== 'Lead Sem Nome'
          ? companyName
          : (contact?.company || dossie?.nome_verificado || contact?.name || '');

      const searchQuery =
        businessName ||
        mapsLink ||
        siteLink ||
        contact?.company ||
        contact?.name ||
        '';

      const res = await fetch(`/api/leads/${contactId}/enrich-dossier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao consultar Google Maps.');

      if (data.dossie) {
        setContact((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            company: data.dossie.nome_verificado || prev.company,
            website: data.dossie.site_oficial || prev.website,
            additional_data: {
              ...(prev.additional_data || {}),
              dossie: data.dossie,
            },
          };
        });
      }

      toast.success('Dossiê do Google Maps atualizado com sucesso!');
      await fetchContactData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enriquecer dados com o Google Maps.');
    } finally {
      setEnrichingDossier(false);
    }
  };

  // Handler para disparar Diagnóstico Multimodal da IA
  const handleRunAiDiagnosis = async () => {
    if (!contactId) return;
    setDiagnosing(true);
    try {
      const res = await fetch(`/api/leads/${contactId}/diagnose`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Não foi possível gerar o diagnóstico multimodal.');
      }

      toast.success('Diagnóstico da IA e Prompt Mestre gerados com sucesso!');
      if (data.prompt_mestre) {
        setPromptMestre(data.prompt_mestre);
        setOriginalPrompt(data.prompt_mestre);
      }
      await fetchContactData();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao executar diagnóstico multimodal da IA.');
    } finally {
      setDiagnosing(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!promptMestre) return;
    navigator.clipboard.writeText(promptMestre);
    setCopiedPrompt(true);
    toast.success('Prompt Mestre copiado para a área de transferência! Cole na sua IA de preferência.');
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const handleCopyPitch = () => {
    if (!dossie?.pitch_comercial_sugerido) return;
    navigator.clipboard.writeText(dossie.pitch_comercial_sugerido);
    setCopiedPitch(true);
    toast.success('Pitch comercial para WhatsApp copiado!');
    setTimeout(() => setCopiedPitch(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando perfil e inteligência do lead...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <AlertCircle className="size-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Contato não encontrado</h2>
        <p className="text-sm text-muted-foreground">O contato solicitado não existe ou foi removido.</p>
        <Button onClick={() => router.push('/contacts')}>Voltar para Lista de Contatos</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Executive Top Bar & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/contacts')}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span>Voltar para Contatos</span>
          </Button>
          <div className="h-5 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {companyName}
              {dossie?.nota && (
                <Badge variant="secondary" className="gap-1 font-mono text-xs">
                  <Star className="size-3 text-amber-500 fill-amber-500" />
                  {dossie.nota.toFixed(1)} ({dossie.total_avaliacoes || 0})
                </Badge>
              )}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
              <span>WhatsApp: <strong>{contact.phone}</strong></span>
              {contact.email && <span>• {contact.email}</span>}
              {dossie?.telefone_estabelecimento &&
                contact.phone?.replace(/\D/g, '') !== dossie.telefone_estabelecimento.replace(/\D/g, '') && (
                  <span className="flex items-center gap-1 text-blue-400">
                    • <PhoneCall className="size-3" /> Maps: <strong>{dossie.telefone_estabelecimento}</strong>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-500/40 text-blue-400">Divergente</Badge>
                  </span>
                )}
              {dossie?.nicho_detectado && (
                <span className="capitalize text-primary">• {dossie.nicho_detectado}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnrichDossier}
            disabled={enrichingDossier}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${enrichingDossier ? 'animate-spin' : ''}`} />
            {enrichingDossier ? 'Consultando Maps...' : 'Atualizar Maps'}
          </Button>

          <Button
            onClick={handleRunAiDiagnosis}
            disabled={diagnosing}
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold shadow-sm"
          >
            <Sparkles className={`size-3.5 ${diagnosing ? 'animate-spin' : ''}`} />
            {diagnosing ? 'IA Diagnosticando...' : 'Diagnosticar com IA'}
          </Button>

          {dossie?.link_cardapio && (
            <a
              href={dossie.link_cardapio}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition shadow-sm"
            >
              <Utensils className="size-3.5" />
              Cardápio
            </a>
          )}

          {contact.phone && (
            <a
              href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
            >
              <MessageCircle className="size-3.5" />
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Business Intelligence Dossier (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Fotos de Alta Resolução do Google Maps */}
          {dossie?.fotos && dossie.fotos.length > 0 && (
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  Galeria de Fotos do Local ({dossie.fotos.length})
                </h2>
                <span className="text-xs text-muted-foreground">Extraídas do Google Maps</span>
              </div>

              {/* Grid de Fotos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {dossie.fotos.slice(0, 6).map((foto: any, index: number) => (
                  <div
                    key={index}
                    onClick={() => setActivePhoto(foto.photo_url)}
                    className="relative aspect-video rounded-xl overflow-hidden border border-border/60 cursor-pointer group hover:border-primary transition bg-muted/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foto.photo_url}
                      alt={`Foto ${index + 1} de ${companyName}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    {foto.tipo === 'cardapio' && (
                      <span className="absolute bottom-1 left-1 bg-amber-600/90 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow">
                        Cardápio
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <ExternalLink className="size-4 text-white drop-shadow" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card: Localização & Horários de Funcionamento */}
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              Localização & Horários de Operação
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Modalidades de Atendimento */}
            {dossie?.modalidades_atendimento && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                {dossie.modalidades_atendimento.permite_entrega && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                    <Bike className="size-3" />
                    Entrega / Delivery
                  </Badge>
                )}
                {dossie.modalidades_atendimento.permite_consumo_local && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-blue-500/10 border-blue-500/30 text-blue-400">
                    <Store className="size-3" />
                    Consumo no Local
                  </Badge>
                )}
                {dossie.modalidades_atendimento.permite_retirada && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 border-amber-500/30 text-amber-400">
                    <Utensils className="size-3" />
                    Retirada no Local
                  </Badge>
                )}
              </div>
            )}

              {/* Endereço */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Endereço Físico</span>
                <p className="text-sm text-foreground">
                  {dossie?.endereco_formatado || contact.company || 'Consulte o perfil no Maps'}
                </p>
                {dossie?.google_maps_url && (
                  <a
                    href={dossie.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                  >
                    <span>Ver no Google Maps</span>
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>

              {/* Horários */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Funcionamento</span>
                  {dossie?.aberto_agora !== undefined && (
                    <Badge variant={dossie.aberto_agora ? 'default' : 'secondary'} className="text-[10px]">
                      {dossie.aberto_agora ? '🟢 Aberto agora' : '🔴 Fechado'}
                    </Badge>
                  )}
                </div>
                {dossie?.horarios_funcionamento && dossie.horarios_funcionamento.length > 0 ? (
                  <div className="space-y-1 text-xs text-muted-foreground max-h-36 overflow-y-auto pr-1">
                    {dossie.horarios_funcionamento.map((horario: string, idx: number) => (
                      <div key={idx} className="flex justify-between py-0.5 border-b border-border/40 last:border-0">
                        <span>{horario}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Horários sob consulta.</p>
                )}
              </div>
            </div>
          </div>

          {/* Card: Informações Relevantes & Comodidades */}
          {dossie?.informacoes_relevantes && (
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  Informações Relevantes & Comodidades
                </h2>
                {dossie.informacoes_relevantes.faixa_preco && dossie.informacoes_relevantes.faixa_preco !== 'Não informado' && (
                  <Badge variant="outline" className="text-xs">
                    {dossie.informacoes_relevantes.faixa_preco}
                  </Badge>
                )}
              </div>

              {dossie.informacoes_relevantes.resumo_editorial && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/50 pl-2.5 py-0.5">
                  &quot;{dossie.informacoes_relevantes.resumo_editorial}&quot;
                </p>
              )}

              {dossie.informacoes_relevantes.comodidades && dossie.informacoes_relevantes.comodidades.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {dossie.informacoes_relevantes.comodidades.map((item: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-[11px] font-normal py-0.5 px-2">
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma comodidade adicional especificada no Maps.</p>
              )}
            </div>
          )}

          {/* Card: Resultados da Web & Presença Digital */}
          {dossie?.resultados_web && dossie.resultados_web.length > 0 && (
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                <Globe className="size-4 text-primary" />
                Resultados da Web & Presença Digital
              </h2>
              <div className="flex flex-wrap gap-2">
                {dossie.resultados_web.map((link: any, idx: number) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted/50 hover:border-primary text-xs text-foreground transition group"
                  >
                    <span className="font-medium">{link.titulo}</span>
                    <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary transition" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Card: Depoimentos e Sentimento Real dos Clientes */}
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
              <Star className="size-4 text-amber-500" />
              Depoimentos e Percepção dos Clientes
            </h2>

            <div className="space-y-4">
              {/* Últimas avaliações com 5 estrelas */}
              {dossie?.avaliacoes_positivas && dossie.avaliacoes_positivas.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                  <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                    <ThumbsUp className="size-3.5" />
                    Últimas avaliações com 5 estrelas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {dossie.avaliacoes_positivas.slice(0, 4).map((p: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-background/40 border border-emerald-500/20 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                          <span>{p.author}</span>
                          <span className="text-amber-400">★ {p.rating}</span>
                        </div>
                        <p className="italic text-muted-foreground line-clamp-3">&quot;{p.text}&quot;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Desafios & Dores de Atendimento (Últimas avaliações <= 3 estrelas) */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-2">
                <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase">
                  <AlertTriangle className="size-3.5" />
                  Desafios & Dores de Atendimento (Google Maps)
                </h3>
                {dossie?.dores_destaque && dossie.dores_destaque.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {dossie.dores_destaque.slice(0, 2).map((d: any, idx: number) => {
                      const isNoNegative = d.text === 'Sem nenhuma avaliação negativa.';
                      return isNoNegative ? (
                        <div key={idx} className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                          <CheckCircle2 className="size-4" />
                          <span>Sem nenhuma avaliação negativa.</span>
                        </div>
                      ) : (
                        <div key={idx} className="p-2.5 rounded-lg bg-background/40 border border-amber-500/20 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                            <span>{d.author}</span>
                            <span className="text-amber-400">★ {d.rating}</span>
                          </div>
                          <p className="italic text-muted-foreground">&quot;{d.text}&quot;</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    <span>Sem nenhuma avaliação negativa.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Diagnosis & Master Prompt Studio (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Diagnóstico Multimodal da IA */}
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" />
                Diagnóstico de Identidade (IA)
              </h2>
              {diagnostico?.gerado_em && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(diagnostico.gerado_em).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>

            {diagnostico ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground block mb-0.5">O que a empresa é:</span>
                  <p className="text-foreground leading-relaxed">{diagnostico.resumo_empresa}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground block mb-0.5">Estética & Vibe Visual:</span>
                  <p className="text-foreground leading-relaxed">{diagnostico.estilo_visual_vibe}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground block mb-0.5">Público-Alvo:</span>
                  <p className="text-foreground leading-relaxed">{diagnostico.publico_alvo}</p>
                </div>
                {diagnostico.diferenciais_unicos && diagnostico.diferenciais_unicos.length > 0 && (
                  <div>
                    <span className="font-semibold text-muted-foreground block mb-1">Diferenciais Competitivos:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {diagnostico.diferenciais_unicos.map((dif: string, idx: number) => (
                        <li key={idx} className="text-foreground">{dif}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-muted/40 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Nenhum diagnóstico multimodal gerado ainda para este lead.
                </p>
                <Button
                  onClick={handleRunAiDiagnosis}
                  disabled={diagnosing}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Sparkles className="size-3.5 mr-1 text-amber-500" />
                  Gerar Diagnóstico com IA Agora
                </Button>
              </div>
            )}
          </div>

          {/* Card: Master Prompt Studio (Zero-Template Engine) */}
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground flex items-center gap-2">
                  <Copy className="size-4 text-primary" />
                  Prompt Mestre (Site do Zero)
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Copie e cole na sua IA (Claude, ChatGPT, v0) para gerar o site.
                </p>
              </div>
              {originalPrompt && promptMestre !== originalPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPromptMestre(originalPrompt)}
                  className="text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <RotateCcw className="size-3" />
                  Restaurar
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <textarea
                value={promptMestre}
                onChange={(e) => setPromptMestre(e.target.value)}
                placeholder="Clique em 'Diagnosticar com IA' para gerar automaticamente o Prompt Mestre de engenharia reversa deste lead..."
                rows={12}
                className="w-full p-3.5 rounded-xl bg-black/40 border border-border font-mono text-xs text-foreground leading-relaxed focus:outline-none focus:border-primary resize-y"
              />

              <Button
                onClick={handleCopyPrompt}
                disabled={!promptMestre}
                className="w-full py-3 font-bold bg-primary text-black hover:opacity-90 transition shadow flex items-center justify-center gap-2 text-xs"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="size-4 text-black" />
                    <span>Prompt Mestre Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    <span>Copiar Prompt Mestre para a IA</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Card: Pitch Comercial Pronto para WhatsApp */}
          {dossie?.pitch_comercial_sugerido && (
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <MessageCircle className="size-4 text-emerald-500" />
                  Pitch para WhatsApp
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPitch}
                  className="text-xs gap-1.5"
                >
                  {copiedPitch ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  {copiedPitch ? 'Copiado!' : 'Copiar Pitch'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl italic leading-relaxed">
                &quot;{dossie.pitch_comercial_sugerido}&quot;
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Modal de Foto em Alta Resolucao */}
      <Dialog open={Boolean(activePhoto)} onOpenChange={(open) => !open && setActivePhoto(null)}>
        <DialogContent className="max-w-3xl p-3 bg-black/90 border-border">
          <DialogHeader className="p-2">
            <DialogTitle className="text-sm font-medium text-foreground">
              Foto em Alta Resolução — {companyName}
            </DialogTitle>
          </DialogHeader>
          {activePhoto && (
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activePhoto} alt="Foto do local" className="max-h-[75vh] w-auto object-contain rounded" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
