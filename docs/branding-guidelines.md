# FiberScope Brand Guidelines

FiberScope should feel like professional network infrastructure with a sharp public-signal layer on top: precise, technical, calm, and visibly alive. The product is not a consumer wallet and not a marketing site. It is an operator-grade explorer for payment-channel networks, so the brand should make dense data feel legible, trustworthy, and high-signal.

## Brand Position

FiberScope is the visibility layer for Fiber Network.

It helps builders, wallet teams, node operators, and infrastructure reviewers answer practical questions:

- What does the public Fiber graph look like right now?
- Which channels, assets, and nodes are visible?
- Which routes and liquidity paths look ready?
- Which funding outpoints have CKB evidence?
- What changed since the last ingestion?

The brand should communicate three traits:

- **Signal over noise**: every visual element should help the user scan, compare, or trust network state.
- **Live infrastructure**: the UI should feel connected to a changing network, not like a static admin panel.
- **Developer credibility**: numbers, hashes, routes, and evidence should look first-class, not like incidental metadata.

## Visual Theme

The recommended theme is **Dark Graph, Light Data**.

Use a dark, high-contrast navigation and graph language around a clean light workspace. This preserves dashboard readability while giving FiberScope a recognizable identity.

- Sidebar and map surfaces should feel like network radar: deep ink, luminous accents, clear topology.
- Tables and cards should stay light, quiet, and scannable.
- Important states should use saturated accents sparingly.
- Avoid decorative blobs, generic gradients, oversized hero treatments, or crypto-themed visual noise.

The "wow factor" should come from crisp data visualization, strong contrast, elegant motion, and memorable accent treatments around graph/network elements.

## Logo And Wordmark

The primary logo is the **FiberScope** wordmark.

Do not use a separate `FS` badge in the app sidebar. The product name itself should carry the brand.

Recommended wordmark treatment:

- Text: `FiberScope`
- Weight: 800
- Letter spacing: 0
- Case: PascalCase
- Sidebar color: near-white
- Optional accent: make `Fiber` white and `Scope` electric cyan/green only in large brand moments, not in every small instance.

Tagline:

```txt
Network intelligence
```

Use this as the sidebar descriptor and short product subtitle. For longer copy, prefer:

```txt
Fiber Network visibility, routing diagnostics, and liquidity intelligence.
```

## Color System

The palette should move from the current generic blue/green dashboard into a distinct network-infrastructure palette.

### Core Neutrals

| Token       | Use                         | Hex       |
| ----------- | --------------------------- | --------- |
| `--ink-950` | Sidebar, graph dark surface | `#071116` |
| `--ink-900` | Dark panels, map background | `#0b171f` |
| `--ink-800` | Dark hover states           | `#13242f` |
| `--paper`   | Main app background         | `#f6f8fb` |
| `--panel`   | Cards and tables            | `#ffffff` |
| `--line`    | Borders and dividers        | `#d8e1e8` |
| `--text`    | Primary text                | `#14212b` |
| `--muted`   | Secondary text              | `#60717f` |

### Brand Accents

| Token               | Use                                     | Hex       |
| ------------------- | --------------------------------------- | --------- |
| `--fiber-cyan`      | Graph highlights, selected paths, links | `#12b8d7` |
| `--liquidity-green` | Live status, healthy capacity           | `#13a56b` |
| `--route-blue`      | Route confidence, primary data emphasis | `#2368d9` |
| `--asset-violet`    | Multi-asset and UDT distinction         | `#6d5dfc` |
| `--warning-amber`   | Stale, unknown, degraded                | `#c77913` |
| `--risk-red`        | Failed, unreachable, closed             | `#c6372d` |

### Usage Rules

- Cyan is the signature brand color. Use it for network lines, active map controls, selected objects, and primary links.
- Green means live, verified, or healthy. Do not use green for generic decoration.
- Amber means unknown, stale, pending, or needs review.
- Red means failed, closed, unreachable, or broken.
- Violet is reserved for non-CKB asset differentiation and multi-asset views.
- Never let a page become one-color. Every screen should balance neutral surfaces, cyan graph energy, and state-specific accents.

## Typography

Use the current system font stack unless a font package is deliberately added later. The product does not need a decorative typeface.

Recommended hierarchy:

- Page title: 28-32px, weight 760-800
- Section title: 18-21px, weight 720-760
- Metric value: 28-34px, weight 760-820
- Table body: 14px, weight 400-520
- Labels and metadata: 12-13px, uppercase only for table headers
- Hashes and outpoints: monospace, 12-14px

Rules:

- Letter spacing stays `0`.
- Do not scale type with viewport width.
- Avoid oversized headings inside cards.
- Hashes, tx IDs, pubkeys, and outpoints should feel intentional with monospace styling and controlled truncation.

## Layout Principles

FiberScope should feel dense but not cramped.

- Keep a persistent dark sidebar.
- Keep the main workspace light.
- Use cards for individual data surfaces only.
- Do not nest cards inside cards.
- Favor two-level pages: summary metrics first, then actionable data surfaces.
- Put graph/map views in the largest available area.
- Put secondary tables and summaries in rails or adjacent panels.
- Avoid empty grid columns. If a section has no natural pair, make it full-width or place it in a rail with related content.

Recommended page rhythm:

1. Page header with concise title, direct subtitle, and one status badge.
2. Metric row.
3. Primary work surface.
4. Supporting details.

## Components

### Sidebar

The sidebar is a brand anchor.

- Background: deep ink.
- Wordmark: text-only `FiberScope`.
- Descriptor: `Network intelligence`.
- Active nav: cyan-tinted dark surface with a subtle left accent line.
- Hover nav: lighter ink surface.
- Icons: lucide icons, 17-18px.

### Cards

Cards should feel like instrument panels, not marketing tiles.

- Radius: 8px.
- Border: 1px solid neutral line.
- Shadow: subtle, near-flat.
- Padding: 16-20px.
- Titles: compact and clear.
- No decorative icon badges unless they encode state or type.

### Metrics

Metrics are glanceable controls for network state.

- Label above value.
- Value large and dark.
- Detail muted.
- Use colored top border or small status rail for important state, not full-card color washes.

### Tables

Tables are core product surfaces.

- Keep headers uppercase, small, and muted.
- Use monospace for hashes.
- Use status badges for state.
- Use compact row height where possible.
- Avoid horizontal scrolling in small side panels by using compact table variants.

### Network Map

The map should be the signature visual surface.

- Dark graph background.
- Nodes should be clear, not decorative.
- Channels should vary by capacity, selected count, or status.
- Selected routes/channels use cyan.
- Live/verified channels use green.
- Unknown/stale channels use amber.
- Keep controls close to the map but do not crowd the graph.
- The map should feel alive with subtle transitions, not heavy animation.

## Data Visualization

Use visual emphasis to explain network state:

- Capacity: line weight or bar length.
- Reachability: green, amber, red status.
- Asset type: restrained color chips.
- Direction state: arrow or directional row, not paragraphs.
- CKB evidence: `LIVE`, `UNKNOWN`, `SPENT`, `UNPARSEABLE` badges.
- Route confidence: progress bar, segmented score, or concise badge.

Avoid:

- Pie charts unless there are very few categories.
- Decorative charts that do not answer an operator question.
- Repeated explanatory boxes beside every visualization.

## Motion And Interaction

Motion should make the live network feel responsive.

Recommended:

- 120-180ms hover transitions.
- Subtle map node/channel transitions when filters change.
- Selected row and selected map element should visually coordinate.
- Loading states should be skeletal, not spinner-heavy.

Avoid:

- Bouncy animation.
- Slow page transitions.
- Continuous decorative motion outside the map.

## Voice And Copy

FiberScope copy should be direct and operational.

Use:

- `Public graph estimate`
- `CKB evidence`
- `Route readiness`
- `Live funding outpoint`
- `Unknown on-chain status`
- `Stale graph entry`
- `Reachability unprobed`

Avoid:

- Hype language.
- Long education blocks inside the app.
- Crypto slang.
- Feature explanations that repeat what a control already says.

The product can be impressive without sounding promotional.

## Implementation Direction

When applying this guideline to the current app, keep the displayed content and routes intact. The first implementation pass should focus only on visual system consistency:

1. Introduce a richer token set in `apps/web/app/globals.css`.
2. Upgrade the sidebar active/hover treatment and wordmark.
3. Give the network map a stronger dark graph visual identity.
4. Refine cards, metrics, badges, and tables around the new tokens.
5. Add compact visual accents for CKB evidence, route readiness, and live/stale state.
6. Keep layouts and data content unchanged unless a layout has obvious wasted space.

Success criteria:

- The app is recognizable from a screenshot.
- The map feels like the product’s visual signature.
- The dashboard remains readable for judges and developers.
- No current content is removed or hidden.
- The look is consistent across home, nodes, channels, liquidity, diagnostics, docs, and observability.
