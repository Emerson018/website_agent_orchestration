# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single operator who runs the business. They qualify incoming leads, build each lead's dossier and generate the Master Prompt, mostly on a desktop computer while talking to leads on WhatsApp, and also on their phone between appointments. There is no team and no role split today.

## Product Purpose

The business sells custom websites (sites and PWAs built from scratch, no templates) to local businesses such as restaurants, barbershops, beauty clinics and cafés. Success is a lead becoming a paying client with their site delivered.

This repository is the operator's pipeline from a captured lead to a Master Prompt. The operator runs that prompt in an external frontier AI (Claude, ChatGPT, v0, Gemini) to build the site. The app itself does not build sites (ADR 0011).

## Positioning

Each site is built from verified facts about the real business rather than a template: Google Maps data, the business's own website, the operator's uploaded menus and catalogs, and an AI diagnosis of its photos and reviews. All of it is condensed into one Master Prompt that the operator reviews and controls.

## Operating Context

The ecosystem has three parts:

- **Portal Fábrica form**: the public lead intake (Lead Briefing).
- **WhatsApp CRM**: where the operator works each lead through the Etapas do Lead on the Lead Profile Page, from Lead Briefing to Lead Dossier, Deep Web Scraping, Catálogo Extraído, Multimodal Business Diagnosis and Master Prompt.
- **Scraping service**: deep scraping of the lead's site.

Leads arrive through the form and through WhatsApp. At the Decision Gate the operator either generates the Master Prompt or disqualifies the lead (Desqualificação). Delivered client sites live under `workspace/<cliente>`. GLOSSARY.md is the canonical vocabulary.

## Capabilities and Constraints

- Data sources: Google Places API, Gemini (multimodal diagnosis and catalog extraction), Scrapling, and Supabase as the central database and file storage.
- Everything gathered about a lead lives on the CRM contact (`contacts.additional_data`).
- The CRM is a fork of the open-source wacrm template (shared inbox, contacts, sales pipelines, broadcasts, automations), extended with the lead pipeline.
- Business data is fail-closed: missing API keys or failed lookups are reported to the operator, never filled with invented content.
- Must work on desktop and on a phone browser.

## Evidence on Hand

- Real leads and contacts in the operator's Supabase project.
- Delivered client sites in `workspace/` (20barranove, AppCustomizado, Marcianos, campeiro_fogo, pizzaria_nonna).

There are no testimonials, case studies, metrics or pricing on record. Future work must not invent them.

## Product Principles

1. **Decision first.** Every lead screen answers "where is this lead, what is missing, what is the next step" before showing detail.
2. **Verified over invented.** Business facts come from real sources and say where they came from. When data is missing, say so instead of filling the gap.
3. **The operator decides.** AI gathers and drafts; the operator reviews, edits and chooses, and the final prompt is theirs to control.
4. **One operator, any device.** Flows must be fast for one person juggling WhatsApp conversations, on a desktop or a phone.
