# Frontend Style Guidance

## Product Tone

- The frontend should feel like a serious internal business product, not a toy chat shell.
- Favor clear assistant identity, role context, and action clarity.
- Keep space in the UI for future domain-specific workflows, not just a transcript.
- Use MetaMask's current website as the main visual reference for overall art direction: https://metamask.io/

## UI Direction

- Avoid shaping the frontend around terminal metaphors or OpenClaw-native control UI assumptions.
- Prefer product-oriented layouts that can support departments, approvals, reports, and business actions.
- Treat the current chat interface as an MVP transport surface, not the final interaction model.

## MetaMask-Inspired Design System

- The frontend should borrow MetaMask's overall feel: bold, graphic, modern, high-contrast, playful but still product-grade.
- Avoid generic SaaS visuals such as flat white cards, default blue buttons, or purely utilitarian dashboards.
- Use strong section identities with obvious visual shifts between surfaces instead of making the entire app feel like one long plain panel.

## Typography Roles

- Use a rounded geometric sans for body text, controls, labels, navigation, and UI copy. MetaMask currently uses `MMEuclidCircularB` for this role.
- Use a bold display face for hero headlines, key section titles, and major assistant labels. MetaMask currently uses `MMPolyVariable` for this role.
- If the exact fonts are unavailable in the product, choose close alternatives:
  - body/UI: `Manrope`, `Plus Jakarta Sans`, `General Sans`, or `Satoshi`
  - display: `Clash Display`, `Anton`, `Bricolage Grotesque`, or another heavy condensed/graphic display face
- Do not use the same plain font for everything.
- Headings should feel large, graphic, and intentional.
- Body text should stay cleaner, calmer, and easier to scan.

## Typography Usage

- Hero headings should be oversized, stacked, and visually loud.
- Section titles should use the display font and feel like poster copy, not standard dashboard labels.
- Buttons and small controls should use the body/UI font, often in uppercase or short assertive phrasing.
- Use short, high-confidence wording in the main CTA areas.

## Palette Direction

Use MetaMask's current homepage palette as the main reference, not necessarily as exact one-to-one tokens.

- deep plum purple for key headings and premium cards
- warm off-white or soft cream for large resting backgrounds
- near-black for CTAs and high-contrast controls
- saturated orange / burnt orange as an accent color
- deep green / teal for dramatic section breaks
- soft neon-lime or acid green for energetic highlight sections
- pale lavender and powder blue for lighter utility panels
- peach / coral / apricot fields for warm content blocks

Approximate reference colors observed from the site:

- `#3d065f` type of deep purple for major headings
- `#0a0a0a` near-black for primary CTA surfaces
- `#fff7f1` to `#ffffff` for light page backgrounds
- orange-brown accents around `#b44a12` to `#e07a2d`
- dark teal-green around `#083f38`
- light lime-green around `#dfff8f`
- soft lavender around `#d8b4ff`
- pale sky-blue around `#cfe6ff`
- peach / apricot around `#ffa07a`

## Background And Surface Pattern

- Use large color-blocked sections instead of a single repeated page background.
- Alternate between light neutral space and bold saturated sections.
- Favor subtle gradients or soft atmospheric color transitions over flat sterile fills.
- Let some sections feel airy and spacious, then contrast them with dense, high-contrast card zones.
- Use background composition intentionally: soft glow fields, color bands, gradient fog, and geometric shapes are all appropriate.

## Component Pattern

- Cards should feel big, graphic, and self-contained.
- Prefer large rounded rectangles with strong fill colors and high contrast.
- Use oversized feature cards for major assistant actions, not tiny dashboard widgets everywhere.
- Use pill-shaped buttons, especially for main CTAs.
- Primary CTAs should often be near-black with strong contrast, similar to MetaMask's rounded dark action buttons.
- Mix dense feature cards with open whitespace so the interface has rhythm.

## Layout Pattern

- Think in sections, not only in screens full of panels.
- Use bold hero areas, strong visual transitions, and modular feature blocks.
- Allow asymmetry and staggered compositions where useful.
- Avoid making every row perfectly uniform if that reduces personality.
- Preserve clarity, but do not flatten the design into a conventional admin dashboard.

## Illustration And Visual Motifs

- Use abstract geometric forms, bold shapes, soft gradients, and layered surfaces.
- Favor product storytelling visuals over stock-dashboard icon grids.
- Assistant or department identity can be represented through color-coded panels, emblem-like icons, or strong graphic blocks.
- If decorative graphics are added, keep them sharp and intentional rather than soft generic blobs.

## Integration Presentation

- Make gateway state, connection state, streaming state, and agent identity understandable in the UI.
- When possible, present capabilities as business actions and assistant roles rather than raw protocol concepts.

## What To Avoid

- Do not build a plain white-and-gray admin panel with one accent color.
- Do not use only default Tailwind styling without a strong visual opinion.
- Do not style the app like a terminal, IDE, or raw developer console.
- Do not make every assistant view look identical if their roles differ.
