# Manufacturing VSL Image Generation Prompts

Use these as four separate image-generation requests. They are designed for the current `manufacturing-vsl.html` visual system: a calm, editorial manufacturing aesthetic with deep pine green, muted moss, warm sand, and restrained clay-orange details.

## Shared art direction

- No text, words, numbers, logos, UI labels, watermarks, or brand marks inside the images.
- Avoid glossy SaaS illustrations, blue gradients, photorealistic stock-office scenes, and generic robots.
- Keep the focal subject in the centre 60% of the frame so the image can crop safely on mobile.
- Use a refined editorial illustration style: tactile paper grain, precise engineering-line details, restrained depth, and soft natural light.
- Palette: deep pine `#164B43`, near-black green `#10231F`, muted moss `#86A967`, pale lime `#D3EAAB`, warm sand `#E9DFCC`, clay-orange accent `#C56848`, and off-white `#FFFEFA`.

## Recommended sizes

| Placement | Generate at | Display treatment |
| --- | --- | --- |
| Case study 1, 2, and 3 | 1600 x 1600 px, square | `object-fit: cover`; works as a square visual on desktop and crops safely in the stacked mobile layout. |
| IMPACT framework image | 1600 x 1200 px, 4:3 landscape | Place below the left-side framework copy; use `width: 100%` with a 4:3 aspect ratio. |

## Case study 01 - Packaging manufacturing

**File suggestion:** `assets/photos/case-packaging-control.webp`

**Prompt:**

```text
Create a square 1600 x 1600 editorial illustration for a premium manufacturing operations website. Show a plastic packaging production floor from a slightly elevated three-quarter view: one clean blow-moulding line, neatly arranged HDPE bottles moving along a conveyor, resin pellets in a hopper, a restrained quality-check station, and a subtle visual connection between production, stores, and dispatch. The mood is calm control replacing spreadsheet chaos, not a busy factory. Add a few elegant technical overlays made only of fine lines, small dots, and simple geometric status marks - no readable UI, no text, no numbers. Use deep pine green and near-black green as the foundation, muted moss-green machinery details, warm sand background areas, off-white highlights, and one or two small clay-orange warning accents. Tactile paper grain, refined industrial editorial art direction, soft daylight, high contrast but not glossy, generous negative space around the edges. No people as the main focus, no logos, no words, no letters, no watermarks.
```

## Case study 02 - Make-to-order industrial manufacturing

**File suggestion:** `assets/photos/case-industrial-order-visibility.webp`

**Prompt:**

```text
Create a square 1600 x 1600 editorial illustration for a premium manufacturing operations website. Show a custom industrial pump assembly and a compact skid system in a clean fabrication and assembly setting. Make the relationship between a customer order, a missing component, assembly work, testing, and dispatch visually understandable through one continuous fine-line route that moves between the physical objects. Show one small component crate held aside with a subtle clay-orange accent to suggest a material dependency, while the rest of the scene feels orderly and actionable. Use deep pine green, near-black green, muted moss, warm sand, off-white, and very limited clay-orange. Add precise engineering-drawing linework and paper texture, with a composed museum-display quality rather than a realistic stock photograph. No readable screens, no text, no numbers, no logos, no watermarks, no generic people in hard hats.
```

## Case study 03 - Jewellery manufacturing

**File suggestion:** `assets/photos/case-jewellery-traceability.webp`

**Prompt:**

```text
Create a square 1600 x 1600 editorial illustration for a premium manufacturing operations website. Show a calm, elegant jewellery-production still life from above: a gold ring component, a small tray of loose stones, a labelled-but-unreadable job-work parcel, a precision weighing scale, and a half-finished necklace form. Convey material traceability through a thin continuous route line linking the objects and subtle stage markers made of abstract circles and lines, never text. The image should feel like high-value material under control, with craftsmanship and traceability equally present. Use a deep pine green and near-black green background, warm sand work surface, low-saturation gold-metal highlights, muted moss-green details, and a small clay-orange exception mark. Premium editorial product photography translated into tactile illustration, soft directional light, restrained shadows, uncluttered composition. No readable writing, no digits, no currency symbols, no logos, no watermarks, no hands or faces.
```

## How the IMPACT framework works

**File suggestion:** `assets/photos/impact-framework-flow.webp`

**Prompt:**

```text
Create a 1600 x 1200, 4:3 landscape editorial illustration for a premium manufacturing operations website. Show one clear left-to-right transformation on a single manufacturing workbench: scattered order slips, disconnected material bins, and loose process lines on the left gradually resolve into an orderly connected operating flow on the right - material, production, quality check, and dispatch represented as simple physical objects connected by a continuous route line. The sequence should be visually understandable without any writing: discover the problem, map the work, connect the information, make it visible, automate routine handoffs, and establish a reliable rhythm. Use deep pine green, near-black green, muted moss, pale lime, warm sand, off-white, and minimal clay-orange accents. Include subtle engineering-grid linework and tactile paper texture. The composition should leave some calm negative space in the upper-left and lower-left for surrounding web copy. Sophisticated, quiet, human-centred industrial design; no readable text, no letters, no numbers, no logos, no watermarks, no charts with labels.
```

## After generation

Export WebP at quality 80-85. Keep each final file under 350 KB where possible. Preserve the suggested aspect ratio; do not add text in an editor, because the website provides the captions and accessible descriptions.
