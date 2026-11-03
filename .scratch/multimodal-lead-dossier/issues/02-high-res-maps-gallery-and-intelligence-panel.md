# 02: High-Resolution Maps Gallery & Rich Business Intelligence Panel

**What to build:**
Upgrade `places_service.js` to preserve up to 10 high-resolution photo URLs (using `maxWidthPx=1200`), weekly operating hours schedule, address coordinates, and price level. On `/contacts/[id]`, construct a comprehensive Business Intelligence Dossier panel featuring an interactive photo gallery/carousel with high-res thumbnails, star rating badge, verified address with Google Maps directions link, full weekly operating hours breakdown (identifying current open/closed status), and customer review quotes (highlighting praise and pain points).

**Blocked by:** 01: Lead Profile Full-Screen Route & Contact Navigation

**Status:** closed

- [x] `places_service.js` captures up to 10 high-resolution photos and detailed weekday operating hours.
- [x] Lead Profile page renders an interactive Google Maps photo gallery / carousel.
- [x] Weekly operating hours matrix is displayed with live "Aberto agora" / "Fechado" status badge.
- [x] Real customer review testimonials are rendered with author, star rating, and highlight quotes.
- [x] Unit and integration tests verify photo URL formatting, hours parsing, and component rendering.
