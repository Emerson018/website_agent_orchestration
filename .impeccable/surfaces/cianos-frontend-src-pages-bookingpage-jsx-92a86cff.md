---
version: 1
slug: "cianos-frontend-src-pages-bookingpage-jsx-92a86cff"
primary_target: "workspace/Marcianos/frontend/src/pages/BookingPage.jsx"
related_targets: ["workspace/Marcianos/frontend/src/components/reserva/ReservaWidget.jsx","workspace/Marcianos/frontend/src/components/reserva/BoardingPass.jsx"]
---

# Marcianos booking page

Mode: Operate (a guest reserves a table in under a minute). Public page, embeddable later in the restaurant's landing page: no photos, prices or sales copy. Reservations confirm instantly; groups of 6+ become a pre-reservation the owner confirms. Capacity per slot counts reservations (tables), not people. The logo will change, so nothing in the look depends on it. The user asked for a layout that uses the whole browser (not a phone column) and a soft palette.

## Direction contract
THESIS: the evening is the schedule. Time slots carry the colours of a Guaíba dusk, peach at 18:30 to lilac at 22:00, so picking a time is picking a moment of the night; refuses the white form with blue buttons and a phone-width column.
OWN-WORLD: pale dusk ground (cool lilac-grey, never cream), white surfaces with soft lilac-grey hairlines, deep plum-ink text, muted violet as the one action colour; the sky band is the only place colour fills a surface. System UI sans throughout, rank by weight; rounded 14px keys; no shadows except the lifted selected slot.
STORY: the guest sees "Reserve sua mesa", sets people and day across the full width, reads the evening as a band of colour, picks a moment, leaves name and WhatsApp, confirms, and gets a confirmation card in the same dusk.
FIRST VIEWPORT: one wide column (up to 1120px) on the dusk ground: title and one line; people keys and the week's days as full-width rows; the times as one continuous sky band of equal cells; name and WhatsApp side by side; the violet confirm button. Phones: same order, band wraps to 4 columns, a sticky summary bar keeps the confirm action in reach.
FORM: the model's top-ranked grounded candidate (IMPECCABLE’S PICK), chosen by the user over the roll; seed:5b98d83678704d89
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
