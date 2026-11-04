# 02: Exibição Neutra do Telefone do Maps (Remoção do Rótulo "Divergente")

**What to build:**
Ajustar a exibição do telefone verificado do Google Maps na UI do WACRM:
1. Em `page.tsx`, `lead-dossier-card.tsx`, `contact-detail-view.tsx` e `contact-sidebar.tsx`, remover o sufixo ou badge com a palavra `(Divergente)` e estilos de alerta/amarelo.
2. Manter o número original de WhatsApp (`contacts.phone`) como telefone principal de contato do lead.
3. Exibir o telefone fixo/comercial verificado do Maps (`dossie.telefone_estabelecimento`) com uma badge/ícone neutro e limpo (ex: `• 📞 Maps: (xx) xxxxx-xxxx`).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Rótulo `(Divergente)` removido de `page.tsx`
- [x] Rótulo `(Divergente)` removido de `lead-dossier-card.tsx`
- [x] Rótulo `(Divergente)` removido de outros componentes auxiliares
- [x] Telefone do Maps exibido de forma neutra e legível
- [x] WhatsApp do lead preservado
