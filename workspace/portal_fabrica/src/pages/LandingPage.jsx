import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

const MODULES_DATA = [
  {
    id: 'agendador_pwa',
    title: 'Agendador PWA',
    price: 990,
    monthly: 49,
    description:
      'Sistema de agendamento Progressive Web App (PWA) instalável, com funcionamento offline e otimizado para celulares.',
    features: [
      'Instalável na tela inicial',
      'Funcionamento offline (PWA)',
      'Agenda interativa de clientes',
      'Painel do administrador integrado'
    ],
    required: true,
    tag: 'Base obrigatória'
  },
  {
    id: 'site',
    title: 'Site Institucional',
    price: 600,
    monthly: 39,
    description:
      'Página comercial responsiva para apresentação institucional do negócio, estrutura de serviços e indexação orgânica.',
    features: [
      'Direção visual sob medida',
      'Estrutura otimizada para buscas (SEO)',
      'Apresentação de equipe e serviços',
      'Hospedagem configurada'
    ],
    required: false,
    tag: 'Módulo complementar'
  },
  {
    id: 'app',
    title: 'Aplicativo Mobile',
    price: 1200,
    monthly: 99,
    description:
      'Aplicativo compilado para Android e iOS, preparado para publicação nas lojas Google Play e App Store.',
    features: [
      'Pacote para Google Play',
      'Pacote para App Store',
      'Notificações push em tempo real',
      'Integração com recursos nativos'
    ],
    required: false,
    tag: 'Módulo complementar'
  },
  {
    id: 'whatsapp',
    title: 'Automação de WhatsApp',
    price: 450,
    monthly: 29,
    description:
      'Atendimento automatizado integrado ao WhatsApp para confirmação de horários, envio de lembretes e triagem de clientes.',
    features: [
      'Agendamento via conversa de texto',
      'Lembretes automáticos de horário',
      'Triagem contínua de atendimento',
      'Conexão direta com o número da empresa'
    ],
    required: false,
    tag: 'Módulo complementar'
  }
];

const HOMOLOGATED_SPECS = [
  {
    code: 'ESP-104',
    client: 'Sorriso Perfeito',
    sector: 'Clínica odontológica',
    stack: ['Agendador PWA', 'Site Institucional', 'Aplicativo Mobile', 'Automação de WhatsApp'],
    investment: 'R$ 3.240',
    outcome:
      'Unificou o site, aplicativo de marcação de consultas e lembretes por WhatsApp. O fluxo de confirmações subiu com o envio automático de avisos antes de cada consulta.'
  },
  {
    code: 'ESP-118',
    client: 'Navalha de Ouro',
    sector: 'Barbearia clássica',
    stack: ['Agendador PWA', 'Site Institucional', 'Automação de WhatsApp'],
    investment: 'R$ 2.040',
    outcome:
      'Os clientes reservam o horário pelo celular ou pelo atendimento automático no WhatsApp que consulta a agenda em tempo real, eliminando perdas por demora no retorno.'
  },
  {
    code: 'ESP-129',
    client: 'Pampas Barber',
    sector: 'Rede de barbearias',
    stack: ['Agendador PWA', 'Site Institucional'],
    investment: 'R$ 1.590',
    outcome:
      'Implantou o Agendador PWA acompanhado da página institucional rápida para centralizar o atendimento das unidades e captar novos clientes locais.'
  }
];

export default function LandingPage() {
  const [businessName, setBusinessName] = useState('Meu Negócio Perfeito');
  const [activeModules, setActiveModules] = useState(['agendador_pwa']);
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Reference Links states
  const [referenceLinks, setReferenceLinks] = useState([{ url: '', type: 'site', notes: '' }]);

  // Scope & File Upload states
  const [customFields, setCustomFields] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  // Simulation / Orchestrator Modal states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simLogs, setSimLogs] = useState([]);
  const [generatedPayload, setGeneratedPayload] = useState(null);

  // Supabase Backend States
  const [recentProjects, setRecentProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setSubmissionError('');
    const newUploadedFiles = [...uploadedFiles];

    for (const file of files) {
      try {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });

        const response = await apiFetch('/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            fileName: file.name,
            mimeType: file.type
          })
        });

        if (!response.ok) {
          throw new Error(`Não foi possível enviar o arquivo ${file.name}.`);
        }

        const uploadedFile = await response.json();
        newUploadedFiles.push({ name: uploadedFile.name, url: uploadedFile.url });
      } catch (err) {
        console.error(err);
        setSubmissionError(err.message || 'Falha durante a transferência do arquivo.');
      }
    }

    setUploadedFiles(newUploadedFiles);
    setIsUploading(false);
  };

  const removeUploadedFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, idx) => idx !== index));
  };

  const fetchRecentProjects = async () => {
    setIsLoadingQueue(true);
    try {
      const response = await apiFetch('/projetos');
      if (response.ok) {
        const data = await response.json();
        setRecentProjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Erro ao carregar projetos do banco de dados (servidor offline?):', err.message);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchRecentProjects();
  }, []);

  const toggleModule = (moduleId) => {
    if (moduleId === 'agendador_pwa') return;
    if (activeModules.includes(moduleId)) {
      setActiveModules(activeModules.filter((id) => id !== moduleId));
    } else {
      setActiveModules([...activeModules, moduleId]);
    }
  };

  const calculateTotalPrice = () => {
    return activeModules.reduce((acc, id) => {
      const mod = MODULES_DATA.find((m) => m.id === id);
      return acc + (mod ? mod.price : 0);
    }, 0);
  };

  const calculateMonthlyPrice = () => {
    return activeModules.reduce((acc, id) => {
      const mod = MODULES_DATA.find((m) => m.id === id);
      return acc + (mod ? mod.monthly : 0);
    }, 0);
  };

  const addReferenceLink = () => {
    setReferenceLinks([...referenceLinks, { url: '', type: 'site', notes: '' }]);
  };

  const removeReferenceLink = (index) => {
    setReferenceLinks(referenceLinks.filter((_, idx) => idx !== index));
  };

  const updateReferenceLink = (index, field, value) => {
    const updated = [...referenceLinks];
    updated[index][field] = value;
    setReferenceLinks(updated);
  };

  const handleStartIaBuild = async (e) => {
    e.preventDefault();
    if (!clientEmail || !clientPhone) {
      setSubmissionError('Informe seu e-mail corporativo e número de WhatsApp para enviar o pedido.');
      return;
    }

    setSubmissionError('');

    const additional_data = {
      files: uploadedFiles,
      links: referenceLinks
        .filter((l) => l.url.trim() !== '')
        .map((l) => ({
          label: `Referência (${l.type})${l.notes ? ` - ${l.notes}` : ''}`,
          url: l.url
        })),
      texts: [{ label: 'Informações Extras para o Agendamento', text: customFields }]
    };

    const payload = {
      project_name: businessName,
      branding: {
        palette_name: 'Definida via Direção de Design'
      },
      modules: activeModules,
      reference_links: referenceLinks.filter((l) => l.url.trim() !== ''),
      client_info: {
        email: clientEmail,
        phone: clientPhone
      },
      summary: {
        total_setup_price: calculateTotalPrice(),
        monthly_maintenance: calculateMonthlyPrice()
      },
      ai_analysis: '',
      additional_data,
      auto_process: true,
      timestamp: new Date().toISOString()
    };

    setGeneratedPayload(payload);
    setIsSimulating(true);
    setSimStep(1);
    setSimLogs(['[1/3] Iniciando envio do caderno de especificação...']);

    try {
      setSimLogs((prev) => [
        ...prev,
        '[2/3] Gravando especificação do projeto na fila do Supabase...'
      ]);
      const saveResponse = await apiFetch('/projetos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!saveResponse.ok) {
        let serverMessage = `Falha ao registrar o pedido no servidor (HTTP ${saveResponse.status}).`;
        try {
          const errBody = await saveResponse.json();
          if (errBody?.error) {
            serverMessage = errBody.details ? `${errBody.error} (${errBody.details})` : errBody.error;
          }
        } catch {
          // Resposta não-JSON
        }
        const httpErr = new Error(serverMessage);
        httpErr.isServerError = true;
        throw httpErr;
      }
      const project = await saveResponse.json();
      setCurrentProjectId(project.id);

      setSimLogs((prev) => [
        ...prev,
        `Pedido registrado com sucesso na fila: código #${project.id}.`,
        '[3/3] Acionando orquestrador para compilação autônoma do código...'
      ]);

      try {
        let dispatched = Boolean(project.auto_dispatched);
        if (!dispatched) {
          const processRes = await apiFetch(`/projetos/${project.id}/processar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          dispatched = processRes.ok;
        }
        if (dispatched) {
          setSimLogs((prev) => [
            ...prev,
            'Orquestração iniciada na fábrica de software.',
            'As referências e módulos foram entregues aos agentes e o código está sendo gerado em segundo plano.',
            'Acompanhe o status na tabela da Fila de Produção abaixo.'
          ]);
        }
      } catch (procErr) {
        console.warn('Erro ao disparar processamento imediato:', procErr);
      }

      setSimStep(8);
      fetchRecentProjects();
    } catch (err) {
      console.error('Erro ao orquestrar build real:', err);
      if (err?.isServerError) {
        setSubmissionError(err.message);
        setSimLogs((prev) => [
          ...prev,
          `[Erro] ${err.message}`
        ]);
        setSimStep(8);
        return;
      }
      setSimLogs((prev) => [
        ...prev,
        'Servidor local na porta 5000 indisponível no momento.',
        'Executando simulação local do fluxo de especificação...'
      ]);

      const logMessages = [
        { text: '[Local] Lendo templates base e contrato de direção visual...', delay: 900 },
        { text: `[Local] Preparando identidade visual para "${businessName}"...`, delay: 1800 },
        { text: '[Local] Estruturando banco de dados e dependências dos módulos selecionados...', delay: 3000 },
        { text: '[Local] Gerando páginas responsivas e folha de estilos com tokens semânticos...', delay: 4200 },
        { text: '[Local] Especificação concluída e pronta para despacho.', delay: 5400 }
      ];

      logMessages.forEach((log, index) => {
        setTimeout(() => {
          setSimLogs((prev) => [...prev, log.text]);
          if (index === logMessages.length - 1) {
            setSimStep(8);
          }
        }, log.delay);
      });
    }
  };

  const selectedModuleObjects = MODULES_DATA.filter((m) => activeModules.includes(m.id));

  return (
    <div className="pb-24">
      {/* 1. Studio Specification Header */}
      <section className="drafting-surface border-b border-[#282F3D] pt-12 pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#191D26] border border-[#282F3D] text-xs font-mono text-[#ECEEF2]">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <span>Caderno de especificação técnica • Orquestrador local conectado</span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-bold text-[#ECEEF2] tracking-tight leading-[1.1]">
                Configure seu Agendador PWA e despache a construção dos módulos.
              </h1>

              <p className="text-base sm:text-lg text-[#949BA8] max-w-[65ch] leading-relaxed">
                Defina o escopo da sua operação, anexe catálogos ou referências visuais e envie a ordem diretamente para a fila de engenharia.
              </p>
            </div>

            {/* Live Architecture Status Sheet */}
            <div className="lg:col-span-4">
              <div className="spec-sheet rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#282F3D] pb-3">
                  <span className="text-xs font-medium text-[#949BA8]">Topologia selecionada</span>
                  <span className="font-mono text-xs font-semibold text-[#22C55E]">
                    {activeModules.length} {activeModules.length === 1 ? 'módulo ativo' : 'módulos ativos'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {MODULES_DATA.map((mod) => {
                    const isAct = activeModules.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        className={`px-2.5 py-2 rounded border text-xs font-mono flex items-center justify-between ${
                          isAct
                            ? 'bg-[#E59A28]/10 border-[#E59A28]/70 text-[#ECEEF2] font-medium'
                            : 'bg-[#141820] border-[#282F3D] text-[#949BA8] opacity-60'
                        }`}
                      >
                        <span className="truncate pr-1">{mod.title}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isAct ? 'bg-[#E59A28]' : 'bg-[#384152]'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Primary Interactive Workbench (7-col Specification + 5-col Sticky Order Sheet) */}
      <section id="configurador" className="pt-12 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (7 cols): 3-Step Technical Specification */}
            <div className="lg:col-span-7 space-y-8">
              {/* Step 1: Identificação do Negócio */}
              <div className="spec-sheet rounded-lg overflow-hidden">
                <div className="bg-[#141820] px-6 py-4 border-b border-[#282F3D] flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-medium text-[#E59A28]">Passo 1 de 3</span>
                    <h2 className="font-display text-xl font-bold text-[#ECEEF2]">
                      Identificação do negócio
                    </h2>
                  </div>
                  <span className="font-mono text-xs text-[#949BA8]">Registro principal</span>
                </div>

                <div className="p-6 space-y-2">
                  <label htmlFor="business-name" className="block text-sm font-semibold text-[#ECEEF2]">
                    Nome comercial da empresa ou clínica
                  </label>
                  <input
                    id="business-name"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Ex: Clínica Sorriso Perfeito"
                    className="w-full bg-[#12151B] border border-[#282F3D] rounded-md px-3.5 py-2.5 text-sm text-[#ECEEF2] placeholder-[#949BA8]/50 focus:border-[#E59A28] transition-colors"
                  />
                  <p className="text-xs text-[#949BA8]">
                    Este nome será aplicado no cabeçalho do sistema, título da aplicação e registros na fila de produção.
                  </p>
                </div>
              </div>

              {/* Step 2: Seleção de Módulos */}
              <div className="spec-sheet rounded-lg overflow-hidden">
                <div className="bg-[#141820] px-6 py-4 border-b border-[#282F3D] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-medium text-[#E59A28]">Passo 2 de 3</span>
                    <h2 className="font-display text-xl font-bold text-[#ECEEF2]">
                      Módulos funcionais do sistema
                    </h2>
                  </div>
                  <span className="font-mono text-xs text-[#949BA8]">
                    {activeModules.length} de {MODULES_DATA.length} selecionados
                  </span>
                </div>

                <div className="divide-y divide-[#282F3D]">
                  {MODULES_DATA.map((mod) => {
                    const isSelected = activeModules.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        role={mod.required ? undefined : 'button'}
                        tabIndex={mod.required ? -1 : 0}
                        onKeyDown={(e) => {
                          if (!mod.required && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            toggleModule(mod.id);
                          }
                        }}
                        className={`p-6 transition-colors ${
                          mod.required
                            ? 'bg-[#191D26]'
                            : isSelected
                            ? 'bg-[#E59A28]/[0.05] cursor-pointer'
                            : 'bg-[#191D26] hover:bg-[#202632] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                isSelected
                                  ? 'bg-[#E59A28] border-[#E59A28] text-[#12151B]'
                                  : 'bg-[#12151B] border-[#384152] text-transparent'
                              }`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-display font-bold text-base text-[#ECEEF2]">
                                  {mod.title}
                                </h3>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                                    mod.required
                                      ? 'bg-[#141820] text-[#ECEEF2] border border-[#282F3D]'
                                      : isSelected
                                      ? 'bg-[#E59A28]/15 text-[#E59A28]'
                                      : 'bg-[#141820] text-[#949BA8]'
                                  }`}
                                >
                                  {mod.tag}
                                </span>
                              </div>

                              <p className="text-sm text-[#949BA8] max-w-[60ch] leading-relaxed">
                                {mod.description}
                              </p>

                              {isSelected && (
                                <div className="flex flex-wrap gap-2 pt-1.5">
                                  {mod.features.map((feat) => (
                                    <span
                                      key={feat}
                                      className="text-xs font-mono text-[#ECEEF2] bg-[#141820] border border-[#282F3D] px-2 py-0.5 rounded"
                                    >
                                      {feat}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-base font-semibold text-[#ECEEF2] block">
                              R$ {mod.price.toLocaleString('pt-BR')}
                            </span>
                            <span className="font-mono text-xs text-[#949BA8] block">
                              + R$ {mod.monthly}/mês
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Coleta de Referências, Arquivos e Observações */}
              <div className="spec-sheet rounded-lg overflow-hidden">
                <div className="bg-[#141820] px-6 py-4 border-b border-[#282F3D]">
                  <span className="font-mono text-xs font-medium text-[#E59A28]">Passo 3 de 3</span>
                  <h2 className="font-display text-xl font-bold text-[#ECEEF2]">
                    Materiais de referência, catálogos e regras de agenda
                  </h2>
                </div>

                <div className="p-6 space-y-6">
                  <p className="text-sm text-[#949BA8] max-w-[65ch] leading-relaxed">
                    Anexe links de referência visual, tabelas de serviços (PDF ou imagem) e instruções operacionais. O Analista de Direção de Design utiliza esses insumos para definir paleta, tipografia e campos do agendamento.
                  </p>

                  {/* Reference Links */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-[#ECEEF2]">
                      Endereços de referência visual (opcional)
                    </label>

                    <div className="space-y-3">
                      {referenceLinks.map((link, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-md bg-[#141820] border border-[#282F3D] space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-[#949BA8]">
                                Referência #{index + 1}
                              </span>
                              <select
                                value={link.type}
                                onChange={(e) => updateReferenceLink(index, 'type', e.target.value)}
                                className="bg-[#191D26] border border-[#282F3D] rounded px-2.5 py-1 text-xs font-medium text-[#ECEEF2]"
                              >
                                <option value="site">Website</option>
                                <option value="instagram">Instagram</option>
                                <option value="linktree">Linktree</option>
                                <option value="outro">Outra referência</option>
                              </select>
                            </div>

                            {referenceLinks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeReferenceLink(index)}
                                className="text-xs font-medium text-[#949BA8] hover:text-rose-400 cursor-pointer"
                              >
                                Remover referência
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <input
                              type="text"
                              value={link.url}
                              onChange={(e) => updateReferenceLink(index, 'url', e.target.value)}
                              placeholder="https://exemplo.com.br ou instagram.com/perfil"
                              className="w-full bg-[#12151B] border border-[#282F3D] rounded px-3 py-2 text-xs text-[#ECEEF2] placeholder-[#949BA8]/50 focus:border-[#E59A28]"
                            />
                            <input
                              type="text"
                              value={link.notes}
                              onChange={(e) => updateReferenceLink(index, 'notes', e.target.value)}
                              placeholder="O que aproveitar desta referência? (cores, tom, estrutura)"
                              className="w-full bg-[#12151B] border border-[#282F3D] rounded px-3 py-2 text-xs text-[#ECEEF2] placeholder-[#949BA8]/50 focus:border-[#E59A28]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addReferenceLink}
                      className="px-3.5 py-2 rounded-md border border-[#282F3D] bg-[#141820] hover:bg-[#202632] text-xs font-semibold text-[#ECEEF2] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>+ Adicionar outro endereço de referência</span>
                    </button>
                  </div>

                  {/* File Upload */}
                  <div className="pt-5 border-t border-[#282F3D] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-semibold text-[#ECEEF2]">
                          Catálogo de serviços, tabela de preços ou manual da marca (PDF / Imagem)
                        </label>
                        <p className="text-xs text-[#949BA8] mt-0.5">
                          Formatos aceitos: PDF, PNG, JPG ou WEBP (até 16 MB por arquivo).
                        </p>
                      </div>
                      {isUploading && (
                        <span className="font-mono text-xs text-[#E59A28]">
                          Transferindo arquivo...
                        </span>
                      )}
                    </div>

                    <div className="relative flex flex-col items-center justify-center p-6 border border-dashed border-[#384152] rounded-md bg-[#141820] hover:bg-[#202632]/70 hover:border-[#E59A28] transition-colors cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="application/pdf,image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                      />
                      <span className="text-sm font-medium text-[#ECEEF2]">
                        {isUploading
                          ? 'Enviando arquivos para o servidor...'
                          : 'Clique ou arraste arquivos PDF ou imagens para anexar'}
                      </span>
                      <span className="text-xs text-[#949BA8] mt-1">
                        Os documentos anexados alimentam diretamente o briefing do projeto
                      </span>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-mono text-[#949BA8]">
                          Arquivos anexados ({uploadedFiles.length}):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {uploadedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2.5 rounded bg-[#141820] border border-[#282F3D] text-xs"
                            >
                              <span className="font-mono text-[#ECEEF2] truncate pr-2">
                                {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeUploadedFile(index)}
                                className="text-[#949BA8] hover:text-rose-400 font-semibold shrink-0 cursor-pointer"
                              >
                                Excluir
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Extra Scheduling Rules */}
                  <div className="pt-5 border-t border-[#282F3D] space-y-2">
                    <label htmlFor="custom-fields" className="block text-sm font-semibold text-[#ECEEF2]">
                      Regras específicas para o agendamento e observações (opcional)
                    </label>
                    <textarea
                      id="custom-fields"
                      value={customFields}
                      onChange={(e) => setCustomFields(e.target.value)}
                      rows={4}
                      placeholder="Ex: Coletar porte do pet, restrições de horário, nomes dos profissionais, tempo médio de 45 minutos por sessão ou preferência de cores..."
                      className="w-full bg-[#12151B] border border-[#282F3D] rounded-md p-3.5 text-sm text-[#ECEEF2] placeholder-[#949BA8]/50 focus:border-[#E59A28] transition-colors leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Sticky Order Ledger & Dispatch Form */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <div className="spec-sheet rounded-lg overflow-hidden border-t-4 border-t-[#E59A28]">
                <div className="p-6 border-b border-[#282F3D] bg-[#141820]">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-[#ECEEF2]">
                      Folha de orçamento e despacho
                    </h2>
                    <span className="font-mono text-xs text-[#949BA8]">
                      {businessName || 'Novo projeto'}
                    </span>
                  </div>
                  <p className="text-xs text-[#949BA8] mt-1">
                    Resumo financeiro dos módulos selecionados e dados para disparo do orquestrador.
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Line Items */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-[#949BA8] border-b border-[#282F3D] pb-1.5">
                      <span>Módulo especificado</span>
                      <span>Setup + Mensal</span>
                    </div>
                    {selectedModuleObjects.map((mod) => (
                      <div key={mod.id} className="flex justify-between items-baseline text-sm py-1">
                        <span className="font-medium text-[#ECEEF2] pr-3">{mod.title}</span>
                        <div className="text-right font-mono shrink-0">
                          <span className="text-[#ECEEF2] font-semibold">
                            R$ {mod.price.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-xs text-[#949BA8] ml-1.5">
                            (+R$ {mod.monthly}/mês)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals Well */}
                  <div className="spec-well rounded-md p-4 space-y-2.5">
                    <div className="flex justify-between text-xs text-[#949BA8]">
                      <span>Investimento de implementação (código):</span>
                      <span className="font-mono font-semibold text-[#ECEEF2]">
                        R$ {calculateTotalPrice().toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-[#949BA8]">
                      <span>Manutenção mensal (hospedagem e API):</span>
                      <span className="font-mono font-semibold text-[#ECEEF2]">
                        R$ {calculateMonthlyPrice()}/mês
                      </span>
                    </div>
                    <div className="border-t border-[#282F3D] pt-2.5 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-[#ECEEF2]">Total de setup:</span>
                      <div className="text-right">
                        <span className="font-mono text-2xl font-bold text-[#E59A28]">
                          R$ {calculateTotalPrice().toLocaleString('pt-BR')}
                        </span>
                        <span className="block font-mono text-[11px] text-[#949BA8]">
                          + R$ {calculateMonthlyPrice()}/mês recorrente
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Dispatch Form */}
                  <form onSubmit={handleStartIaBuild} className="space-y-4 pt-2 border-t border-[#282F3D]">
                    <div>
                      <label htmlFor="client-email" className="block text-xs font-semibold text-[#ECEEF2] mb-1">
                        E-mail corporativo *
                      </label>
                      <input
                        id="client-email"
                        type="email"
                        required
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="contato@empresa.com.br"
                        className="w-full bg-[#12151B] border border-[#282F3D] rounded-md px-3.5 py-2.5 text-sm text-[#ECEEF2] placeholder-[#949BA8]/50 focus:border-[#E59A28]"
                      />
                    </div>

                    <div>
                      <label htmlFor="client-phone" className="block text-xs font-semibold text-[#ECEEF2] mb-1">
                        WhatsApp / Celular *
                      </label>
                      <input
                        id="client-phone"
                        type="tel"
                        required
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="(00) 90000-0000"
                        className="w-full bg-[#12151B] border border-[#282F3D] rounded-md px-3.5 py-2.5 text-sm text-[#ECEEF2] placeholder-[#949BA8]/50 focus:border-[#E59A28]"
                      />
                    </div>

                    {submissionError && (
                      <div
                        role="alert"
                        className="p-3 rounded-md bg-rose-950/60 border border-rose-800 text-xs text-rose-200 font-medium"
                      >
                        {submissionError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isUploading}
                      className="w-full py-3.5 px-4 rounded-md bg-[#E59A28] hover:bg-[#D48817] disabled:opacity-50 text-[#12151B] font-bold text-sm transition-colors cursor-pointer"
                    >
                      {isUploading
                        ? 'Aguardando conclusão do upload...'
                        : 'Enviar pedido para a fila de produção'}
                    </button>

                    {currentProjectId && (
                      <p className="text-xs font-mono text-[#22C55E] text-center">
                        Pedido #{currentProjectId} enviado para a fila de produção.
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Fila de Projetos no Supabase (Structured Engineering Table) */}
      <section id="fila-producao" className="py-16 border-t border-[#282F3D] bg-[#141820]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold text-[#ECEEF2]">
                Fila de produção no Supabase
              </h2>
              <p className="text-sm text-[#949BA8] max-w-[65ch]">
                Pedidos sincronizados com o banco de dados e status de execução dos agentes de engenharia.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchRecentProjects}
              disabled={isLoadingQueue}
              className="self-start sm:self-auto px-4 py-2 rounded-md bg-[#191D26] hover:bg-[#202632] border border-[#282F3D] text-xs font-semibold text-[#ECEEF2] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <svg
                className={`w-3.5 h-3.5 ${isLoadingQueue ? 'animate-spin text-[#E59A28]' : 'text-[#949BA8]'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18"
                />
              </svg>
              <span>{isLoadingQueue ? 'Atualizando fila...' : 'Atualizar fila de produção'}</span>
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="spec-sheet rounded-lg p-8 text-center space-y-2">
              <p className="font-display font-semibold text-base text-[#ECEEF2]">
                Nenhum projeto registrado na fila do Supabase
              </p>
              <p className="text-sm text-[#949BA8] max-w-md mx-auto">
                Configure um sistema acima e clique em "Enviar pedido para a fila de produção" para iniciar o primeiro registro.
              </p>
            </div>
          ) : (
            <div className="spec-sheet rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#141820] border-b border-[#282F3D] text-xs font-mono text-[#949BA8]">
                      <th className="py-3 px-4 font-medium">Código</th>
                      <th className="py-3 px-4 font-medium">Negócio</th>
                      <th className="py-3 px-4 font-medium">Especificação registrada</th>
                      <th className="py-3 px-4 font-medium">Paleta extraída</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#282F3D] text-sm">
                    {recentProjects.slice(0, 6).map((proj) => {
                      let name = proj.resultado_json?.app_name;
                      let primary = proj.resultado_json?.primary_color || '#E59A28';
                      let secondary = proj.resultado_json?.secondary_color || '#191D26';

                      if (!name && proj.mensagem_lead) {
                        const match = proj.mensagem_lead.match(/negócio chamado '([^']+)'/);
                        name = match ? match[1] : 'AppCustomizado';
                      }

                      if (!proj.resultado_json && proj.mensagem_lead) {
                        const colorMatch = proj.mensagem_lead.match(/Cor principal:\s*(#[a-fA-F0-9]{6})/);
                        if (colorMatch) primary = colorMatch[1];
                      }

                      const statusBadge =
                        proj.status === 'concluido'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                          : proj.status === 'processando'
                          ? 'bg-amber-950/60 text-[#E59A28] border-amber-700/80'
                          : proj.status === 'erro'
                          ? 'bg-rose-950/60 text-rose-400 border-rose-800/80'
                          : 'bg-[#141820] text-[#949BA8] border-[#384152]';

                      return (
                        <tr key={proj.id} className="hover:bg-[#202632]/50 transition-colors align-top">
                          <td className="py-3.5 px-4 font-mono text-xs text-[#949BA8] whitespace-nowrap">
                            <span className="font-semibold text-[#ECEEF2]">#{proj.id}</span>
                            <span className="block text-[11px]">
                              {proj.created_at ? new Date(proj.created_at).toLocaleDateString('pt-BR') : '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[#ECEEF2] whitespace-nowrap">
                            {name}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#949BA8] max-w-md">
                            <p className="line-clamp-2 leading-relaxed">{proj.mensagem_lead}</p>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 font-mono text-xs text-[#949BA8]">
                              <span
                                className="w-3.5 h-3.5 rounded border border-white/20 inline-block"
                                style={{ backgroundColor: primary }}
                              />
                              <span>{primary}</span>
                              {proj.resultado_json && (
                                <>
                                  <span
                                    className="w-3.5 h-3.5 rounded border border-white/20 inline-block ml-1"
                                    style={{ backgroundColor: secondary }}
                                  />
                                  <span>{secondary}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-block font-mono text-xs font-medium px-2.5 py-0.5 rounded border ${statusBadge}`}
                            >
                              {proj.status || 'pendente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Sequential Compilation Flow */}
      <section id="arquitetura-entrega" className="py-16 border-t border-[#282F3D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold text-[#ECEEF2]">
              Como o pedido é compilado pelos agentes
            </h2>
            <p className="text-sm text-[#949BA8] max-w-[65ch]">
              O processamento segue uma sequência técnica determinística entre três agentes especializados.
            </p>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <li className="spec-sheet rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-[#282F3D] pb-3">
                <span className="font-mono text-xs font-semibold text-[#E59A28]">Etapa 1</span>
                <span className="font-mono text-xs text-[#949BA8]">Analista de Direção Visual</span>
              </div>
              <h3 className="font-display text-lg font-bold text-[#ECEEF2]">
                Síntese de escopo e identidade
              </h3>
              <p className="text-sm text-[#949BA8] leading-relaxed">
                Lê os links de referência, documentos PDF/imagens e observações do cliente para definir paleta semântica, tipografia e contrato da interface.
              </p>
            </li>

            <li className="spec-sheet rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-[#282F3D] pb-3">
                <span className="font-mono text-xs font-semibold text-[#E59A28]">Etapa 2</span>
                <span className="font-mono text-xs text-[#949BA8]">Engenheiro Full-Stack</span>
              </div>
              <h3 className="font-display text-lg font-bold text-[#ECEEF2]">
                Montagem dos módulos e estilização
              </h3>
              <p className="text-sm text-[#949BA8] leading-relaxed">
                Clona a estrutura base, configura rotas de agendamento e gera os componentes React aplicando a direção visual definida para o negócio.
              </p>
            </li>

            <li className="spec-sheet rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-[#282F3D] pb-3">
                <span className="font-mono text-xs font-semibold text-[#E59A28]">Etapa 3</span>
                <span className="font-mono text-xs text-[#949BA8]">Engenheiro de Qualidade (QA)</span>
              </div>
              <h3 className="font-display text-lg font-bold text-[#ECEEF2]">
                Validação de build e testes
              </h3>
              <p className="text-sm text-[#949BA8] leading-relaxed">
                Executa a compilação de produção e valida os fluxos principais antes de atualizar o registro na fila do Supabase como concluído.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* 5. Homologated Projects */}
      <section id="projetos-homologados" className="py-16 border-t border-[#282F3D] bg-[#141820]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold text-[#ECEEF2]">
              Projetos homologados na plataforma
            </h2>
            <p className="text-sm text-[#949BA8] max-w-[65ch]">
              Fichas técnicas de sistemas configurados e entregues pela linha de produção.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOMOLOGATED_SPECS.map((spec) => (
              <article key={spec.code} className="spec-sheet rounded-lg p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#282F3D] pb-2.5">
                    <span className="font-mono text-xs text-[#E59A28]">{spec.code}</span>
                    <span className="font-mono text-xs font-semibold text-[#ECEEF2]">Setup: {spec.investment}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#ECEEF2]">{spec.client}</h3>
                    <p className="text-xs text-[#949BA8]">{spec.sector}</p>
                  </div>
                  <p className="text-sm text-[#949BA8] leading-relaxed">{spec.outcome}</p>
                </div>

                <div className="pt-3 border-t border-[#282F3D] space-y-1.5">
                  <span className="block font-mono text-[11px] text-[#949BA8]">Módulos integrados:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {spec.stack.map((item) => (
                      <span
                        key={item}
                        className="text-xs font-mono bg-[#141820] border border-[#282F3D] px-2 py-0.5 rounded text-[#ECEEF2]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Orchestrator Telemetry Modal */}
      {isSimulating && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="orchestrator-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl bg-[#191D26] border border-[#384152] rounded-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="bg-[#141820] px-6 py-4 flex items-center justify-between border-b border-[#282F3D]">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    simStep < 8 ? 'bg-[#E59A28] animate-pulse' : 'bg-[#22C55E]'
                  }`}
                />
                <h3 id="orchestrator-modal-title" className="font-display font-bold text-sm text-[#ECEEF2]">
                  Painel de execução do orquestrador
                </h3>
              </div>
              {simStep >= 8 && (
                <button
                  type="button"
                  onClick={() => setIsSimulating(false)}
                  className="text-[#ECEEF2] hover:bg-[#202632] text-xs font-semibold px-3 py-1.5 rounded border border-[#282F3D] transition-colors cursor-pointer"
                >
                  Fechar painel
                </button>
              )}
            </div>

            {/* Sunken Dark Terminal Body */}
            <div className="flex-grow p-6 overflow-y-auto font-mono text-xs text-[#ECEEF2] space-y-2 bg-[#0E1116] min-h-[260px]">
              {simLogs.map((log, index) => (
                <div key={index} className="leading-relaxed border-l-2 border-[#E59A28] pl-3 py-0.5">
                  {log}
                </div>
              ))}
              {simStep < 8 && (
                <div className="flex items-center gap-2 text-[#E59A28] pt-2 pl-3">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Agente executando tarefas...</span>
                </div>
              )}
            </div>

            {/* Generated JSON Payload Output */}
            {simStep >= 8 && generatedPayload && (
              <div className="border-t border-[#282F3D] p-5 bg-[#141820] overflow-y-auto max-h-[260px]">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-xs font-semibold text-[#ECEEF2]">
                    Payload JSON enviado para orquestração:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(generatedPayload, null, 2));
                    }}
                    className="text-[#E59A28] hover:text-[#F2AA3C] font-semibold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>Copiar JSON</span>
                  </button>
                </div>
                <pre className="bg-[#0E1116] border border-[#282F3D] rounded p-3.5 font-mono text-[11px] text-[#ECEEF2] overflow-x-auto">
                  {JSON.stringify(generatedPayload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
