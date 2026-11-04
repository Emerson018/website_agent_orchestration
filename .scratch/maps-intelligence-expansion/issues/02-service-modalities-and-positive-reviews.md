# 02: Extração de Modalidades de Atendimento (Entrega vs Local) e 4 Primeiras Avaliações Positivas

**What to build:**
O sistema extrai da Google Places API as opções de atendimento do estabelecimento (`delivery`, `dineIn`, `takeout`, `curbsidePickup`) e as avaliações com melhor reputação. No dossiê do lead, são estruturados os booleanos `permite_entrega`, `permite_consumo_local`, `permite_retirada` e o resumo consolidado `modalidade` ("entrega_e_local", "somente_entrega", "somente_local", "nao_informado"), além de isolar as 4 primeiras avaliações positivas (`rating >= 4`). Na interface do CRM, badges de modalidade e um bloco com as 4 avaliações positivas (autor, nota e texto) são exibidos para contextualizar o operador no Decision Gate.

**Blocked by:** 01: Sincronização de Identidade Verificada, Site Oficial e Tratamento Dual de Telefones

**Status:** completed

- [x] Fieldmask do `places_service.js` inclui `places.delivery`, `places.dineIn`, `places.takeout`, `places.curbsidePickup` e `places.reviews`.
- [x] Dossiê consolida o objeto `modalidades_atendimento` com booleanos `permite_entrega`, `permite_consumo_local`, `permite_retirada` e status `modalidade`.
- [x] Avaliações são filtradas para extrair até 4 depoimentos positivos com nota $\ge 4$ estrelas no array `dossie.avaliacoes_positivas`.
- [x] `LeadDossierCard` e a página `/contacts/[id]` renderizam badges visuais de atendimento ("Entrega", "Consumo no Local", "Retirada").
- [x] Interface exibe as 4 avaliações positivas de destaque com estrelas e autor.
- [x] Testes unitários/integração validam o parsing das modalidades e a filtragem das avaliações positivas.
