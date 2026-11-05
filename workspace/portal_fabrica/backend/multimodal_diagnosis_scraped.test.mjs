import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMasterPrompt } from './multimodal_diagnosis_service.js';

test('Master Prompt Studio - integra dados raspados via Scrapling', async (t) => {
  const baseDossie = {
    nome_verificado: 'Trattoria del Nonno',
    endereco_formatado: 'Rua Bela Cintra, 890 - Consolação',
    telefone: '(11) 3255-0011',
    nota: 4.8,
    total_avaliacoes: 120,
    nicho_detectado: 'restaurant',
    horarios_funcionamento: ['Ter-Dom: 12h às 23h'],
    elogios_destaque: [
      { text: 'Melhor massa da cidade!', author: 'Clara' },
    ],
  };

  const baseDiagnostico = {
    resumo_empresa: 'Cantina clássica especializada em massas artesanais e vinhos italianos.',
    estilo_visual_vibe: 'Rústico italiano acolhedor com luz âmbar e tijolos aparentes.',
    publico_alvo: 'Famílias e casais que apreciam gastronomia italiana autêntica.',
    diferenciais_unicos: ['Massas frescas feitas diariamente', 'Carta de vinhos selecionados'],
    paleta_cores_sugerida: 'Vinho Tinto #722F37, Dourado Envelhecido #C5A059, Creme #FFF8E7',
  };

  const mockScrapedData = {
    sucesso: true,
    metodo_utilizado: 'stealth_browser',
    cardapio: [
      {
        nome: 'Gnocchi al Tartufo',
        preco: 'R$ 68,00',
        descricao: 'Gnocchi de batata artesanal com fonduta de queijo fontina e azeite trufado',
      },
      {
        nome: 'Cannoli Siciliani',
        preco: 'R$ 24,00',
        descricao: 'Massa crocante recheada com ricota doce de ovelha e pistache',
      },
    ],
    institucional: {
      titulo: 'Trattoria del Nonno - Tradição Desde 1985',
      sobre: 'Uma história familiar nascida no sul da Itália e trazida com amor para São Paulo.',
      servicos: ['Reserva de Mesas', 'Adega Climatizada', 'Menu Degustação'],
    },
  };

  await t.test('Gera prompt mestre contendo catálogo de produtos e preços extraídos', () => {
    const prompt = buildMasterPrompt({
      companyName: 'Trattoria del Nonno',
      dossie: baseDossie,
      diagnostico: baseDiagnostico,
      scrapedData: mockScrapedData,
    });

    assert.ok(prompt.includes('BLOCO DE PRODUTOS & CATÁLOGO OFICIAL (EXTRAÍDO COM SCRAPLING)'));
    assert.ok(prompt.includes('Gnocchi al Tartufo'));
    assert.ok(prompt.includes('R$ 68,00'));
    assert.ok(prompt.includes('Cannoli Siciliani'));
    assert.ok(prompt.includes('História & Posicionamento Oficial do Site'));
    assert.ok(prompt.includes('Uma história familiar nascida no sul da Itália'));
    assert.ok(prompt.includes('Adega Climatizada'));
  });

  await t.test('Funciona sem quebrar quando não há dados raspados (backward compatibility)', () => {
    const promptWithoutScraped = buildMasterPrompt({
      companyName: 'Trattoria del Nonno',
      dossie: baseDossie,
      diagnostico: baseDiagnostico,
      scrapedData: null,
    });

    assert.ok(promptWithoutScraped.includes('BRIEFING MESTRE DO PROJETO & ARQUITETURA DE EXECUÇÃO'));
    assert.ok(!promptWithoutScraped.includes('BLOCO DE PRODUTOS & CATÁLOGO OFICIAL'));
    assert.ok(promptWithoutScraped.includes('Trattoria del Nonno'));
  });
});
