---
name: Premium Editorial Social
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bacac6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#859491'
  outline-variant: '#3c4a47'
  surface-tint: '#3adccc'
  primary: '#66fdec'
  on-primary: '#003732'
  primary-container: '#40e0d0'
  on-primary-container: '#006058'
  inverse-primary: '#006a62'
  secondary: '#ffb3b6'
  on-secondary: '#68001a'
  secondary-container: '#cc003c'
  on-secondary-container: '#ffdcdc'
  tertiary: '#e4e6e8'
  on-tertiary: '#2d3133'
  tertiary-container: '#c8cacc'
  on-tertiary-container: '#525557'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#61f9e9'
  primary-fixed-dim: '#3adccc'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#ffdada'
  secondary-fixed-dim: '#ffb3b6'
  on-secondary-fixed: '#40000c'
  on-secondary-fixed-variant: '#920028'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  container-margin: 24px
  gutter: 16px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

This design system is built upon a **Minimalist Editorial** philosophy. It targets a discerning audience that values curated content over high-velocity feeds. The personality is sophisticated, confident, and structured, evoking the feeling of a digital boutique or a high-end lifestyle magazine.

The aesthetic leverages high contrast between deep backgrounds and crisp typography. It prioritizes clarity through generous whitespace (negative space) and a reduction of decorative elements, allowing user-generated content and typography to take center stage. The style is professional yet vibrant, utilizing sharp geometric precision paired with classic serif elegance.

## Colors

The palette is anchored in a deep, sophisticated dark mode to emphasize the editorial feel. 

- **Primary (Turquoise):** Used for primary actions, progress indicators, and key brand identifiers. It provides a cool, tech-forward energy.
- **Secondary (Rose):** Reserved for high-priority highlights, notifications, and interactive accents that require immediate visual attention.
- **Neutral/Background:** A carefully tiered scale of deep slates and blacks to create perceived depth without losing the high-contrast edge.
- **Surface:** Subtle variations in dark tones are used to differentiate cards and input fields from the background.

## Typography

The typography system relies on a high-contrast pairing between a classic serif and a modern geometric sans-serif.

- **Headlines:** Playfair Display is used for all major headings and display titles. This adds a "literary" weight to the interface. Letter spacing is slightly tightened for larger sizes to maintain impact.
- **UI & Body:** Plus Jakarta Sans provides a friendly yet functional contrast. Its open counters and modern proportions ensure high readability on mobile devices.
- **Labels:** All-caps styling with increased letter spacing is used for navigation, small buttons, and metadata to create a clear visual distinction from body content.

## Layout & Spacing

This design system utilizes a **Fluid Grid** model with strict vertical rhythm. 

- **Grid:** A 12-column grid is used for desktop, transitioning to a 4-column grid for mobile.
- **Margins:** Generous 24px outer margins on mobile create a "frame" around the content, reinforcing the editorial look.
- **Rhythm:** Spacing follows an 8px baseline. Use `stack-lg` (48px) to separate major content sections to prevent the UI from feeling cluttered.
- **Negative Space:** Whitespace is treated as a functional element. High-priority items should be surrounded by ample clearance to denote importance.

## Elevation & Depth

To maintain a premium feel, the design system avoids heavy shadows, instead using **Tonal Layers** and **Subtle Outlines**.

1.  **Level 0 (Base):** The primary background color.
2.  **Level 1 (Cards/Surfaces):** A slightly lighter neutral tone or a 1px low-opacity border (#FFFFFF10) to define boundaries.
3.  **Floating Elements:** Only primary action buttons (FABs) or active modals receive a soft, highly diffused ambient shadow (Blur 20px, 15% opacity) to suggest they exist above the content plane.
4.  **Glassmorphism:** Navigation bars and sticky headers should use a 20px backdrop blur with a 70% opacity fill of the background color to maintain context while scrolling.

## Shapes

The shape language is defined by **Pill-shaped** and highly rounded elements. This softness balances the "seriousness" of the serif typography and the dark color palette.

- **Primary Buttons:** Should always be full-pill (rounded-full).
- **Cards:** Use `rounded-xl` (1.5rem / 24px) to create a modern, approachable container style.
- **Selection Indicators:** Use pill shapes for active states in tabs or segmented controls.
- **Avatars:** Strictly circular to distinguish users from content containers.

## Components

- **Buttons:** Primary buttons use the Turquoise background with dark slate text. Secondary buttons use an outline style with Turquoise borders. Labels are always uppercase `label-lg`.
- **Chips/Tags:** Small pill-shaped containers with a subtle surface background. Use Rose for active or "hot" tags and Turquoise for brand-specific highlights.
- **Input Fields:** Minimalist containers with a 1px border. On focus, the border transitions to Turquoise. Placeholder text uses a muted slate.
- **Cards:** Content cards should have no visible border, utilizing the `Level 1` surface color. Imagery should fill the container to the edges where possible.
- **Navigation Bar:** A bottom-fixed bar with a high-intensity Turquoise floating action button (FAB) in the center. Icons are thin-stroke (2pt) to match the editorial aesthetic.
- **Lists:** Clean rows with 16px vertical padding, separated by subtle 1px dividers that do not span the full width of the screen.