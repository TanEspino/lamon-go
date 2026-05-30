---
name: LamonGo Editorial
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#3c4a47'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#6b7a77'
  outline-variant: '#bacac6'
  surface-tint: '#006a62'
  primary: '#006a62'
  on-primary: '#ffffff'
  primary-container: '#40e0d0'
  on-primary-container: '#006058'
  inverse-primary: '#3adccc'
  secondary: '#ba0035'
  on-secondary: '#ffffff'
  secondary-container: '#e21e49'
  on-secondary-container: '#fffbff'
  tertiary: '#815600'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffbe59'
  on-tertiary-container: '#744d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#61f9e9'
  primary-fixed-dim: '#3adccc'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#ffdada'
  secondary-fixed-dim: '#ffb3b6'
  on-secondary-fixed: '#40000c'
  on-secondary-fixed-variant: '#920028'
  tertiary-fixed: '#ffddb1'
  tertiary-fixed-dim: '#fbbb56'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#624000'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style
The brand personality is sophisticated, intellectual, and high-fashion, blending the energy of travel and discovery with the curated feel of a luxury magazine. It targets a modern, discerning audience that values aesthetics as much as utility. 

The design style is **Minimalist Editorial**. It prioritizes heavy whitespace, a disciplined layout, and high-contrast typography. By stripping away unnecessary ornamentation like heavy gradients or skeuomorphism, the UI allows content—photography and text—to serve as the primary visual driver. The emotional response should be one of calm confidence and curated inspiration.

## Colors
This design system utilizes a high-contrast palette anchored in editorial tradition. 

- **Turquoise (#40E0D0)**: Used as the primary action color. It represents energy and modern flair. It should be applied to primary buttons, active states, and critical navigational highlights.
- **Rose (#E11D48)**: A sophisticated secondary accent. Reserved for semantic highlights such as "Favorite" states, curated recommendations, or urgent notifications.
- **Neutral/Base**: The background remains a stark, clean off-white (#FAFAFA) to maintain the "paper" feel of a magazine. Typography and borders use a deep charcoal (#1A1A1A) rather than pure black to preserve readability and a premium feel.

## Typography
Typography is the cornerstone of this design system. It uses a classic serif/sans-serif pairing to establish a clear hierarchy.

**Playfair Display** is used for all large-scale display and headline roles. It provides the "editorial" voice—elegant, transitional, and authoritative. Headlines should often feature tight tracking and generous line heights to create a sense of breathability.

**Inter** provides a functional, systematic counterpoint for body copy and UI labels. It ensures legibility at small sizes. All labels and secondary UI meta-data should use uppercase Inter with slight letter spacing to mimic the look of traditional captions.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop to mimic a magazine spread, centering content with wide outer margins. 

- **Desktop**: A 12-column grid with a 1280px max-width. Margins are intentionally large (64px) to create "breathing room" around the content.
- **Mobile**: A 4-column fluid grid. Margins are reduced to 20px, but vertical spacing between sections remains aggressive (minimum 40px) to prevent the UI from feeling cluttered.
- **Rhythm**: Spacing follows an 8px base unit. Component-internal spacing should be tight, while section-level spacing should be expansive to emphasize the minimalist aesthetic.

## Elevation & Depth
To maintain the flat, editorial feel, this design system avoids traditional box shadows. Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines**.

- **Surfaces**: Most elements sit flush on the background. Higher-priority containers (like modals or cards) are defined by 1px solid borders in a very light neutral (#E5E5E5) rather than shadows.
- **Stacking**: When elements must overlap, use a simple 1px border or a subtle color shift in the background. Do not use blurs or frosted glass effects; keep the surfaces opaque and "physical" like paper.

## Shapes
In line with the minimalist, structured editorial theme, this design system uses **Sharp (0)** corners for all primary UI elements. 

Rectilinear shapes reinforce the grid and provide a more formal, high-end architectural feel. This applies to buttons, input fields, images, and card containers. The only exception is for functional icons, which may contain curves for legibility.

## Components
- **Buttons**: Primary buttons are sharp-edged, solid Turquoise (#40E0D0) with black text for maximum contrast. Secondary buttons are outlined in 1px charcoal with no fill.
- **Cards**: Cards should have no background or shadow; they are defined by a 1px border or simply by the alignment of the typography and image within the grid.
- **Input Fields**: Minimalist 1px bottom-border only, or a full 1px charcoal outline. No rounded corners. Focus state is indicated by a Turquoise border.
- **Chips**: Used for categories, these should be small, uppercase text labels with a light-gray border. When selected, they fill with Turquoise.
- **Lists**: Clean, generous vertical padding (at least 16px) between items. Use 1px horizontal dividers to separate content.
- **Semantic Accents**: The "Favorite" heart icon or "Recommended" badge must always use Rose (#E11D48) to stand out against the Turquoise and Neutral palette.