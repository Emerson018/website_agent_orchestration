import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Loader2, MessageCircle } from 'lucide-react';
import { apiFetch, formatBrazilianPhone, isValidBrazilianPhone } from '../lib/api';
import { WHATSAPP_URL } from '../lib/contact';
import EcosDeLuzBackdrop from '../components/EcosDeLuzBackdrop';
import RotatingHeadline from '../components/RotatingHeadline';

// Sites que a Aether já fez (PRODUCT.md, Evidence on Hand): nome, tipo de negócio e captura de tela, sem links.
const TRABALHOS = [
  {
    name: '20barranove',
    kind: 'Parrilla e hamburgueria artesanal',
    image: '/assets/trabalhos/20barranove.jpg'
  },
  {
    name: 'Campeiro Fogão',
    kind: 'Gastronomia campeira e fogo de chão',
    image: '/assets/trabalhos/campeiro-fogao.jpg'
  },
  {
    name: 'Mariana Veiga',
    kind: 'Consultoria de imagem e estilo pessoal',
    image: '/assets/trabalhos/mv-consultoria.jpg',
    // Prévia em movimento: a abertura do site e um trecho da rolagem
    video: {
      webm: '/assets/trabalhos/mv-consultoria.webm',
      mp4: '/assets/trabalhos/mv-consultoria.mp4'
    }
  }
];

/**
 * Captura de um trabalho. Com vídeo, toca sem som e em loop só enquanto o card está na tela
 * e só baixa quando chega perto dela. Com "reduzir movimento" ligado, fica a imagem parada.
 */
function TrabalhoPreview({ trabalho }) {
  const videoRef = useRef(null);
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduceMotion(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [reduceMotion]);

  const alt = `Página inicial do site ${trabalho.name}`;
  const mediaClass = 'aspect-[16/10] w-full object-cover object-top';

  if (!trabalho.video || reduceMotion) {
    return <img src={trabalho.image} alt={alt} width="800" height="500" loading="lazy" className={mediaClass} />;
  }

  return (
    <video
      ref={videoRef}
      poster={trabalho.image}
      muted
      loop
      playsInline
      preload="none"
      width="800"
      height="500"
      aria-label={alt}
      className={mediaClass}
    >
      <source src={trabalho.video.webm} type="video/webm" />
      <source src={trabalho.video.mp4} type="video/mp4" />
    </video>
  );
}

const PASSOS = [
  {
    title: 'Você deixa o contato',
    text: 'Seu nome, e-mail, WhatsApp ou o Instagram do seu negócio. Leva menos de um minuto.'
  },
  {
    title: 'A gente estuda o seu negócio',
    text: 'Analisamos o seu perfil, o que os clientes dizem nas avaliações e seu negócio.'
  },
  {
    title: 'Você recebe a proposta',
    text: 'Um projeto pensado a partir do que já faz o seu negócio ser escolhido, com a sua cara e o seu jeito de atender.'
  }
];

const DIFERENCIAIS = [
  {
    title: 'Feito do zero, nunca de modelo',
    text: 'Cada site nasce do seu negócio: as suas cores, as suas fotos, o seu jeito de falar com o cliente. Nada de tema pronto trocando só o logo.'
  },
  {
    title: 'Com o que os seus clientes já dizem',
    text: 'As avaliações reais do seu Google Maps viram prova de confiança para quem ainda não conhece você.'
  },
  {
    title: 'Pensado para o celular',
    text: 'É no celular que as pessoas procuram onde comer, cortar o cabelo ou marcar um horário. O seu site funciona bem lá.'
  }
];

const STORAGE_KEY = 'portal_fabrica_submitted_lead';

// Com "reduzir movimento" ligado, a rolagem pula direto em vez de deslizar
const scrollBehavior = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

const fieldClass =
  'mt-1.5 block w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 py-2 text-[15px] text-bone placeholder:text-bone-faint transition-[border-color,box-shadow] focus:border-signal focus:shadow-[0_1px_0_0_var(--color-signal)] focus:outline-none';
const labelClass = 'block text-xs font-medium tracking-wide text-bone-muted transition-colors';
const fieldWrapClass = 'focus-within:[&>label]:text-bone';

// Revela cada seção uma vez, quando ela entra na tela. Sem IntersectionObserver, tudo fica visível.
function useScrollReveal() {
  useEffect(() => {
    const groups = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) return undefined;
    const root = document.documentElement;
    root.classList.add('reveal-ready');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute('data-revealed', '');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -15% 0px' }
    );
    groups.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      root.classList.remove('reveal-ready');
    };
  }, []);
}

// Atraso da cascata: cada item entra 70ms depois do anterior
const stagger = (i) => ({ '--i': i });

// Tipos de projeto do formulário (múltipla escolha). As chaves são as que o backend aceita.
// `hint` aparece ao passar o mouse (ou focar pelo teclado) e só descreve o que o
// Master Prompt manda construir para cada tipo (backend/master_prompt.js).
const PROJECT_TYPE_OPTIONS = [
  {
    key: 'site',
    label: 'Site',
    hint: 'Uma página do seu negócio, criada do zero: mostra o que você faz e leva o cliente direto para o seu WhatsApp.'
  },
  {
    key: 'agenda',
    label: 'Agenda',
    hint: 'Seus clientes escolhem o serviço, o dia e um horário livre pelo celular. Você confirma ou cancela cada um num painel só seu.'
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    hint: 'Um painel só seu para acompanhar os números do negócio, como o movimento de cada dia e os serviços mais procurados.'
  }
];

// "site", "site e agenda", "site, app mobile e agenda"
const joinPt = (items) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;

// Título dos diferenciais: palavras que entram depois que a versão genérica é riscada
const CLAIM_WORDS = ['Um', 'projeto', 'que', 'só', 'podia', 'ser', 'do'];

export default function LandingPage() {
  useScrollReveal();

  // Form State
  const [formData, setFormData] = useState({
    projectTypes: [],
    name: '',
    company: '',
    email: '',
    phone: '',
    website: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // true quando o envio falhou (não a validação): mostra a saída pelo WhatsApp
  const [sendFailed, setSendFailed] = useState(false);

  // Mantém os dados da solicitação persistidos para que a tela não suma mesmo em recargas
  const [submittedData, setSubmittedData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handlePhoneChange = (e) => {
    const formatted = formatBrazilianPhone(e.target.value);
    setFormData((prev) => ({ ...prev, phone: formatted }));
    if (errorMessage) setErrorMessage('');
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleProjectTypeToggle = (key) => () => {
    setFormData((prev) => ({
      ...prev,
      projectTypes: prev.projectTypes.includes(key)
        ? prev.projectTypes.filter((k) => k !== key)
        : [...prev.projectTypes, key]
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleResetForm = () => {
    setSubmittedData(null);
    setFormData({
      projectTypes: [],
      name: '',
      company: '',
      email: '',
      phone: '',
      website: ''
    });
    setErrorMessage('');
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    // Scroll suave de volta para o topo do formulário
    setTimeout(() => {
      const el = document.getElementById('formulario');
      if (el) el.scrollIntoView({ behavior: scrollBehavior() });
    }, 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSendFailed(false);

    const trimmedName = formData.name.trim();
    const trimmedCompany = formData.company.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedWebsite = formData.website.trim();

    // Na ordem fixa das opções, não na ordem dos cliques
    const projectTypes = PROJECT_TYPE_OPTIONS.filter((o) => formData.projectTypes.includes(o.key));

    if (projectTypes.length === 0) {
      setErrorMessage('Escolha pelo menos um tipo de projeto.');
      return;
    }
    if (!trimmedName) {
      setErrorMessage('Por favor, informe seu nome completo.');
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
        company: trimmedCompany || null,
        email: trimmedEmail,
        phone: trimmedPhone,
        website: trimmedWebsite || null,
        project_types: projectTypes.map((o) => o.key)
      };

      const res = await apiFetch('/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Envio recusado (HTTP ${res.status})`);
      }

      const submitted = {
        name: trimmedName,
        company: trimmedCompany,
        email: trimmedEmail,
        phone: trimmedPhone,
        website: trimmedWebsite,
        projectTypes: projectTypes.map((o) => o.label.toLowerCase())
      };

      setSubmittedData(submitted);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(submitted));
      } catch {}

      // Garante que o scroll fique posicionado no container de sucesso
      setTimeout(() => {
        const el = document.getElementById('formulario');
        if (el) el.scrollIntoView({ behavior: scrollBehavior() });
      }, 50);
    } catch (err) {
      console.error('Erro ao enviar lead:', err);
      setSendFailed(true);
      setErrorMessage('Não conseguimos enviar o seu contato agora. Tente de novo em instantes ou fale com a gente direto no WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div id="topo">
      {/* Primeira dobra: a escultura Ecos de Luz ao fundo, o título e o formulário */}
      <section className="relative isolate overflow-hidden" aria-labelledby="titulo-aether">
        <div className="absolute inset-x-0 top-0 -z-10 h-[50svh] lg:h-[100svh] lg:min-h-[640px]">
          <EcosDeLuzBackdrop />
          {/* Escurece o lado do texto para a leitura; não bloqueia o ponteiro sobre a escultura */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgb(5_5_7/0.85)_85%,#050507_100%)] lg:bg-[linear-gradient(90deg,#050507_0%,rgb(5_5_7/0.9)_34%,rgb(5_5_7/0.15)_58%,transparent_70%)]"
          />
          {/* Esmaece o topo para o menu não disputar com a escultura */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,#050507_10%,transparent)]" />
        </div>

        <div className="pointer-events-none mx-auto grid min-h-[100svh] max-w-[1400px] items-end px-5 pb-16 pt-[46svh] sm:px-8 lg:items-center lg:pb-12 lg:pt-24 lg:px-12">
          <div className="aether-rise w-full max-w-[34rem]">
            <RotatingHeadline id="titulo-aether" />
            <p className="mt-5 max-w-[30rem] text-base leading-relaxed text-bone-muted [text-wrap:balance] sm:text-[17px]">
              Estudamos seu negócio e criamos seu projeto do zero a partir dele.
            </p>

            <div className="relative isolate mt-8">
            <div id="formulario" className="pointer-events-auto scroll-mt-24 border border-line bg-void/85 p-6 sm:px-7 sm:py-6">
              {submittedData ? (
                <div role="status" className="aether-enter space-y-5">
                  <span className="aether-pop grid size-10 place-items-center rounded-full border border-signal text-signal">
                    <Check className="size-5" aria-hidden />
                  </span>
                  <div className="space-y-2">
                    <h2 className="text-3xl leading-tight">Recebemos, {submittedData.name.split(' ')[0]}.</h2>
                    <p className="text-sm leading-relaxed text-bone-muted">
                      Vamos estudar {submittedData.company ? <strong className="text-bone">{submittedData.company}</strong> : 'o seu negócio'} e
                      chamar você no WhatsApp <strong className="text-bone">{submittedData.phone}</strong> com a proposta
                      {submittedData.projectTypes?.length > 0 && (
                        <>
                          {' '}de <strong className="text-bone">{joinPt(submittedData.projectTypes)}</strong>
                        </>
                      )}
                      .
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-sm text-bone-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-bone"
                  >
                    Voltar ao site
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className="whitespace-nowrap text-2xl leading-none sm:text-[1.75rem]">Peça a sua proposta</h2>
                    <span className="text-xs text-bone-faint">Sem compromisso</span>
                  </div>

                  {/* Tipo de projeto: múltipla escolha, cada opção é um checkbox de verdade com cara de chip */}
                  <fieldset>
                    <legend className={labelClass}>
                      O que você quer criar? <span className="text-bone-faint">(pode escolher mais de um)</span>
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PROJECT_TYPE_OPTIONS.map((option) => {
                        const checked = formData.projectTypes.includes(option.key);
                        return (
                          <label key={option.key} className="group press relative cursor-pointer">
                            <input
                              type="checkbox"
                              name="project_types"
                              value={option.key}
                              checked={checked}
                              onChange={handleProjectTypeToggle(option.key)}
                              aria-describedby={`tipo-${option.key}-dica`}
                              className="peer absolute inset-0 cursor-pointer opacity-0"
                            />
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-bone-muted transition-colors peer-hover:border-bone-muted peer-hover:text-bone peer-checked:border-signal peer-checked:bg-signal/10 peer-checked:text-bone peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal">
                              {/* Marcador: círculo vazio que se preenche com o ✓ ao marcar */}
                              <span
                                aria-hidden
                                className={`grid size-3.5 place-items-center rounded-full border transition-colors duration-150 ${checked ? 'border-signal bg-signal' : 'border-line-strong'}`}
                              >
                                <Check
                                  strokeWidth={3}
                                  className={`size-2.5 text-void transition-[opacity,transform] duration-150 ${checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
                                />
                              </span>
                              {option.label}
                            </span>
                            {/* Dica: plaqueta de hairline sobre o chip, ligada ao marcador por um filamento */}
                            <span
                              id={`tipo-${option.key}-dica`}
                              role="tooltip"
                              className="tipo-dica pointer-events-none absolute bottom-full left-0 z-20 mb-3 block w-[15.5rem] border border-line-strong bg-void px-3.5 py-3 text-left text-xs leading-relaxed text-bone-muted group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-hover:blur-none peer-focus-visible:visible peer-focus-visible:translate-y-0 peer-focus-visible:opacity-100 peer-focus-visible:blur-none"
                            >
                              <span className="mb-1 block font-medium text-bone">{option.label}</span>
                              {option.hint}
                              <span aria-hidden className="absolute left-[1.3rem] top-full h-3 w-px bg-line-strong" />
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className={fieldWrapClass}>
                      <label htmlFor="field-name" className={labelClass}>
                        Seu nome
                      </label>
                      <input
                        id="field-name"
                        type="text"
                        autoComplete="name"
                        value={formData.name}
                        onChange={handleChange('name')}
                        className={fieldClass}
                        required
                      />
                    </div>
                    <div className={fieldWrapClass}>
                      <label htmlFor="field-company" className={labelClass}>
                        Nome do negócio <span className="text-bone-faint">(opcional)</span>
                      </label>
                      <input
                        id="field-company"
                        type="text"
                        autoComplete="organization"
                        value={formData.company}
                        onChange={handleChange('company')}
                        className={fieldClass}
                      />
                    </div>
                    <div className={fieldWrapClass}>
                      <label htmlFor="field-email" className={labelClass}>
                        E-mail
                      </label>
                      <input
                        id="field-email"
                        type="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange('email')}
                        className={fieldClass}
                        required
                      />
                    </div>
                    <div className={fieldWrapClass}>
                      <label htmlFor="field-phone" className={labelClass}>
                        WhatsApp
                      </label>
                      <input
                        id="field-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="(51) 99999-9999"
                        className={fieldClass}
                        required
                      />
                    </div>
                  </div>
                  <div className={fieldWrapClass}>
                    <label htmlFor="field-website" className={labelClass}>
                      Site ou Instagram <span className="text-bone-faint">(opcional)</span>
                    </label>
                    <input
                      id="field-website"
                      type="text"
                      inputMode="url"
                      value={formData.website}
                      onChange={handleChange('website')}
                      placeholder="seunegocio.com.br ou @seunegocio"
                      className={fieldClass}
                    />
                  </div>

                  {errorMessage && (
                    <p key={errorMessage} role="alert" className="aether-drop text-sm text-signal">
                      {errorMessage}
                      {sendFailed && (
                        <>
                          {' '}
                          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="font-medium text-bone underline underline-offset-4">
                            Abrir o WhatsApp
                          </a>
                        </>
                      )}
                    </p>
                  )}

                  <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-signal px-6 py-3 text-sm font-semibold text-void press hover:bg-signal-hover disabled:cursor-wait disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Enviando...
                        </>
                      ) : (
                        <>
                          Solicitar serviço
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </>
                      )}
                    </button>
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm text-bone-muted transition-colors hover:text-bone"
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      Ou chame no WhatsApp
                    </a>
                  </div>
                </form>
              )}
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona: três pontos ligados por um fio */}
      <section id="como-funciona" aria-labelledby="titulo-como" className="scroll-mt-8 border-t border-line">
        <div data-reveal className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          <h2 id="titulo-como" className="r-up max-w-[18ch] text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1.02]">
            Do seu negócio real até o site, em três passos.
          </h2>
          <ol className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            <span aria-hidden style={stagger(1)} className="r-line absolute left-[5px] top-2 bottom-2 w-px bg-line-strong md:inset-x-0 md:top-[5px] md:bottom-auto md:h-px md:w-auto" />
            {PASSOS.map((passo, i) => (
              <li key={passo.title} style={stagger(i + 1)} className="r-up relative pl-8 md:pl-0 md:pt-10">
                <span
                  aria-hidden
                  className={`absolute left-0 top-1.5 size-[11px] rounded-full md:top-0 ${
                    i === 2 ? 'r-lit bg-signal shadow-[0_0_0_4px_rgb(198_244_50/0.18)]' : 'bg-bone'
                  }`}
                />
                <h3 className="text-[1.65rem] leading-tight">{passo.title}</h3>
                <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-bone-muted">{passo.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Diferenciais */}
      <section
        aria-labelledby="titulo-diferenciais"
        className="border-t border-line bg-void bg-[radial-gradient(ellipse_70%_90%_at_8%_0%,rgb(198_244_50/0.07),transparent_70%)]"
      >
        <div data-reveal className="mx-auto grid max-w-[1400px] gap-14 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-12">
          {/* A promessa do modelo pronto é riscada e reescrita: "de qualquer negócio" vira "do seu negócio" */}
          <h2
            id="titulo-diferenciais"
            aria-label="Um projeto que só podia ser do seu negócio."
            className="r-up claim max-w-[14ch] text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1.02]"
          >
            <span aria-hidden className="claim-generic">
              Um projeto que podia ser <span className="claim-strike">de qualquer negócio</span>.
            </span>
            <span aria-hidden className="claim-own">
              {CLAIM_WORDS.map((w, i) => (
                <React.Fragment key={w}>
                  <span className="claim-word" style={{ '--w': i }}>
                    {w}
                  </span>{' '}
                </React.Fragment>
              ))}
              <em className="claim-accent font-medium italic">
                <span className="claim-word" style={{ '--w': CLAIM_WORDS.length }}>
                  seu
                </span>{' '}
                <span className="claim-word" style={{ '--w': CLAIM_WORDS.length + 1 }}>
                  negócio.
                </span>
              </em>
            </span>
          </h2>
          <dl className="divide-y divide-line border-y border-line">
            {DIFERENCIAIS.map((d, i) => (
              <div key={d.title} style={stagger(i + 1)} className="r-up grid gap-2 py-7 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-8">
                <dt className="font-display text-2xl leading-tight">{d.title}</dt>
                <dd className="text-[15px] leading-relaxed text-bone-muted">{d.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Trabalhos */}
      <section id="trabalhos" aria-labelledby="titulo-trabalhos" className="scroll-mt-8 border-t border-line">
        <div data-reveal className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          <h2 id="titulo-trabalhos" className="r-up text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1.02]">
            Alguns sites que já fizemos.
          </h2>
          <ul className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-3">
            {TRABALHOS.map((t, i) => (
              <li key={t.name} style={stagger(i + 1)} className="r-up">
                <figure>
                  <div className="r-image overflow-hidden border border-line bg-void-raised">
                    <TrabalhoPreview trabalho={t} />
                  </div>
                  <figcaption className="mt-4">
                    <p className="font-display text-2xl leading-tight">{t.name}</p>
                    <p className="mt-1 text-sm text-bone-muted">{t.kind}</p>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Fechamento: a mão da escultura volta, parada, sobre o campo lima */}
      <section
        data-reveal
        aria-labelledby="titulo-fechamento"
        className="relative isolate overflow-hidden border-t border-line bg-void bg-[radial-gradient(ellipse_60%_100%_at_85%_30%,rgb(198_244_50/0.09),transparent_72%)]"
      >
        <img
          src="/assets/ecos-de-luz.jpg"
          alt=""
          aria-hidden
          loading="lazy"
          className="r-fade pointer-events-none relative -z-10 block h-72 w-full object-cover object-[75%_8%] opacity-70 mix-blend-screen [mask-image:linear-gradient(180deg,black_50%,transparent)] sm:h-96 lg:absolute lg:right-0 lg:top-0 lg:h-full lg:w-[52%] lg:[mask-image:linear-gradient(90deg,transparent,black_40%)]"
        />
        {/* Texto e ações sempre sobre o campo escuro: no celular a arte fica acima, no desktop à direita */}
        <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-8 px-5 pb-28 pt-2 sm:px-8 sm:pb-36 lg:px-12 lg:py-36">
          <h2 id="titulo-fechamento" style={stagger(1)} className="r-up max-w-[16ch] text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1.02]">
            O seu negócio já tem o que é preciso. Vamos acender.
          </h2>
          <div style={stagger(2)} className="r-up flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <a
              href="#formulario"
              className="inline-flex items-center gap-2 rounded-full bg-signal px-6 py-3 text-sm font-semibold text-void press hover:bg-signal-hover"
            >
              Solicitar serviço
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-bone-muted transition-colors hover:text-bone"
            >
              <MessageCircle className="size-4" aria-hidden />
              Chamar no WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
