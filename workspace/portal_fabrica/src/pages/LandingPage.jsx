import React, { useState, useEffect } from 'react';

// Curated colors with RGB values (for Tailwind CSS variables) and hex codes
const PALETTES = [
  { name: 'Neon Indigo', rgb: '99, 102, 241', glow: 'rgba(99, 102, 241, 0.2)', hex: '#6366f1', description: 'Tecnologia & SaaS' },
  { name: 'Emerald Mint', rgb: '16, 185, 129', glow: 'rgba(16, 185, 129, 0.2)', hex: '#10b981', description: 'Saúde & Odontologia' },
  { name: 'Ocean Cyan', rgb: '14, 165, 233', glow: 'rgba(14, 165, 233, 0.2)', hex: '#0ea5e9', description: 'Corporativo & Serviços' },
  { name: 'Cyberpunk Rose', rgb: '244, 63, 94', glow: 'rgba(244, 63, 94, 0.2)', hex: '#f43f5e', description: 'Estética & Beleza' },
  { name: 'Warm Amber', rgb: '245, 158, 11', glow: 'rgba(245, 158, 11, 0.2)', hex: '#f59e0b', description: 'Barbearia & Alimentação' },
];

const MODULES_DATA = [
  {
    id: 'agendador_pwa',
    title: 'Agendador PWA',
    price: 990,
    monthly: 49,
    description: 'Sistema de agendamento Progressive Web App (PWA) instalável, funcionando offline e otimizado para celulares.',
    features: ['Instalável na tela inicial', 'Funcionamento offline (PWA)', 'Agenda interativa de clientes', 'Painel do administrador integrado'],
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    required: true,
  },
  {
    id: 'site',
    title: 'Site Institucional',
    price: 600,
    monthly: 39,
    description: 'Landing page premium para divulgação institucional do seu negócio, otimizada para SEO e Google.',
    features: ['Design institucional exclusivo', 'Otimização para SEO (Google)', 'Formulário de contato', 'Hospedagem inclusa'],
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    required: false,
  },
  {
    id: 'app',
    title: 'Aplicativo Mobile',
    price: 1200,
    monthly: 99,
    description: 'Aplicativo nativo compilado para Android e iOS, publicado nas lojas App Store e Google Play.',
    features: ['Publicação na Google Play', 'Publicação na App Store', 'Notificações push em tempo real', 'Suporte a hardware nativo'],
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    required: false,
  },
  {
    id: 'whatsapp',
    title: 'Agendador de WhatsApp',
    price: 450,
    monthly: 29,
    description: 'Robô com IA integrado ao WhatsApp para agendamentos automáticos por conversa de texto e envio de lembretes.',
    features: ['Agendamento automático via chat', 'Lembretes de horário no WhatsApp', 'Atendimento de dúvidas com IA 24h', 'Integração direta com o número da empresa'],
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    required: false,
  },
];

export default function LandingPage() {
  const [businessName, setBusinessName] = useState('Meu Negócio Perfeito');
  const [selectedPalette, setSelectedPalette] = useState(PALETTES[0]);
  const [activeModules, setActiveModules] = useState(['agendador_pwa']);
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  // Reference Links states
  const [referenceLinks, setReferenceLinks] = useState([{ url: '', type: 'site', notes: '' }]);


  // RAG States
  const [appObjective, setAppObjective] = useState('');
  const [servicesList, setServicesList] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [professionals, setProfessionals] = useState('');
  const [avgDuration, setAvgDuration] = useState('');
  const [customFields, setCustomFields] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Simulation Modal states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simLogs, setSimLogs] = useState([]);
  const [generatedPayload, setGeneratedPayload] = useState(null);

  // Supabase Backend States
  const [recentProjects, setRecentProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    const newUploadedFiles = [...uploadedFiles];

    for (const file of files) {
      try {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });

        console.log(`Uploading file ${file.name} to server...`);
        const response = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            fileName: file.name,
            mimeType: file.type
          })
        });

        if (!response.ok) {
          throw new Error(`Erro ao fazer upload do arquivo: ${file.name}`);
        }

        const uploadedFile = await response.json();
        newUploadedFiles.push({ name: uploadedFile.name, url: uploadedFile.url });
        console.log(`File ${file.name} uploaded successfully! URL: ${uploadedFile.url}`);
      } catch (err) {
        console.error(err);
        alert(err.message || 'Erro durante o upload.');
      }
    }

    setUploadedFiles(newUploadedFiles);
    setIsUploading(false);
  };

  const removeUploadedFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, idx) => idx !== index));
  };

  const fetchRecentProjects = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/projetos');
      if (response.ok) {
        const data = await response.json();
        setRecentProjects(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar projetos do banco de dados (backend offline?):', err.message);
    }
  };

  useEffect(() => {
    fetchRecentProjects();
  }, []);


  // Apply colors to :root variables on palette change
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', selectedPalette.rgb);
    document.documentElement.style.setProperty('--primary-glow', selectedPalette.glow);
  }, [selectedPalette]);

  const toggleModule = (moduleId) => {
    if (moduleId === 'agendador_pwa') return; // agendador_pwa is mandatory
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
      alert('Por favor, preencha seu e-mail e celular!');
      return;
    }

    // Estrutura o additional_data do RAG
    const additional_data = {
      files: uploadedFiles,
      links: referenceLinks
        .filter(l => l.url.trim() !== '')
        .map(l => ({ label: `Referência (${l.type})${l.notes ? ` - ${l.notes}` : ''}`, url: l.url })),
      texts: [
        { label: 'Informações Extras para o Agendamento', text: customFields }
      ]
    };

    const payload = {
      project_name: businessName,
      branding: {
        palette_name: selectedPalette.name,
        primary_color_hex: selectedPalette.hex,
        primary_color_rgb: selectedPalette.rgb,
      },
      modules: activeModules,
      reference_links: referenceLinks.filter(l => l.url.trim() !== ''),
      client_info: {
        email: clientEmail,
        phone: clientPhone,
      },
      summary: {
        total_setup_price: calculateTotalPrice(),
        monthly_maintenance: calculateMonthlyPrice(),
      },
      ai_analysis: "",
      additional_data,
      timestamp: new Date().toISOString(),
    };

    setGeneratedPayload(payload);
    setIsSimulating(true);
    setSimStep(1);
    setSimLogs(['🤖 Iniciando envio de especificações...']);

    try {
      // 1. Salva o projeto no backend/Supabase
      setSimLogs(prev => [...prev, '💾 Salvando especificações do projeto no banco de dados Supabase...']);
      const saveResponse = await fetch('http://localhost:5000/api/projetos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!saveResponse.ok) throw new Error('Falha ao registrar projeto no backend.');
      const project = await saveResponse.json();
      setCurrentProjectId(project.id);
      
      setSimLogs(prev => [
        ...prev, 
        `✅ Lead registrado com sucesso! Código de Fila: #${project.id}`,
        '📩 Suas informações foram enviadas com sucesso para o nosso time de análise.',
        '📞 Em breve entraremos em contato para apresentar sua proposta e iniciar a geração do seu sistema!'
      ]);
      
      setSimStep(8);
      fetchRecentProjects(); // Atualiza a lista de projetos recentes
    } catch (err) {
      console.error('Erro ao orquestrar build real:', err);
      setSimLogs(prev => [
        ...prev, 
        '❌ Falha ao conectar com o backend local na porta 5000.', 
        '⚠️ Executando simulação offline para demonstração...'
      ]);
      
      // Fallback para simulação offline original
      const logMessages = [
        { text: '🔍 [Offline] Carregando templates locais e analisando diretivas de design...', delay: 1000 },
        { text: `🎨 [Offline] Configurando identidade visual para: "${businessName}" com paleta ${selectedPalette.name}`, delay: 2000 },
        { text: '🏗️ [Offline] Montando arquitetura do projeto e instalando dependências base...', delay: 3500 },
        { text: '✨ [Offline] Agente Frontend: Gerando páginas responsivas e aplicando folha de estilos...', delay: 5000 },
        { text: '🚀 [Offline] Projeto simulado gerado com sucesso! (Salvo apenas localmente)', delay: 6500 },
      ];

      logMessages.forEach((log, index) => {
        setTimeout(() => {
          setSimLogs(prev => [...prev, log.text]);
          if (index === logMessages.length - 1) {
            setSimStep(8);
          }
        }, log.delay);
      });
    }
  };

  return (
    <div className="relative">
      {/* 1. Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
          Próxima Geração de Desenvolvimento de Software
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Crie seu Agendador PWA com{' '}
          <span className="bg-gradient-to-r from-[rgb(var(--primary))] to-purple-400 bg-clip-text text-transparent transition-all duration-300">
            Inteligência Artificial
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl">
          Nossos agentes de IA orquestram e programam seu agendador Progressive Web App (PWA) e complementam com site, app mobile e WhatsApp sob medida.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <a
            href="#configurador"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[rgb(var(--primary))] to-purple-600 hover:brightness-110 text-white font-semibold text-base shadow-lg shadow-indigo-500/10 transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            <span>Iniciar Configuração</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="#beneficios"
            className="w-full sm:w-auto px-8 py-4 rounded-xl glass-panel text-gray-300 hover:text-white hover:bg-gray-800/60 font-semibold text-base transition-all duration-300 text-center"
          >
            Como Funciona
          </a>
        </div>

        {/* Dynamic Connected Node Preview Graphic */}
        <div className="mt-20 w-full max-w-3xl glass-panel rounded-2xl p-6 relative overflow-hidden border border-gray-800 shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgb(var(--primary))] to-transparent opacity-60"></div>
          
          <div className="text-left mb-6 flex justify-between items-center border-b border-gray-900 pb-4">
            <div>
              <p className="text-xs text-indigo-400 font-bold tracking-widest uppercase">Live Architecture Preview</p>
              <h3 className="text-lg font-bold text-white mt-1">Status do Orquestrador Local</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs text-emerald-400 font-medium">Motor de IA Pronto</span>
            </div>
          </div>

          {/* Interactive visual canvas of nodes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 relative z-10">
            {MODULES_DATA.map((mod) => {
              const isAct = activeModules.includes(mod.id);
              return (
                <div 
                  key={mod.id}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-500 ${
                    isAct 
                      ? 'bg-[rgba(var(--primary),0.05)] border-[rgb(var(--primary))] shadow-[0_0_20px_rgba(var(--primary),0.1)]' 
                      : 'bg-gray-950/40 border-gray-900 opacity-40'
                  }`}
                >
                  <div className={`p-3 rounded-lg mb-3 ${isAct ? 'bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]' : 'bg-gray-800 text-gray-500'}`}>
                    {mod.icon}
                  </div>
                  <span className="text-xs font-semibold text-gray-300 text-center">{mod.title}</span>
                  <span className={`text-[10px] mt-1 font-bold ${isAct ? 'text-[rgb(var(--primary))]' : 'text-gray-600'}`}>
                    {isAct ? 'CONECTADO' : 'INATIVO'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Como Funciona (Benefícios) */}
      <section id="beneficios" className="py-24 border-t border-gray-900 bg-gray-950/40 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Desenvolvimento Modular Orquestrado por Agentes
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Reduzimos o tempo de entrega de meses para minutos utilizando agentes autônomos integrados que compartilham e executam em tempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 rounded-2xl space-y-4 relative border border-gray-800/80">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xl">
                1
              </div>
              <h3 className="text-xl font-bold text-white">Escolha a Modularidade</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Selecione apenas o que você precisa. Se for apenas um site institucional de alta conversão, ou um ecossistema com app móvel e automações do WhatsApp.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl space-y-4 relative border border-gray-800/80">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-xl">
                2
              </div>
              <h3 className="text-xl font-bold text-white">Customize a Marca</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Insira o nome do seu negócio e defina as cores primárias. O orquestrador aplica automaticamente as variáveis de branding em todos os arquivos de estilo do ecossistema.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl space-y-4 relative border border-gray-800/80">
              <div className="h-12 w-12 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center font-bold text-xl">
                3
              </div>
              <h3 className="text-xl font-bold text-white">Deploy & Conectividade</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Nossos agentes autônomos geram o código completo e preparam para hospedagem. Todos os módulos operam de forma 100% interligada nativamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Configurador & Painel de Branding Interativo */}
      <section id="configurador" className="py-24 border-t border-gray-900 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Configure Seu Sistema em Tempo Real
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Monte seu pacote tecnológico e forneça os materiais para que a IA crie a identidade visual e o escopo do projeto instantaneamente.
          </p>
        </div>

        {/* Dynamic Container utilizing CSS variables to update colors in real time */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Configuration Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Step 1: Branding */}
            <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-gray-800 shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-900 pb-4">
                <span className="text-xs font-bold px-2 py-1 bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] rounded-md">Passo 1</span>
                <h3 className="text-lg font-bold text-white">Nome do Negócio</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Nome do Negócio</label>
                <input 
                  type="text" 
                  value={businessName} 
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[rgb(var(--primary))] transition-colors"
                  placeholder="Ex: Sorriso Perfeito"
                />
              </div>
            </div>

            {/* Step 2: Modules Selection */}
            <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-gray-800 shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-900 pb-4">
                <span className="text-xs font-bold px-2 py-1 bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] rounded-md">Passo 2</span>
                <h3 className="text-lg font-bold text-white">Módulos do Sistema</h3>
              </div>

              <div className="space-y-4">
                {MODULES_DATA.map((mod) => {
                  const isSelected = activeModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`flex flex-col sm:flex-row items-start gap-4 p-5 rounded-xl border cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? 'border-[rgb(var(--primary))] bg-[rgba(var(--primary),0.04)] shadow-[0_0_15px_rgba(var(--primary),0.05)]'
                          : 'border-gray-900 hover:border-gray-800 bg-gray-950/60'
                      }`}
                    >
                      {/* Checkbox indicator */}
                      <div className={`mt-1 h-5 w-5 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                        isSelected 
                          ? 'bg-[rgb(var(--primary))] border-[rgb(var(--primary))] text-white' 
                          : 'border-gray-700 bg-gray-900'
                      }`}>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Icon */}
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-[rgb(var(--primary))]/15 text-[rgb(var(--primary))]' : 'bg-gray-800 text-gray-500'}`}>
                        {mod.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-grow space-y-1">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <h4 className="font-bold text-white flex items-center gap-2">
                            {mod.title}
                            {mod.required && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-semibold uppercase">Base Obrigatória</span>
                            )}
                          </h4>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-white">R$ {mod.price}</span>
                            <span className="text-xs text-gray-500"> + R$ {mod.monthly}/mês</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{mod.description}</p>
                        
                        {/* Features bullets */}
                        {isSelected && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-3 mt-3 border-t border-gray-900">
                            {mod.features.map((feat) => (
                              <span key={feat} className="text-[10px] text-gray-300 flex items-center gap-1.5">
                                <span className="h-1 w-1 rounded-full bg-[rgb(var(--primary))]"></span>
                                {feat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Coleta de Dados e Materiais */}
            <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-gray-800 shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-900 pb-4">
                <span className="text-xs font-bold px-2 py-1 bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] rounded-md">Passo 3</span>
                <h3 className="text-lg font-bold text-white">Coleta de Dados e Materiais (RAG)</h3>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Forneça links de referência, arquivos de apoio (como catálogos, cardápios ou tabelas de preços) e observações extras. Nossa IA processará todas as informações via RAG para configurar o banco de dados do seu agendador de forma inteligente.
              </p>

              {/* Links de Referência */}
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">Links de Referência (Opcional)</label>
                <div className="space-y-4">
                  {referenceLinks.map((link, index) => (
                    <div key={index} className="space-y-3 p-4 rounded-xl bg-gray-950/40 border border-gray-905 relative">
                      <div className="flex justify-between items-center gap-3">
                        <select
                          value={link.type}
                          onChange={(e) => updateReferenceLink(index, 'type', e.target.value)}
                          className="bg-gray-950 border border-gray-850 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[rgb(var(--primary))]"
                        >
                          <option value="site">Website</option>
                          <option value="instagram">Instagram</option>
                          <option value="linktree">Linktree</option>
                          <option value="outro">Outro Reference</option>
                        </select>

                        {referenceLinks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReferenceLink(index)}
                            className="text-gray-500 hover:text-red-400 text-xs font-semibold"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) => updateReferenceLink(index, 'url', e.target.value)}
                        className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-gray-650 focus:outline-none focus:border-[rgb(var(--primary))]"
                        placeholder="Ex: instagram.com/sorrisoperfeito ou https://..."
                      />

                      <input
                        type="text"
                        value={link.notes}
                        onChange={(e) => updateReferenceLink(index, 'notes', e.target.value)}
                        className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-gray-650 focus:outline-none focus:border-[rgb(var(--primary))]"
                        placeholder="O que você gosta nesta referência? (ex: as cores, o menu, etc.)"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={addReferenceLink}
                    className="px-4 py-2.5 rounded-xl border border-dashed border-gray-850 text-xs font-semibold text-gray-400 hover:text-white hover:border-gray-700 transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Adicionar Link</span>
                  </button>
                </div>
              </div>

              {/* Separador sutil */}
              <div className="border-t border-gray-900/65 my-5"></div>

              {/* File Upload: PDF or Images */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">Arquivos de Apoio (Catálogo, Cardápio, Tabela - PDF/Imagem)</label>
                
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-850 rounded-xl bg-gray-950/20 hover:bg-gray-950/40 transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <svg className="w-8 h-8 text-gray-500 group-hover:text-[rgb(var(--primary))] transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                    {isUploading ? 'Fazendo upload...' : 'Arraste ou clique para selecionar arquivos PDF ou Imagens'}
                  </span>
                  <span className="text-[10px] text-gray-650 mt-1">Formatos aceitos: PDF, PNG, JPG, WEBP (Máx. 16MB)</span>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex justify-between items-center p-2.5 rounded-lg bg-gray-950 border border-gray-850 text-xs">
                        <div className="flex items-center gap-2 text-gray-300 truncate">
                          <svg className="w-4 h-4 text-[rgb(var(--primary))] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUploadedFile(index)}
                          className="text-gray-500 hover:text-red-400 text-xs font-semibold px-2"
                        >
                          Excluir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Separador sutil */}
              <div className="border-t border-gray-900/65 my-5"></div>

              {/* Campos adicionais personalizados */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">Informações Extras para o Agendamento (Opcional)</label>
                <textarea
                  value={customFields}
                  onChange={(e) => setCustomFields(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-950 border border-gray-850 rounded-xl px-4 py-3 text-xs text-white placeholder:text-gray-650 focus:outline-none focus:border-[rgb(var(--primary))] transition-colors resize-none"
                  placeholder="Ex: Coletar porte do pet, restrições alimentares, marca do carro, ou detalhes sobre profissionais, horários e serviços adicionais..."
                />
              </div>
            </div>

            {/* Step 4: Checkout Form */}
            <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-gray-800 shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-900 pb-4">
                <span className="text-xs font-bold px-2 py-1 bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] rounded-md">Passo 4</span>
                <h3 className="text-lg font-bold text-white">Seus Dados de Contato</h3>
              </div>

              <form onSubmit={handleStartIaBuild} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">E-mail Corporativo</label>
                  <input 
                    type="email" 
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[rgb(var(--primary))] transition-colors"
                    placeholder="email@negocio.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">WhatsApp / Celular</label>
                  <input 
                    type="tel" 
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[rgb(var(--primary))] transition-colors"
                    placeholder="(00) 90000-0000"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className="sm:col-span-2 mt-4 w-full py-4 rounded-xl bg-gradient-to-r from-[rgb(var(--primary))] to-purple-600 hover:brightness-110 text-white font-bold text-base shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Orquestrar & Desenvolver Ecossistema</span>
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Pricing Summary (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            
            {/* Price Calculator Panel */}
            <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-gray-800 shadow-xl space-y-6">
              <h3 className="text-lg font-bold text-white border-b border-gray-900 pb-3">Resumo da Orquestração</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Investimento de Setup (Código):</span>
                  <span className="font-bold text-white">R$ {calculateTotalPrice().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Mensalidade (Hospedagem & API):</span>
                  <span className="font-bold text-white">R$ {calculateMonthlyPrice()}/mês</span>
                </div>
                
                <div className="h-px bg-gray-900 my-4"></div>

                <div className="flex justify-between items-baseline">
                  <span className="text-base font-bold text-white">Total Setup:</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[rgb(var(--primary))] transition-colors">
                      R$ {calculateTotalPrice().toLocaleString()}
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">+ R$ {calculateMonthlyPrice()}/mês recorrente</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. Cases & Depoimentos */}
      <section id="depoimentos" className="py-24 border-t border-gray-900 bg-gray-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Quem já orquestrou com nossa IA
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Negócios locais e serviços digitais criados do zero pelos nossos agentes autônomos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="glass-panel p-6 rounded-2xl border border-gray-850 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  SP
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Sorriso Perfeito</h4>
                  <p className="text-xs text-gray-500">Clínica Odontológica</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                "Subimos o site, aplicativo de marcação de consultas e lembretes por WhatsApp integrados. O fluxo de pacientes aumentou em 45% com lembretes inteligentes."
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Módulos: Site + App + Agendamento + WhatsApp</span>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-gray-850 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  ND
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Navalha de Ouro</h4>
                  <p className="text-xs text-gray-500">Barbearia Premium</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                "Os clientes marcam o corte diretamente pelo robô de WhatsApp que consulta nossa agenda em tempo real. Não perdemos mais agendamento por falta de resposta."
              </p>
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span>Módulos: Site + Agendamento + WhatsApp</span>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-gray-850 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                  PP
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Pampas Barber</h4>
                  <p className="text-xs text-gray-500">Rede de Barbearias</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                "Decidimos utilizar apenas o Site Institucional de alta velocidade para capturar leads corporativos. O resultado superou todas as expectativas."
              </p>
              <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                <span>Módulos: Site Institucional (Base)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4.5. Histórico de Projetos Recentes */}
      <section className="py-20 border-t border-gray-900 bg-gray-950/40 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <p className="text-xs text-indigo-400 font-bold tracking-widest uppercase">Integração Supabase</p>
              <h2 className="text-3xl font-extrabold text-white mt-2">Fila de Projetos no Supabase</h2>
            </div>
            <button 
              onClick={fetchRecentProjects}
              className="mt-4 md:mt-0 text-xs font-semibold px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white rounded-xl transition-all flex items-center gap-1.5 self-start cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18" />
              </svg>
              <span>Atualizar Fila</span>
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="glass-panel p-10 rounded-2xl border border-gray-850 text-center text-gray-550 text-xs">
              Nenhum projeto encontrado no banco de dados Supabase. Crie um projeto acima para iniciar a fila de desenvolvimento!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentProjects.slice(0, 6).map((proj) => {
                let name = proj.resultado_json?.app_name;
                let primary = proj.resultado_json?.primary_color || '#D4AF37';
                let secondary = proj.resultado_json?.secondary_color || '#1A1A1A';

                if (!name) {
                  const match = proj.mensagem_lead.match(/negócio chamado '([^']+)'/);
                  name = match ? match[1] : 'AppCustomizado';
                }

                if (!proj.resultado_json) {
                  const colorMatch = proj.mensagem_lead.match(/Cor principal:\s*(#[a-fA-F0-9]{6})/);
                  if (colorMatch) primary = colorMatch[1];
                }

                return (
                  <div key={proj.id} className="glass-panel p-6 rounded-2xl border border-gray-850 flex flex-col justify-between space-y-4 hover:border-gray-800 transition-all duration-300">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-md" style={{ backgroundColor: primary }}>
                          {name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm leading-tight">{name}</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">ID: #{proj.id} • {new Date(proj.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        proj.status === 'concluido' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        proj.status === 'processando' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse' :
                        proj.status === 'erro' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {proj.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 line-clamp-3 leading-relaxed border-t border-gray-900 pt-3">
                      {proj.mensagem_lead}
                    </div>

                    {proj.resultado_json && (
                      <div className="flex gap-4 text-[10px] text-gray-500 border-t border-gray-900 pt-3">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: primary }}></span>
                          Primária: {primary}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: secondary }}></span>
                          Secundária: {secondary}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. Process / Simulation Terminal Modal */}
      {isSimulating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="bg-gray-900 px-6 py-4 flex items-center justify-between border-b border-gray-850">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <h3 className="font-bold text-sm text-white">Painel do Orquestrador de Agentes</h3>
              </div>
              {simStep >= 8 && (
                <button 
                  onClick={() => setIsSimulating(false)}
                  className="text-gray-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Fechar Painel
                </button>
              )}
            </div>

            {/* Terminal Body */}
            <div className="flex-grow p-6 overflow-y-auto font-mono text-xs text-gray-300 space-y-2 bg-[#090b11] min-h-[300px]">
              {simLogs.map((log, index) => (
                <div key={index} className="leading-relaxed border-l-2 border-indigo-500/20 pl-3 py-0.5 animate-slideUp">
                  {log}
                </div>
              ))}
              {simStep < 8 && (
                <div className="flex items-center gap-2 text-indigo-400 pt-2 pl-3">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Agente executando tarefas...</span>
                </div>
              )}
            </div>

            {/* Generated JSON Payload Output (visible after execution finishes) */}
            {simStep >= 8 && generatedPayload && (
              <div className="border-t border-gray-800 p-6 bg-gray-950 overflow-y-auto max-h-[300px]">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-400">Payload JSON gerado para orquestração:</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(generatedPayload, null, 2));
                      alert('Payload copiado para a área de transferência!');
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-bold text-xs flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copiar JSON</span>
                  </button>
                </div>
                <pre className="bg-[#0c0f17] border border-gray-900 rounded-lg p-4 font-mono text-[10px] text-indigo-300 overflow-x-auto">
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
