## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` + `docs/adr/` at the repo root). See `docs/agents/domain.md`.

### Skill routing

The primary skills are impeccable (UI design), emilkowalski/skill (motion) and mattpocock/skills (engineering process). Other installed skills answer some of the same requests; use one skill per request, picked by this table. A skill the user names explicitly wins over the table.

| Request | Skill |
| :--- | :--- |
| New UI, redesign, critique, audit (including accessibility) or polish; a design system (`DESIGN.md`) | `impeccable` |
| Build an animation or transition | `animate` |
| Review motion code | `review-animations` |
| Plan motion improvements across the app (no code changes) | `improve-animations` |
| Engineering process: grilling, specs, tickets, TDD, implement, code review, retro | mattpocock/skills |

`.agents/skills/prototype` is the mattpocock/skills `prototype`. Installing or updating `emilkowalski/skill` overwrites that folder and its `skills-lock.json` entry with Emil's skill of the same name; restore both from git afterwards.

