---
status: accepted
---

# Motion Design System and Fluid Interactions for 20barra9

Previously, generated tenant websites in `workspace/` used static CSS and basic hover styles. For `20barranove` (culinary parrilla and craft burger bar), the interface lacked kinetic energy, tactile response, and theatrical presence representing fire and ember dining culture. We decided to establish a declarative **Motion Design System** in `workspace/20barranove/frontend` using `framer-motion`.

## Context and Decision

To give life and polish to the layout without compromising page performance or accessibility:
1. **Engine**: Adopt `framer-motion` for physics-based springs, staggered entrance choreography, viewport scroll reveals, and gesture feedback.
2. **Hero Entrance Choreography**: Implement staggered fade-up entrance for badge, typography, and action triggers, accompanied by an ambient fire-glow pulse on the primary CTA ("Reservar uma Mesa").
3. **Cardápio & Vitrine**: Implement scroll-triggered reveals (`whileInView`) with staggered cards, coupled with rich hover states (subtle zoom, ember border luminance, and elevation).
4. **Mobile Conversion & Microinteractions**: Add tactile tap feedback (`whileTap={{ scale: 0.96 }}`) across all action buttons, an adaptive blur transition on the navbar, and a floating reservation pill on mobile devices once the hero scrolls out of view.

## Consequences

- Cinematic presentation: Visual elements gracefully introduce the restaurant's identity without jarring pops or sudden layout shifts.
- Conversion enhancement: High-intent interactions (booking reservations and browsing cuts) receive prominent, animated feedback.
- Testbed for factory templates: Patterns validated in `20barranove` serve as blueprints for motion-enabled gold templates across all tenant workspaces.
