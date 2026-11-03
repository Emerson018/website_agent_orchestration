# 03: Decision Gate UI and Dossier Panel in WACRM and Portal Fabrica

**What to build:**
A dedicated visual dossier card and human decision gate embedded directly in the WACRM Contact sidebar and Portal Fábrica project views. Operators can review the extracted Google Places rating, photo carousel, top customer complaints/pains, and suggested sales pitch. The interface presents three explicit action triggers: `[🚀 Iniciar Geração do PWA]`, `[💡 Gerar Pitch Comercial com IA]`, and `[⛔ Desqualificar / Arquivar]`.

**Blocked by:** 02: Google Places Intelligence Engine and Lead Dossier Extraction

**Status:** closed

- [x] Contact details sidebar in WACRM renders the "Dossiê Comercial" card displaying star rating, review summary, and business photos.
- [x] Pain points and praises extracted from customer reviews are highlighted with distinct sentiment badges.
- [x] Three action buttons are available: manual PWA generation trigger, copy-to-clipboard WhatsApp pitch, and lead archive/disqualify.
- [x] Portal Fábrica project view displays the same dossier insights and action controls.
- [x] Frontend unit and component tests verify that buttons trigger correct state transitions and API actions.
