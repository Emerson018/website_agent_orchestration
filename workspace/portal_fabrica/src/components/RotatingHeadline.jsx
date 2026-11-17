import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// O que a Aether entrega, uma palavra por vez, cada uma no seu tom da paleta
const WORDS = [
  { word: 'site', tone: 'lime' },
  { word: 'agenda', tone: 'lavender' },
  { word: 'app', tone: 'mist' },
];

const INTERVAL_MS = 1800;

export default function RotatingHeadline({ id }) {
  const [{ index, previous }, setRotation] = useState({ index: 0, previous: -1 });
  const slotRef = useRef(null);
  const [widths, setWidths] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setRotation(({ index: current }) => ({ index: (current + 1) % WORDS.length, previous: current }));
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Mede cada palavra para o espaço dela abrir e fechar suavemente,
  // sem deixar buraco depois de "app" nem empurrar o resto da linha de uma vez
  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return undefined;
    const measure = () => setWidths([...slot.querySelectorAll('.swap-item')].map((el) => el.scrollWidth));
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <h1
      id={id}
      aria-label="Conecte site, agenda e app ao crescimento do seu negócio."
      className="text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[1] tracking-[-0.015em]"
    >
      <span aria-hidden className="block whitespace-nowrap">
        Conecte{' '}
        {/* Todas as palavras empilhadas no mesmo lugar: a ativa aparece, a anterior sai para cima */}
        <span
          ref={slotRef}
          className="swap swap-noun"
          style={widths ? { width: `${widths[index]}px` } : undefined}
        >
          {WORDS.map((item, i) => (
            <span
              key={item.word}
              className="swap-item"
              data-state={i === index ? 'active' : i === previous ? 'past' : 'next'}
            >
              <em className={`swap-tone-${item.tone} pr-[0.08em] font-medium italic`}>{item.word}</em>
            </span>
          ))}
        </span>
      </span>
      <span aria-hidden className="block">ao crescimento do seu negócio.</span>
    </h1>
  );
}
