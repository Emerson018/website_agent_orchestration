---
status: accepted
---

# Master Prompt per Tipo de Projeto, tool-agnostic and specification-first

ADR 0010 §3 defined the Master Prompt as one 4-block prompt for a website, built with React and Tailwind, that named the tools and skills to run it with and filled missing facts with generic text and `[inserir aqui]` placeholders. Clients can now ask for a Site, an Agenda or a Dashboard (see GLOSSARY.md, Tipo de Projeto), and the invented fallbacks broke the rule that the public work never shows invented claims. We decided:

1. **One Master Prompt per Tipo de Projeto.** Each one is the shared Briefing do Negócio plus that type's Módulo do Tipo de Projeto. The code builds them, so generating every type costs no AI tokens. The types are built as separate projects and connected later, through the same Design do Cliente, cross links and the same Dados do Negócio file.
2. **No tool or skill names.** The prompt describes the work, e.g. "decide the design system and record it in `DESIGN.md`", and the builder AI or its skills decide colors, type and layout. The stack stays fixed (React, Vite, TypeScript, Tailwind, Motion) so the projects can be connected.
3. **No invented data.** A section without data is left out of the project. Missing facts go to the Pendências do Prompt, which the builder AI raises with the operator.
4. **Specification first.** Every prompt ends as a Prompt de Especificação: the builder AI interviews the operator, writes a specification and splits it into tasks before building.

Supersedes ADR 0010 §3 (Master Prompt Generator). The rest of ADR 0010 still stands.

## Consequences

- `contacts.additional_data.prompts_mestre` holds `{ tipo: { texto, gerado_em } }`. The old single `prompt_mestre` is moved into the Site entry the first time new prompts are written.
- An Agenda and a Dashboard of the same client share one Supabase project and the owner's login. URLs and keys never go into a prompt.
- App mobile was considered and is off for now. It would come back as another module.
