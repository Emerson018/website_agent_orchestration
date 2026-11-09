'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getContactById } from '@/lib/crm-repository';
import type { Contact, Tag } from '@/types';
import {
  ArrowLeft,
  MapPin,
  Star,
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
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ScraplingDeepScraperCard } from '@/components/contacts/scrapling-deep-scraper-card';
import { ExtractedCatalogCard } from '@/components/contacts/extracted-catalog-card';
import {
  LeadProgressPanel,
  LeadStepSection,
  NextStepButton,
  SiteChecklistPanel,
  StatusChip,
  StepEmptyState,
} from '@/components/contacts/lead-steps-ui';
import { computeSiteChecklist } from '@/lib/contacts/site-checklist';
import { computeLeadSteps, nextLeadStep, type LeadStep, type StepKey } from '@/lib/contacts/lead-steps';

export default function ContactProfilePage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const supabase = createClient();

  const [contact, setContact] = useState<Contact | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  // Etapa do Lead aberta; null = abrir o Próximo Passo
  const [openStepKey, setOpenStepKey] = useState<StepKey | null>(null);
  const [enrichingDossier, setEnrichingDossier] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  // Master Prompt State (Editable)
  const [promptMestre, setPromptMestre] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);

  // Estado de Edição do Nome do Estabelecimento
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyInput, setCompanyInput] = useState('');
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Estado de Edição do Link do Google Maps
  const [isEditingMapsLink, setIsEditingMapsLink] = useState(false);
  const [mapsLinkInput, setMapsLinkInput] = useState('');
  const [isSavingMapsLink, setIsSavingMapsLink] = useState(false);

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
        setCompanyInput(data.company || '');
        const currentMaps =
          addData.maps_search_link ||
          addData.maps_url ||
          addData.dossie?.google_maps_url ||
          (data.website && (data.website.includes('maps') || data.website.includes('goo.gl')) ? data.website : '') ||
          '';
        setMapsLinkInput(currentMaps);

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
  const leadSteps = contact ? computeLeadSteps(contact) : [];
  const nextStep = nextLeadStep(leadSteps);

  const openStep: StepKey = openStepKey ?? nextStep?.key ?? 'dossie';
  const stepOf = (key: StepKey) => leadSteps.find((s) => s.key === key)!;
  const startEditingCompany = () => {
    setCompanyInput(contact?.company || dossie?.nome_verificado || '');
    setIsEditingCompany(true);
  };
  const runNextStep = (step: LeadStep) => {
    switch (step.key) {
      case 'briefing':
        setOpenStepKey('briefing');
        if (step.missing?.includes('empresa')) startEditingCompany();
        break;
      case 'dossie':
        setOpenStepKey('dossie');
        handleEnrichDossier();
        break;
      case 'diagnostico':
      case 'prompt':
        setOpenStepKey('diagnostico');
        handleRunAiDiagnosis();
        break;
      default:
        setOpenStepKey(step.key);
    }
  };
  const diagnostico = additionalData.diagnostico_ia || null;
  const companyName = contact?.company || dossie?.nome_verificado || contact?.name || 'Lead Sem Nome';

  // Handler para salvar edicao do nome do estabelecimento
  const handleSaveCompany = async () => {
    if (!contactId) return;
    const newName = companyInput.trim();
    setIsSavingCompany(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ company: newName || null })
        .eq('id', contactId);

      if (error) throw error;

      setContact((prev: any) => (prev ? { ...prev, company: newName || null } : prev));
      setIsEditingCompany(false);
      toast.success('Nome do estabelecimento atualizado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar nome do estabelecimento: ' + err.message);
    } finally {
      setIsSavingCompany(false);
    }
  };

  const currentMapsUrl =
    additionalData.maps_search_link ||
    additionalData.maps_url ||
    dossie?.google_maps_url ||
    ((additionalData.links as Array<{ url: string }>) || []).find(
      (l) => l?.url && (l.url.includes('google.com/maps') || l.url.includes('maps.app.goo.gl') || l.url.includes('share.google'))
    )?.url ||
    (contact?.website && (contact.website.includes('maps') || contact.website.includes('goo.gl')) ? contact.website : '') ||
    '';

  const openMapsLinkDialog = () => {
    setMapsLinkInput(currentMapsUrl);
    setIsEditingMapsLink(true);
  };

  // Handler para salvar e atualizar o link do Google Maps
  const handleSaveMapsLink = async (newUrl: string) => {
    if (!contactId) return;
    const trimmed = (newUrl || '').trim();
    if (!trimmed) {
      toast.error('Informe um link ou termo de busca válido.');
      return;
    }

    setIsSavingMapsLink(true);
    try {
      const currentAddData = (contact?.additional_data as Record<string, any>) || {};
      const existingLinks = Array.isArray(currentAddData.links) ? [...currentAddData.links] : [];
      const mapsIdx = existingLinks.findIndex(
        (l) => l?.url && (l.url.includes('google.com/maps') || l.url.includes('maps.app.goo.gl') || l.url.includes('share.google'))
      );
      if (mapsIdx >= 0) {
        existingLinks[mapsIdx] = { ...existingLinks[mapsIdx], url: trimmed, label: 'Google Maps' };
      } else {
        existingLinks.unshift({ url: trimmed, label: 'Google Maps' });
      }

      const updatedAddData = {
        ...currentAddData,
        maps_url: trimmed,
        maps_search_link: trimmed,
        links: existingLinks,
      };

      const contactUpdates: any = {
        additional_data: updatedAddData,
      };

      if (trimmed.startsWith('http') && (!contact?.website || contact.website.includes('maps') || contact.website.includes('goo.gl'))) {
        contactUpdates.website = trimmed;
      }

      const { error: dbErr } = await supabase
        .from('contacts')
        .update(contactUpdates)
        .eq('id', contactId);

      if (dbErr) {
        console.warn('Erro ao atualizar contacts no Supabase:', dbErr.message);
      }

      setContact((prev: any) =>
        prev
          ? {
              ...prev,
              ...contactUpdates,
              additional_data: updatedAddData,
            }
          : prev
      );

      // Envia imediatamente a nova URL para a rota de enriquecimento do Maps
      const res = await fetch(`/api/leads/${contactId}/enrich-dossier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao consultar Google Maps com o novo link.');

      if (data.dossie) {
        setContact((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            company: data.dossie.nome_verificado || prev.company,
            website: data.dossie.site_oficial || prev.website,
            additional_data: {
              ...(prev.additional_data || {}),
              maps_url: trimmed,
              maps_search_link: trimmed,
              dossie: data.dossie,
            },
          };
        });
      }

      toast.success('Link do Google Maps atualizado e Dossiê sincronizado com sucesso!');
      setIsEditingMapsLink(false);
      await fetchContactData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar link do Google Maps.');
    } finally {
      setIsSavingMapsLink(false);
    }
  };

  // Handler para enriquecer dossiê do Google Maps
  const handleEnrichDossier = async (customQuery?: string) => {
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
        customQuery ||
        currentMapsUrl ||
        mapsLink ||
        siteLink ||
        businessName ||
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
    <div className="space-y-5 pb-16">
      {/* Cabeçalho: lead, atalhos e Próximo Passo */}
      <header className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <Link
            href="/contacts"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Contatos
          </Link>
          {isEditingCompany ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                placeholder="Nome do estabelecimento"
                aria-label="Nome do estabelecimento"
                className="h-9 w-72 rounded-lg border border-primary bg-muted/80 px-3 text-lg font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-80"
                autoFocus
                disabled={isSavingCompany}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCompany();
                  if (e.key === 'Escape') {
                    setCompanyInput(contact?.company || '');
                    setIsEditingCompany(false);
                  }
                }}
              />
              <Button size="sm" onClick={handleSaveCompany} disabled={isSavingCompany} className="h-8 gap-1">
                {isSavingCompany ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCompanyInput(contact?.company || '');
                  setIsEditingCompany(false);
                }}
                disabled={isSavingCompany}
                className="h-8 px-2"
                aria-label="Cancelar edição do nome"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {contact?.company || dossie?.nome_verificado || (
                  <span className="text-lg font-normal italic text-muted-foreground">Estabelecimento sem nome definido</span>
                )}
              </h1>
              {dossie?.nota && (
                <Badge variant="secondary" className="gap-1 text-xs tabular-nums">
                  <Star className="size-3 fill-amber-500 text-amber-500" />
                  {dossie.nota.toFixed(1)} ({dossie.total_avaliacoes || 0})
                </Badge>
              )}
              <button
                type="button"
                onClick={startEditingCompany}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                title="Editar nome do estabelecimento"
                aria-label="Editar nome do estabelecimento"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          )}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>
              {contact.name || 'Responsável não informado'} · WhatsApp <strong className="text-foreground">{contact.phone}</strong>
            </span>
            {contact.email && <span>· {contact.email}</span>}
            {dossie?.nicho_detectado && <span className="capitalize">· {dossie.nicho_detectado}</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dossie?.link_cardapio && (
            <a
              href={dossie.link_cardapio}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition hover:bg-muted"
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
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              <MessageCircle className="size-3.5 text-emerald-500" />
              WhatsApp
            </a>
          )}
          <NextStepButton step={nextStep} busy={enrichingDossier || diagnosing} onRun={runNextStep} />
        </div>
      </header>

      {/* Painel de Progresso das Etapas do Lead */}
      <LeadProgressPanel steps={leadSteps} active={openStep} onSelect={setOpenStepKey} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Etapas do Lead: uma aberta por vez */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {/* 1. Briefing */}
            <LeadStepSection step={stepOf('briefing')} open={openStep === 'briefing'} onOpen={setOpenStepKey}>
              {stepOf('briefing').missing && (
                <p className="mb-3 text-sm text-amber-300">
                  Falta {stepOf('briefing').missing!.join(', ')} para completar o briefing.
                  {stepOf('briefing').missing!.includes('empresa') && (
                    <Button variant="link" size="sm" className="h-auto px-1 text-sm" onClick={startEditingCompany}>
                      Definir nome do estabelecimento
                    </Button>
                  )}
                </p>
              )}
              <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Responsável</dt>
                <dd>{contact.name || <span className="italic text-muted-foreground">Não informado</span>}</dd>
                <dt className="text-muted-foreground">Empresa</dt>
                <dd>{contact.company || <span className="italic text-muted-foreground">Não informada</span>}</dd>
                <dt className="text-muted-foreground">WhatsApp</dt>
                <dd>{contact.phone || <span className="italic text-muted-foreground">Não informado</span>}</dd>
                <dt className="text-muted-foreground">E-mail</dt>
                <dd>{contact.email || <span className="italic text-muted-foreground">Não informado</span>}</dd>
                <dt className="text-muted-foreground">Site</dt>
                <dd className="break-all">
                  {contact.website ? (
                    <a href={contact.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {contact.website}
                    </a>
                  ) : (
                    <span className="italic text-muted-foreground">Não informado</span>
                  )}
                </dd>
                {dossie?.telefone_estabelecimento &&
                  contact.phone?.replace(/\D/g, '') !== dossie.telefone_estabelecimento.replace(/\D/g, '') && (
                    <>
                      <dt className="text-muted-foreground">Telefone no Maps</dt>
                      <dd className="flex items-center gap-1.5">
                        <PhoneCall className="size-3.5 text-muted-foreground" />
                        {dossie.telefone_estabelecimento}
                        <Badge variant="outline" className="px-1 py-0 text-[10px]">
                          Diferente do WhatsApp
                        </Badge>
                      </dd>
                    </>
                  )}
              </dl>
            </LeadStepSection>

            {/* 2. Dossiê */}
            <LeadStepSection
              step={stepOf('dossie')}
              open={openStep === 'dossie'}
              onOpen={setOpenStepKey}
              action={
                <>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={openMapsLinkDialog}>
                    <MapPin className="size-3.5" />
                    Alterar link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => handleEnrichDossier()}
                    disabled={enrichingDossier}
                  >
                    <RefreshCw className={`size-3.5 ${enrichingDossier ? 'animate-spin' : ''}`} />
                    {enrichingDossier ? 'Consultando...' : dossie ? 'Atualizar Maps' : 'Consultar Google Maps'}
                  </Button>
                </>
              }
            >
              {!dossie ? (
                <StepEmptyState>
                  Nenhum dossiê ainda. Consulte o Google Maps para trazer fotos, avaliações, horários, endereço e o pitch
                  comercial. A busca usa {currentMapsUrl ? 'o link do Maps cadastrado' : 'o nome do estabelecimento'}.
                </StepEmptyState>
              ) : (
                <div className="space-y-6">
                  {dossie.fotos && dossie.fotos.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground">Fotos do Google Maps ({dossie.fotos.length})</h3>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {dossie.fotos.slice(0, 6).map((foto: any, index: number) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setActivePhoto(foto.photo_url)}
                            className="group relative aspect-square overflow-hidden rounded-lg bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Ampliar foto ${index + 1} de ${companyName}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={foto.photo_url}
                              alt=""
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            {foto.tipo === 'cardapio' && (
                              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                Cardápio
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-semibold text-muted-foreground">Endereço</h3>
                      <p className="text-sm">{dossie.endereco_formatado || 'Não informado no Maps'}</p>
                      {dossie.google_maps_url && (
                        <a
                          href={dossie.google_maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Ver no Google Maps
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                      <p className="break-all pt-1 text-[11px] text-muted-foreground">
                        Busca do Maps: {currentMapsUrl || 'automática pelo nome'}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-muted-foreground">Horários</h3>
                        {dossie.aberto_agora !== undefined && (
                          <span className={`text-[11px] ${dossie.aberto_agora ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                            {dossie.aberto_agora ? 'Aberto agora' : 'Fechado agora'}
                          </span>
                        )}
                      </div>
                      {dossie.horarios_funcionamento && dossie.horarios_funcionamento.length > 0 ? (
                        <ul className="space-y-0.5 text-sm">
                          {dossie.horarios_funcionamento.map((horario: string, idx: number) => (
                            <li key={idx}>{horario}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sem horários no Maps.</p>
                      )}
                    </div>
                  </div>

                  {(dossie.modalidades_atendimento || dossie.informacoes_relevantes) && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground">Atendimento e comodidades</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {dossie.modalidades_atendimento?.permite_entrega && (
                          <Badge variant="outline" className="gap-1 text-[11px]">
                            <Bike className="size-3" /> Entrega
                          </Badge>
                        )}
                        {dossie.modalidades_atendimento?.permite_consumo_local && (
                          <Badge variant="outline" className="gap-1 text-[11px]">
                            <Store className="size-3" /> Consumo no local
                          </Badge>
                        )}
                        {dossie.modalidades_atendimento?.permite_retirada && (
                          <Badge variant="outline" className="gap-1 text-[11px]">
                            <Utensils className="size-3" /> Retirada
                          </Badge>
                        )}
                        {dossie.informacoes_relevantes?.faixa_preco && dossie.informacoes_relevantes.faixa_preco !== 'Não informado' && (
                          <Badge variant="outline" className="text-[11px]">
                            {dossie.informacoes_relevantes.faixa_preco}
                          </Badge>
                        )}
                        {(dossie.informacoes_relevantes?.comodidades || []).map((item: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-[11px] font-normal">
                            {item}
                          </Badge>
                        ))}
                      </div>
                      {dossie.informacoes_relevantes?.resumo_editorial && (
                        <p className="text-sm italic text-muted-foreground">“{dossie.informacoes_relevantes.resumo_editorial}”</p>
                      )}
                    </div>
                  )}

                  {dossie.resultados_web && dossie.resultados_web.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground">Presença na web</h3>
                      <div className="flex flex-wrap gap-2">
                        {dossie.resultados_web.map((link: any, idx: number) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs transition hover:bg-muted"
                          >
                            {link.titulo}
                            <ExternalLink className="size-3 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <ThumbsUp className="size-3.5" />
                        Avaliações 5 estrelas
                      </h3>
                      {dossie.avaliacoes_positivas && dossie.avaliacoes_positivas.length > 0 ? (
                        <ul className="space-y-2.5">
                          {dossie.avaliacoes_positivas.slice(0, 4).map((p: any, idx: number) => (
                            <li key={idx} className="text-sm">
                              <p className="text-foreground/90">“{p.text}”</p>
                              <p className="text-[11px] text-muted-foreground">{p.author}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma avaliação 5 estrelas no Maps.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                        <AlertTriangle className="size-3.5" />
                        Dores de atendimento
                      </h3>
                      {dossie.dores_destaque &&
                      dossie.dores_destaque.some((d: any) => d.text !== 'Sem nenhuma avaliação negativa.') ? (
                        <ul className="space-y-2.5">
                          {dossie.dores_destaque.slice(0, 2).map((d: any, idx: number) => (
                            <li key={idx} className="text-sm">
                              <p className="text-foreground/90">“{d.text}”</p>
                              <p className="text-[11px] text-muted-foreground">
                                {d.author} · ★ {d.rating}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="flex items-center gap-1.5 text-sm text-emerald-400">
                          <CheckCircle2 className="size-4" />
                          Sem avaliações negativas.
                        </p>
                      )}
                    </div>
                  </div>

                  {dossie.pitch_comercial_sugerido && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold text-muted-foreground">Pitch comercial para WhatsApp</h3>
                        <Button variant="ghost" size="sm" onClick={handleCopyPitch} className="h-7 gap-1.5 text-xs">
                          {copiedPitch ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                          {copiedPitch ? 'Copiado' : 'Copiar pitch'}
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{dossie.pitch_comercial_sugerido}</p>
                    </div>
                  )}
                </div>
              )}
            </LeadStepSection>

            {/* 3. Raspagem */}
            <LeadStepSection step={stepOf('raspagem')} open={openStep === 'raspagem'} onOpen={setOpenStepKey}>
              {stepOf('raspagem').status === 'opcional' && (
                <p className="mb-3 text-sm text-muted-foreground">
                  Este lead não tem site nem URL cadastrada, então a raspagem é opcional. Adicione uma URL abaixo se houver.
                </p>
              )}
              <ScraplingDeepScraperCard
                embedded
                leadId={contact.id}
                scrapedData={additionalData.scraped_data}
                initialUrls={
                  Array.isArray(additionalData.scraping_urls)
                    ? additionalData.scraping_urls
                    : Array.isArray(additionalData.links)
                    ? additionalData.links.map((l: any) => (typeof l === 'string' ? l : l?.url)).filter(Boolean)
                    : []
                }
                websiteUrl={contact.website || additionalData.website || dossie?.site_oficial}
                onScraped={(newData, updatedUrls) => {
                  setContact((prev: any) =>
                    prev
                      ? {
                          ...prev,
                          additional_data: {
                            ...(prev.additional_data || {}),
                            scraping_urls: updatedUrls,
                            scraped_data: newData,
                          },
                        }
                      : prev
                  );
                }}
              />
            </LeadStepSection>

            {/* 4. Catálogo Extraído */}
            <LeadStepSection step={stepOf('catalogo')} open={openStep === 'catalogo'} onOpen={setOpenStepKey}>
              <ExtractedCatalogCard
                embedded
                leadId={contact.id}
                files={Array.isArray(additionalData.catalogo_arquivos) ? additionalData.catalogo_arquivos : []}
                onFilesChange={(files) => {
                  setContact((prev: any) =>
                    prev ? { ...prev, additional_data: { ...(prev.additional_data || {}), catalogo_arquivos: files } } : prev
                  );
                }}
                catalog={additionalData.catalogo_extraido || null}
                onCatalogChange={(catalog, newPrompt) => {
                  setContact((prev: any) =>
                    prev
                      ? {
                          ...prev,
                          additional_data: {
                            ...(prev.additional_data || {}),
                            catalogo_extraido: catalog,
                            ...(newPrompt ? { prompt_mestre: newPrompt, prompt_mestre_gerado_em: new Date().toISOString() } : {}),
                          },
                        }
                      : prev
                  );
                  if (newPrompt) {
                    setPromptMestre(newPrompt);
                    setOriginalPrompt(newPrompt);
                  }
                }}
              />
            </LeadStepSection>

            {/* 5. Diagnóstico */}
            <LeadStepSection
              step={stepOf('diagnostico')}
              open={openStep === 'diagnostico'}
              onOpen={setOpenStepKey}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleRunAiDiagnosis}
                  disabled={diagnosing || !dossie}
                >
                  <Sparkles className={`size-3.5 ${diagnosing ? 'animate-spin' : ''}`} />
                  {diagnosing ? 'Diagnosticando...' : diagnostico ? 'Gerar de novo' : 'Gerar Diagnóstico'}
                </Button>
              }
            >
              {!diagnostico ? (
                <StepEmptyState>
                  {dossie
                    ? 'Gere o diagnóstico para a IA descrever a empresa, o estilo visual, o público e os diferenciais. Ele também gera o Prompt Mestre.'
                    : 'O diagnóstico depende do dossiê. Consulte o Google Maps primeiro.'}
                </StepEmptyState>
              ) : (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground">O que a empresa é</dt>
                    <dd className="leading-relaxed">{diagnostico.resumo_empresa}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground">Estilo visual</dt>
                    <dd className="leading-relaxed">{diagnostico.estilo_visual_vibe}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground">Público</dt>
                    <dd className="leading-relaxed">{diagnostico.publico_alvo}</dd>
                  </div>
                  {diagnostico.diferenciais_unicos && diagnostico.diferenciais_unicos.length > 0 && (
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">Diferenciais</dt>
                      <dd>
                        <ul className="list-inside list-disc">
                          {diagnostico.diferenciais_unicos.map((dif: string, idx: number) => (
                            <li key={idx}>{dif}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                  {diagnostico.gerado_em && (
                    <p className="text-[11px] text-muted-foreground">
                      Gerado em {new Date(diagnostico.gerado_em).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </dl>
              )}
            </LeadStepSection>

            {/* 6. Prompt Mestre */}
            <LeadStepSection step={stepOf('prompt')} open={openStep === 'prompt'} onOpen={setOpenStepKey}>
              <StepEmptyState>
                {additionalData.prompt_mestre
                  ? 'O Prompt Mestre fica sempre à mão, na coluna ao lado.'
                  : 'O Prompt Mestre é gerado junto com o diagnóstico e aparece na coluna ao lado.'}
              </StepEmptyState>
            </LeadStepSection>
          </div>
        </div>

        {/* Coluna lateral fixa: Prompt Mestre e Checklist de Dados do Site */}
        <aside className="space-y-4 lg:col-span-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto xl:col-span-4">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Prompt Mestre</h2>
                  <StatusChip status={stepOf('prompt').status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Copie e cole na sua IA (Claude, ChatGPT, v0) para gerar o site.</p>
              </div>
              {originalPrompt && promptMestre !== originalPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPromptMestre(originalPrompt)}
                  className="h-7 gap-1 text-xs text-muted-foreground"
                >
                  <RotateCcw className="size-3" />
                  Restaurar
                </Button>
              )}
            </div>
            {stepOf('prompt').status === 'desatualizado' && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {stepOf('prompt').changed?.join(' e ')} {(stepOf('prompt').changed?.length ?? 0) > 1 ? 'mudaram' : 'mudou'}{' '}
                  depois deste prompt.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={handleRunAiDiagnosis}
                  disabled={diagnosing}
                >
                  <RefreshCw className={`size-3 ${diagnosing ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            )}
            <textarea
              value={promptMestre}
              onChange={(e) => setPromptMestre(e.target.value)}
              placeholder="O Prompt Mestre aparece aqui depois do diagnóstico."
              aria-label="Prompt Mestre"
              rows={14}
              className="w-full resize-y rounded-xl border border-border bg-background/60 p-3 font-mono text-xs leading-relaxed text-foreground focus:border-primary focus:outline-none"
            />
            <Button onClick={handleCopyPrompt} disabled={!promptMestre} className="w-full gap-2">
              {copiedPrompt ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiedPrompt ? 'Prompt Mestre copiado' : 'Copiar Prompt Mestre'}
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <SiteChecklistPanel items={computeSiteChecklist(contact)} />
          </div>
        </aside>
      </div>

      {/* Dialog para Alterar Link do Google Maps */}
      <Dialog open={isEditingMapsLink} onOpenChange={setIsEditingMapsLink}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-amber-500" />
              Alterar Link de Busca do Google Maps
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Caso o cliente tenha enviado outro link do Google Maps (ou link encurtado <code>maps.app.goo.gl</code>), insira-o abaixo. O CRM salvará o novo link e consultará a API imediatamente.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="maps-link-input-field" className="text-xs font-semibold text-foreground">
                Novo Link ou URL do Google Maps
              </label>
              <input
                id="maps-link-input-field"
                type="text"
                value={mapsLinkInput}
                onChange={(e) => setMapsLinkInput(e.target.value)}
                placeholder="Ex: https://maps.app.goo.gl/... ou https://google.com/maps/place/..."
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-amber-500 transition-colors"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingMapsLink(false)}
                disabled={isSavingMapsLink}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveMapsLink(mapsLinkInput)}
                disabled={isSavingMapsLink || !mapsLinkInput.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5"
              >
                {isSavingMapsLink ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Salvando & Consultando...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    Salvar e Buscar no Maps
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
