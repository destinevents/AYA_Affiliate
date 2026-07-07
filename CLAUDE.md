# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-file static HTML prototype for the **AYA (AsYouAreBaguio) Affiliate Program** — a clickable, in-browser mockup used for intern feedback and design validation before real development begins. No backend, no build step, no dependencies.

**Deployed to Vercel** from the `main` branch of `https://github.com/destinevents/AYA_Affiliate`. Every push to `main` auto-deploys.

## Running Locally

Open `index.html` directly in any browser — no server required.

## Architecture

Everything lives in a single `index.html` file with three sections:

1. **CSS** (`<style>`) — design tokens as CSS custom properties (`--pine`, `--gold`, `--fog`, etc.), component styles, responsive breakpoints
2. **HTML** — four `<section class="view">` panels (only one visible at a time via `.active`), a sticky nav, and a toast element
3. **JavaScript** (`<script>`) — all state and rendering logic

### In-Memory Data

All data is plain JS arrays at the top of the `<script>` block — no API calls, no localStorage:

- `MEMBERS` — AYA community members who can become affiliates
- `AFFILIATES` — members enrolled in the affiliate program (references `MEMBERS` by `memberId`)
- `CAMPAIGNS` — named marketing pushes codes can be attached to
- `CONVERSIONS` — each referral sale event (references `AFFILIATES` by `affiliateId`)

State mutates directly (e.g. `a.status = 'paused'`, `aff.lifetimeEarned += commission`) and re-renders trigger `renderAll()` or individual `render*()` calls.

### Four Views

| Tab | View ID | Render Function | Purpose |
|---|---|---|---|
| Affiliates | `view-affiliates` | `renderAffiliates()` | Member list, pause/reactivate |
| Campaigns | `view-campaigns` | `renderCampaigns()` | Campaign performance table |
| Generate Code | `view-generate` | `renderGenerateForm()` | New affiliate + code creation form |
| Commissions | `view-conversions` | `renderConversions()` | Conversion tracking, Mark Paid |

### Intended Real DB Schema (embedded as `schema-note` hints in the HTML)

The prototype documents the planned production tables:
- `affiliates` — links to `attendees.id`
- `affiliate_campaigns` — codes link via `promo_codes.campaign_id`
- `promo_codes` — existing production table, extended with `affiliate_id` + `campaign_id`
- `referral_conversions` — sale amount × commission rate, payout status

### Design System

Fonts loaded from Google Fonts: `Fraunces` (serif display), `DM Sans` (body), `DM Mono` (monospace labels/codes).

Key CSS variables: `--pine` (dark green), `--gold` (accent), `--fog` (light background), `--terra` (rust/error), `--moss` (success green), `--muted` (secondary text).

## Context

- **Prepared by:** Jenn Castro (`jenncastro@destinevents.biz`) — Disenyo Digitals Collective
- **Organization:** Destine Events / AYA (AsYouAreBaguio) / Disenyo Digitals
- This is a prototype for intern UX feedback — not production code
