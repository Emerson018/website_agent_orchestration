import React, { useState } from 'react';
import { apiFetch, formatBrazilianPhone, isValidBrazilianPhone } from '../lib/api';

const HOMOLOGATED_CASES = [
  {
    code: 'ESP-104',
    client: 'Sorriso Perfeito',
    sector: 'Clínica Odontológica',
    outcome:
      'Site institucional com agendamento PWA integrado, confirmações automáticas por WhatsApp e identidade visual exclusiva.',
    highlight: 'Taxa de confirmação de consultas subiu para 94%'
  },
  {
    code: 'ESP-118',
    client: 'Navalha de Ouro',
    sector: 'Barbearia & Estética',
    outcome:
      'Atendimento automatizado com consulta de horários em tempo real, sem perdas por demora no retorno e sincronizado com o CRM.',
    highlight: 'Zero conflitos de horários na agenda'
  },
  {
    code: 'ESP-129',
    client: 'Pampas Barber',
    sector: 'Rede de Barbearias',
    outcome:
      'Implantação de aplicativo web instalável de alta velocidade, centralizando unidades e captando novos clientes locais.',
    highlight: 'Carregamento instantâneo e offline'
  }
];

export default function LandingPage() {
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    website: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedData, setSubmittedData] = useState(null);

  const handlePhoneChange = (e) => {
    const formatted = formatBrazilianPhone(e.target.value);
    setFormData((prev) => ({ ...prev, phone: formatted }));
    if (errorMessage) setErrorMessage('');
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = formData.name.trim();
    const trimmedCompany = formData.company.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedWebsite = formData.website.trim();

    if (!trimmedName) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }
    if (!trimmedCompany) {
      setErrorMessage('Por favor, informe o nome da sua empresa ou negócio.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail de contato válido.');
      return;
    }
    if (!trimmedPhone || !isValidBrazilianPhone(trimmedPhone)) {
      setErrorMessage('Por favor, informe um WhatsApp válido com DDD (ex: (51) 99999-9999).');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: trimmedName,
        company: trimmedCompany,
        email: trimmedEmail,
        phone: trimmedPhone,
        website: trimmedWebsite || null
      };

      const res = await apiFetch('/projetos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let serverMessage = `Erro ao enviar solicitação (Código ${res.status}).`;
        try {
          const errBody = await res.json();
          if (errBody?.error) serverMessage = errBody.error;
        } catch {}
        throw new Error(serverMessage);
      }

      setSubmittedData({
        name: trimmedName,
        company: trimmedCompany,
        email: trimmedEmail,
        phone: trimmedPhone,
        website: trimmedWebsite
      });
    } catch (err) {
      console.error('Erro ao enviar lead:', err);
      setErrorMessage(err.message || 'Falha ao conectar com o servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#12151B] text-[#ECEEF2] min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-[#282F3D]">
        <div className="absolute inset-0 bg-radial from-[#E59A28]/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E59A28]/10 border border-[#E59A28]/25 text-[#E59A28] text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#E59A28] animate-pulse" />
              Fábrica de Sites & Softwares Sob Medida
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#ECEEF2] font-display">
              Projetos exclusivos gerados sob medida para o seu negócio
            </h1>

            <p className="text-base sm:text-lg text-[#949BA8] leading-relaxed">
              Diga adeus a modelos genéricos. Criamos sites de alta performance, agendadores PWA e automações de atendimento integradas ao WhatsApp e ao CRM.
            </p>
          </div>

          {/* Form / Success Container */}
          <div id="formulario" className="mt-12 max-w-2xl mx-auto scroll-mt-24">
            {submittedData ? (
              /* Success State (Clean, high-converting thank you screen) */
              <div className="rounded-xl border border-emerald-500/30 bg-[#161B22] p-8 sm:p-10 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center text-3xl font-bold shadow-inner">
                    ✓
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-[#ECEEF2] font-display">
                    Solicitação Recebida com Sucesso!
                  </h2>

                  <p className="text-sm sm:text-base text-[#949BA8] leading-relaxed">
                    Obrigado, <strong className="text-[#ECEEF2]">{submittedData.name}</strong>! Os dados da empresa{' '}
                    <strong className="text-[#E59A28]">{submittedData.company}</strong> foram registrados com sucesso no nosso sistema.
                  </p>

                  <div className="p-4 rounded-lg bg-[#12151B] border border-[#282F3D] text-left text-xs sm:text-sm space-y-2 mt-6">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#949BA8] pb-1 border-b border-[#282F3D]">
                      Resumo da Solicitação
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#949BA8]">Responsável:</span>
                      <span className="text-[#ECEEF2] font-medium">{submittedData.name}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#949BA8]">Empresa:</span>
                      <span className="text-[#ECEEF2] font-medium">{submittedData.company}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#949BA8]">E-mail:</span>
                      <span className="text-[#ECEEF2] font-medium">{submittedData.email}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#949BA8]">WhatsApp:</span>
                      <span className="text-emerald-400 font-medium">{submittedData.phone}</span>
                    </div>
                    {submittedData.website && (
                      <div className="flex justify-between py-0.5">
                        <span className="text-[#949BA8]">Site Atual:</span>
                        <a
                          href={submittedData.website.startsWith('http') ? submittedData.website : `https://${submittedData.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#E59A28] hover:underline truncate max-w-[200px]"
                        >
                          {submittedData.website}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 text-xs text-[#949BA8] flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Nosso time entrará em contato pelo WhatsApp para apresentar o direcionamento de design exclusivo.
                  </div>
                </div>
              </div>
            ) : (
              /* The 5 Fields Lead Capture Form */
              <div className="rounded-xl border border-[#282F3D] bg-[#161B22] p-6 sm:p-10 shadow-xl">
                <div className="mb-6 border-b border-[#282F3D] pb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#ECEEF2]">
                    Solicite seu Orçamento & Proposta Visual
                  </h2>
                  <p className="text-xs sm:text-sm text-[#949BA8] mt-1">
                    Preencha as informações essenciais abaixo para que nossa equipe monte a estrutura ideal para sua marca.
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm flex items-center gap-2">
                    <span className="font-bold text-base">⚠️</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Campo 1: Nome */}
                  <div className="space-y-1.5">
                    <label htmlFor="field-name" className="block text-xs sm:text-sm font-semibold text-[#ECEEF2]">
                      Nome Completo <span className="text-[#E59A28]">*</span>
                    </label>
                    <input
                      id="field-name"
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo Mendes"
                      value={formData.name}
                      onChange={handleChange('name')}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#12151B] border border-[#282F3D] text-[#ECEEF2] placeholder-[#5A6272] text-sm focus:outline-none focus:border-[#E59A28] transition-colors"
                    />
                  </div>

                  {/* Campo 2: Empresa */}
                  <div className="space-y-1.5">
                    <label htmlFor="field-company" className="block text-xs sm:text-sm font-semibold text-[#ECEEF2]">
                      Empresa ou Negócio <span className="text-[#E59A28]">*</span>
                    </label>
                    <input
                      id="field-company"
                      type="text"
                      required
                      placeholder="Ex: Barbearia Retrô ou Clínica Estética"
                      value={formData.company}
                      onChange={handleChange('company')}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#12151B] border border-[#282F3D] text-[#ECEEF2] placeholder-[#5A6272] text-sm focus:outline-none focus:border-[#E59A28] transition-colors"
                    />
                  </div>

                  {/* Grid de Contato: E-mail e WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Campo 3: E-mail */}
                    <div className="space-y-1.5">
                      <label htmlFor="field-email" className="block text-xs sm:text-sm font-semibold text-[#ECEEF2]">
                        E-mail de Contato <span className="text-[#E59A28]">*</span>
                      </label>
                      <input
                        id="field-email"
                        type="email"
                        required
                        placeholder="contato@suaempresa.com.br"
                        value={formData.email}
                        onChange={handleChange('email')}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#12151B] border border-[#282F3D] text-[#ECEEF2] placeholder-[#5A6272] text-sm focus:outline-none focus:border-[#E59A28] transition-colors"
                      />
                    </div>

                    {/* Campo 4: WhatsApp */}
                    <div className="space-y-1.5">
                      <label htmlFor="field-phone" className="block text-xs sm:text-sm font-semibold text-[#ECEEF2]">
                        WhatsApp Comercial <span className="text-[#E59A28]">*</span>
                      </label>
                      <input
                        id="field-phone"
                        type="tel"
                        required
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#12151B] border border-[#282F3D] text-[#ECEEF2] placeholder-[#5A6272] text-sm focus:outline-none focus:border-[#E59A28] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Campo 5: Site (Opcional) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="field-website" className="block text-xs sm:text-sm font-semibold text-[#ECEEF2]">
                        Site Atual ou Link de Referência
                      </label>
                      <span className="text-[11px] text-[#949BA8] font-normal">Opcional</span>
                    </div>
                    <input
                      id="field-website"
                      type="url"
                      placeholder="https://www.suaempresa.com.br"
                      value={formData.website}
                      onChange={handleChange('website')}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#12151B] border border-[#282F3D] text-[#ECEEF2] placeholder-[#5A6272] text-sm focus:outline-none focus:border-[#E59A28] transition-colors"
                    />
                    <p className="text-[11px] text-[#949BA8]">
                      Se você já possui um site, Instagram ou página de referência, insira a URL aqui.
                    </p>
                  </div>

                  {/* Botão de Envio */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-6 rounded-lg bg-[#E59A28] hover:bg-[#D48817] disabled:bg-[#E59A28]/50 text-[#12151B] font-bold text-sm sm:text-base transition-all transform active:scale-[0.99] shadow-lg hover:shadow-[#E59A28]/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-[#12151B] border-t-transparent rounded-full animate-spin" />
                          <span>Registrando sua solicitação...</span>
                        </>
                      ) : (
                        <span>Solicitar Orçamento & Direção de Design →</span>
                      )}
                    </button>
                  </div>

                  <p className="text-center text-[11px] text-[#949BA8]">
                    🔒 Seus dados estão seguros e serão utilizados exclusivamente para a elaboração do projeto comercial.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Institutional Highlights */}
      <section id="diferenciais" className="py-16 sm:py-20 bg-[#141820] border-b border-[#282F3D] scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#ECEEF2]">
              Por que nossa Fábrica de Software é diferente?
            </h2>
            <p className="text-sm text-[#949BA8] mt-2">
              Desenvolvemos aplicações com foco em retenção de clientes e geração de receita real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[#161B22] border border-[#282F3D] space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#E59A28]/10 text-[#E59A28] flex items-center justify-center text-xl font-bold">
                ⚡
              </div>
              <h3 className="text-base font-bold text-[#ECEEF2]">PWA Instalável & Ultra Rápido</h3>
              <p className="text-xs text-[#949BA8] leading-relaxed">
                Seu aplicativo fica disponível na tela inicial do celular do cliente, com carregamento instantâneo e suporte offline.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#161B22] border border-[#282F3D] space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#E59A28]/10 text-[#E59A28] flex items-center justify-center text-xl font-bold">
                💬
              </div>
              <h3 className="text-base font-bold text-[#ECEEF2]">Integração Nativa com WhatsApp CRM</h3>
              <p className="text-xs text-[#949BA8] leading-relaxed">
                Receba agendamentos, envie lembretes automatizados e qualifique clientes diretamente no painel do seu WhatsApp.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#161B22] border border-[#282F3D] space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#E59A28]/10 text-[#E59A28] flex items-center justify-center text-xl font-bold">
                🎨
              </div>
              <h3 className="text-base font-bold text-[#ECEEF2]">Direção de Design Exclusiva</h3>
              <p className="text-xs text-[#949BA8] leading-relaxed">
                Sem layouts repetitivos. Cada projeto recebe uma paleta semântica personalizada e tipografia alinhada à autoridade do seu nicho.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Homologated Cases Showcase */}
      <section id="cases" className="py-16 sm:py-20 bg-[#12151B] scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-block px-3 py-1 rounded-full bg-[#282F3D] text-[#949BA8] text-xs font-semibold uppercase tracking-wider mb-2">
              Cases Homologados
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#ECEEF2]">
              Negócios que já operam com a nossa tecnologia
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOMOLOGATED_CASES.map((item) => (
              <div
                key={item.code}
                className="p-6 rounded-xl bg-[#161B22] border border-[#282F3D] hover:border-[#E59A28]/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#E59A28] bg-[#E59A28]/10 px-2 py-0.5 rounded">
                      {item.code}
                    </span>
                    <span className="text-xs text-[#949BA8]">{item.sector}</span>
                  </div>

                  <h3 className="text-lg font-bold text-[#ECEEF2] font-display">{item.client}</h3>
                  <p className="text-xs text-[#949BA8] leading-relaxed">{item.outcome}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#282F3D] text-[11px] font-semibold text-emerald-400">
                  ★ {item.highlight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
