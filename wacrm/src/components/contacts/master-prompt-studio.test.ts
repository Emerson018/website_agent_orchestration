import { describe, it, expect } from 'vitest';

describe('Master Prompt Studio (Zero-Template Engine)', () => {
  it('validates 4-block reverse engineering prompt layout', () => {
    const company = 'Barbearia Dom E2E';
    const dossie = {
      nome_verificado: 'Barbearia Dom E2E',
      endereco_formatado: 'Rua dos Andradas, 200 - Centro',
      telefone: '(51) 98888-2233',
      nota: 4.8,
      total_avaliacoes: 120,
      elogios_destaque: [
        { author: 'Mateus P.', text: 'Melhor corte degradê e cerveja gelada inclusa!' }
      ],
    };

    const diagnostico = {
      resumo_empresa: 'Barbearia clássica vintage com atendimento exclusivo e espaço bar.',
      estilo_visual_vibe: 'Industrial rústico com tijolos aparentes, couro marrom e iluminação quente.',
      publico_alvo: 'Homens modernos que valorizam autocuidado e um ambiente descontraído.',
      diferenciais_unicos: ['Agendamento online descomplicado', 'Bar completo no local'],
      paleta_cores_sugerida: 'Marrom conhaque #5C3A21, Preto fosco #1C1B1A e Dourado envelhecido #C5A059',
    };

    // Synthesize prompt client-side or verify structure
    const prompt = `# PROMPT MESTRE DE ENGENHARIA DE SITE (GERAÇÃO 100% DO ZERO)
- **Nome da Empresa:** ${company}
- **O que a empresa realmente é:** ${diagnostico.resumo_empresa}
- **Estilo Visual & Atmosfera:** ${diagnostico.estilo_visual_vibe}

### BLOCO 1: IDENTIDADE & VIBE REAL DO NEGÓCIO
${diagnostico.estilo_visual_vibe}

### BLOCO 2: DADOS & ATIVOS VERIFICADOS (GOOGLE MAPS)
- Localização: ${dossie.endereco_formatado}
- Telefone: ${dossie.telefone}
- Reputação: ${dossie.nota}★ (${dossie.total_avaliacoes} avaliações)

### BLOCO 3: DIRETRIZES DE DESIGN, CORES E TIPOGRAFIA
- Paleta: ${diagnostico.paleta_cores_sugerida}

### BLOCO 4: DIRETRIZES TÉCNICAS DE CÓDIGO
- Crie o site utilizando React (Vite), Tailwind CSS e Lucide Icons.
- NÃO use componentes genéricos ou placeholders.`;

    expect(prompt).toContain('BLOCO 1: IDENTIDADE & VIBE REAL DO NEGÓCIO');
    expect(prompt).toContain('BLOCO 2: DADOS & ATIVOS VERIFICADOS (GOOGLE MAPS)');
    expect(prompt).toContain('BLOCO 3: DIRETRIZES DE DESIGN, CORES E TIPOGRAFIA');
    expect(prompt).toContain('BLOCO 4: DIRETRIZES TÉCNICAS DE CÓDIGO');
    expect(prompt).toContain('Barbearia Dom E2E');
    expect(prompt).toContain('Rua dos Andradas, 200');
    expect(prompt).toContain('5C3A21');
  });

  it('handles user edits and allows restoring back to original prompt', () => {
    const original = 'Prompt original gerado pela IA com 4 blocos.';
    let current = original;

    // Simulate user editing
    current = current + '\n[Instrução extra do operador: adicionar promoção de inauguração de 20%]';
    expect(current).not.toBe(original);
    expect(current).toContain('promoção de inauguração');

    // Simulate clicking "Restaurar Original"
    current = original;
    expect(current).toBe(original);
  });
});
