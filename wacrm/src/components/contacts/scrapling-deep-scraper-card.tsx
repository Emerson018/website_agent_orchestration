'use client';

import React, { useState } from 'react';
import {
  Globe,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Utensils,
  Building,
  FileText,
  Phone,
  Mail,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

export interface ScrapedProductItem {
  nome: string;
  preco?: string;
  descricao?: string;
  imagem_url?: string;
}

export interface ScrapedInstitutionalData {
  titulo?: string;
  descricao?: string;
  sobre?: string;
  servicos?: string[];
  contato?: {
    telefones?: string[];
    emails?: string[];
    enderecos?: string[];
  };
}

export interface ScrapedData {
  sucesso?: boolean;
  urls?: string[];
  metodo_utilizado?: 'stealth_browser' | 'http_fallback' | string;
  cardapio?: ScrapedProductItem[];
  institucional?: ScrapedInstitutionalData;
  markdown_resumo?: string;
  raspado_em?: string;
  erro?: string;
}

export interface ScraplingDeepScraperCardProps {
  leadId?: string;
  scrapedData?: ScrapedData | null;
  initialUrls?: string[];
  websiteUrl?: string;
  onScraped?: (data: ScrapedData, urls: string[]) => void;
  className?: string;
  /** Dentro de uma Etapa do Lead: sem moldura e sem título próprio. */
  embedded?: boolean;
}

export function ScraplingDeepScraperCard({
  leadId,
  scrapedData: initialScrapedData,
  initialUrls = [],
  websiteUrl,
  onScraped,
  className = '',
  embedded = false,
}: ScraplingDeepScraperCardProps) {
  // Inicializa a lista de URLs com as já cadastradas ou com o site do lead
  const [urls, setUrls] = useState<string[]>(() => {
    const list = [...initialUrls];
    if (websiteUrl && !list.includes(websiteUrl)) {
      list.push(websiteUrl);
    }
    return list;
  });

  const [inputUrl, setInputUrl] = useState('');
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(initialScrapedData || null);
  const [isScraping, setIsScraping] = useState(false);

  // Sincroniza se a prop mudar externamente
  React.useEffect(() => {
    if (initialScrapedData) {
      setScrapedData(initialScrapedData);
    }
  }, [initialScrapedData]);

  const handleAddUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let trimmed = inputUrl.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }

    try {
      new URL(trimmed);
    } catch {
      toast.error('Por favor, informe uma URL válida.');
      return;
    }

    if (urls.includes(trimmed)) {
      toast.info('Esta URL já está na lista.');
      return;
    }

    const updated = [...urls, trimmed];
    setUrls(updated);
    setInputUrl('');
  };

  const handleRemoveUrl = (indexToRemove: number) => {
    const updated = urls.filter((_, idx) => idx !== indexToRemove);
    setUrls(updated);
  };

  const handleExecuteScrape = async () => {
    if (!leadId) {
      toast.error('Identificador do lead não encontrado.');
      return;
    }

    if (urls.length === 0) {
      toast.error('Adicione pelo menos uma URL para realizar a raspagem.');
      return;
    }

    setIsScraping(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/scrape-deep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Erro na resposta do servidor (${res.status}): ${text.slice(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao executar raspagem profunda.');
      }

      const freshData: ScrapedData = data.scraped_data || data;
      setScrapedData(freshData);

      const itemsCount = freshData.cardapio?.length || 0;
      const metodoLabel =
        freshData.metodo_utilizado === 'stealth_browser'
          ? 'Navegador Stealth Real'
          : 'Modo HTTP Resiliente';

      toast.success(
        `Raspagem concluída via ${metodoLabel}! ${itemsCount > 0 ? `${itemsCount} produtos/pratos encontrados.` : 'Conteúdo institucional extraído.'}`
      );

      if (onScraped) {
        onScraped(freshData, urls);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao comunicar com o serviço de raspagem.');
    } finally {
      setIsScraping(false);
    }
  };

  const items = scrapedData?.cardapio || [];
  const inst = scrapedData?.institucional;
  const contatos = inst?.contato;

  return (
    <div className={embedded ? `space-y-4 ${className}` : `p-5 rounded-2xl bg-card border border-border space-y-4 ${className}`}>
      {/* 1. Header com Status do Método */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          {!embedded && (
            <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              Raspagem Profunda de Sites & Cardápios (Scrapling)
            </h2>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            Extrai catálogo de produtos, preços em R$ e textos institucionais com bypass anti-bot e fallback automático.
          </p>
        </div>

        {scrapedData?.metodo_utilizado && (
          <div>
            {scrapedData.metodo_utilizado === 'stealth_browser' ? (
              <Badge variant="outline" className="gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px]">
                <CheckCircle2 className="size-3" />
                Navegador Stealth Ativo
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 bg-amber-500/10 border-amber-500/30 text-amber-400 text-[10px]">
                <CheckCircle2 className="size-3" />
                Fallback HTTP Rápido
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* 2. Gestão de URLs */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-muted-foreground block">
          URLs do Estabelecimento para Raspagem:
        </label>

        <form onSubmit={handleAddUrl} className="flex gap-2">
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Ex: https://restaurante.com.br/cardapio ou link da loja"
            className="text-xs h-9"
            disabled={isScraping}
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={isScraping || !inputUrl.trim()}
            className="gap-1 text-xs shrink-0"
          >
            <Plus className="size-3.5" />
            Adicionar URL
          </Button>
        </form>

        {/* Lista de URLs adicionadas */}
        {urls.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {urls.map((u, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-xs text-foreground group"
              >
                <Globe className="size-3 text-muted-foreground" />
                <a
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline max-w-[280px] truncate"
                >
                  {u}
                </a>
                <button
                  type="button"
                  onClick={() => handleRemoveUrl(idx)}
                  disabled={isScraping}
                  className="text-muted-foreground hover:text-destructive transition ml-1 p-0.5 rounded"
                  title="Remover URL"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Nenhuma URL adicionada ainda. Digite a URL acima e clique em Adicionar.
          </p>
        )}

        <div className="pt-2">
          <Button
            type="button"
            onClick={handleExecuteScrape}
            disabled={isScraping || urls.length === 0}
            size="sm"
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm"
          >
            {isScraping ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Raspando com Scrapling...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                <span>Raspar com Scrapling</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 3. Visualização dos Dados Raspados */}
      {scrapedData && (
        <div className="pt-4 border-t border-border/50">
          <Tabs defaultValue={items.length > 0 ? 'cardapio' : 'institucional'} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="cardapio" className="text-xs gap-1.5">
                <Utensils className="size-3.5" />
                <span>Cardápio / Produtos ({items.length})</span>
              </TabsTrigger>
              <TabsTrigger value="institucional" className="text-xs gap-1.5">
                <Building className="size-3.5" />
                <span>Institucional</span>
              </TabsTrigger>
              <TabsTrigger value="markdown" className="text-xs gap-1.5">
                <FileText className="size-3.5" />
                <span>Markdown Resumo</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Cardápio / Catálogo */}
            <TabsContent value="cardapio" className="space-y-3">
              {items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-background/60 border border-border/60 hover:border-border transition flex gap-3 items-start"
                    >
                      {it.imagem_url && (
                        <div className="size-14 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={it.imagem_url}
                            alt={it.nome}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-foreground truncate">{it.nome}</h4>
                          {it.preco && (
                            <Badge variant="secondary" className="text-[10px] font-mono shrink-0 font-bold bg-amber-500/10 text-amber-400 border-amber-500/20">
                              {it.preco}
                            </Badge>
                          )}
                        </div>
                        {it.descricao && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                            {it.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-muted/30 text-center text-xs text-muted-foreground">
                  Nenhum item com formato de preço explícito foi detectado nas páginas raspadas. Consulte a aba &quot;Institucional&quot; ou &quot;Markdown Resumo&quot; para os textos extraídos.
                </div>
              )}
            </TabsContent>

            {/* Tab: Institucional */}
            <TabsContent value="institucional" className="space-y-3 text-xs">
              <div className="space-y-2 p-3.5 rounded-xl bg-background/60 border border-border/60">
                {inst?.titulo && (
                  <div>
                    <span className="font-semibold text-muted-foreground block text-[11px]">Título da Página:</span>
                    <p className="text-foreground font-medium">{inst.titulo}</p>
                  </div>
                )}

                {inst?.sobre && (
                  <div>
                    <span className="font-semibold text-muted-foreground block text-[11px]">Sobre Nós / História:</span>
                    <p className="text-muted-foreground leading-relaxed">{inst.sobre}</p>
                  </div>
                )}

                {inst?.servicos && inst.servicos.length > 0 && (
                  <div>
                    <span className="font-semibold text-muted-foreground block text-[11px]">Serviços & Diferenciais:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pt-0.5">
                      {inst.servicos.map((s, i) => (
                        <li key={i} className="text-foreground">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {contatos && (contatos.telefones?.length || contatos.emails?.length || contatos.enderecos?.length) ? (
                  <div className="pt-2 border-t border-border/40 space-y-1">
                    <span className="font-semibold text-muted-foreground block text-[11px]">Contatos Extraídos:</span>
                    {contatos.telefones && contatos.telefones.length > 0 && (
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="size-3 text-emerald-400" />
                        <span>{contatos.telefones.join(' • ')}</span>
                      </p>
                    )}
                    {contatos.emails && contatos.emails.length > 0 && (
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="size-3 text-blue-400" />
                        <span>{contatos.emails.join(' • ')}</span>
                      </p>
                    )}
                    {contatos.enderecos && contatos.enderecos.length > 0 && (
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="size-3 text-amber-400" />
                        <span>{contatos.enderecos.join(' • ')}</span>
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </TabsContent>

            {/* Tab: Markdown Resumo */}
            <TabsContent value="markdown" className="space-y-2">
              <textarea
                readOnly
                value={scrapedData.markdown_resumo || 'Nenhum resumo markdown gerado.'}
                rows={8}
                className="w-full p-3 rounded-xl bg-black/40 border border-border font-mono text-[11px] text-foreground leading-relaxed focus:outline-none resize-y"
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
