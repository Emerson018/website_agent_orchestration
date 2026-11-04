# 01: Sincronização de Identidade Verificada, Site Oficial e Tratamento Dual de Telefones

**What to build:** 
Ao enriquecer um lead com a Google Places API, o sistema captura o nome verificado do estabelecimento, o endereço completo, o site oficial e o telefone comercial retornado pelo Maps. O nome da empresa (`contacts.company`) e o site (`contacts.website`) são sincronizados automaticamente no CRM com os dados do Maps, preservando o valor anterior em `additional_data.nome_original_briefing`. O telefone do WhatsApp do lead (`contacts.phone`) é preservado intacto, enquanto o telefone do Maps é armazenado em `dossie.telefone_estabelecimento`. Na interface do CRM (`Lead Profile` e `LeadDossierCard`), ambos os números são exibidos lado a lado; se divergirem, um alerta visual indica o número do lead vs o número do estabelecimento com atalhos individuais de discagem e cópia.

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] `places_service.js` extrai `displayName.text`, `formattedAddress`, `nationalPhoneNumber`/`internationalPhoneNumber` e `websiteUri` via Places API (New) e fallback legada.
- [x] O dossiê armazena `nome_verificado`, `site_oficial`, `telefone_estabelecimento` e `telefone`.
- [x] Endpoint `/api/leads/:id/enrich-dossier` atualiza `contacts.company = place.displayName` e `contacts.website = place.websiteUri` sem sobrescrever `contacts.phone`.
- [x] Se `contacts.company` já possuía valor prévio distinto, armazena em `additional_data.nome_original_briefing`.
- [x] `LeadDossierCard` e a página `/contacts/[id]` exibem o telefone do lead e o telefone do Maps de forma desacoplada com indicador de divergência quando forem diferentes.
- [x] Testes automatizados cobrem a sincronização e a não-sobrescrita do telefone original do WhatsApp.
