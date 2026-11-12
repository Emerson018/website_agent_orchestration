import { useEffect, useState } from 'react';
import { InteractiveSculptureCanvas } from './sculpture/InteractiveSculptureCanvas';
import { SCULPTURE_IMAGE_PATH } from './sculpture/palette';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

const noop = () => {};

/**
 * Fundo da primeira dobra: a escultura Ecos de Luz, que acorda ao passar o ponteiro.
 * Com "reduzir movimento" ligado, mostra a imagem parada.
 */
export default function EcosDeLuzBackdrop() {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const wide = useMediaQuery('(min-width: 1024px)');
  // Desktop: escultura à direita do texto. Celular: centralizada no alto da tela, acima do título.
  const anchorX = wide ? 0.82 : 0.5;

  if (reduceMotion) {
    return (
      <img
        src={SCULPTURE_IMAGE_PATH}
        alt=""
        className="h-full w-full object-contain"
        style={{ objectPosition: `${anchorX * 100}% 52%` }}
      />
    );
  }

  return (
    <InteractiveSculptureCanvas
      renderMode="hybrid"
      physicsMode="attract"
      activeColorIndex="cycle"
      pulseIntensity={0.4}
      lightIntensity={1.4}
      brushRadius={45}
      chainClick={false}
      persistentHighlight={false}
      relaxMode={false}
      breathingPattern="coherence"
      resetSignal={0}
      illuminateAllSignal={0}
      colorBurstSignal={0}
      onStatsChange={noop}
      anchorX={anchorX}
    />
  );
}
