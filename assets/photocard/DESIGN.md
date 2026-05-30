---
name: Lamon Go Editorial
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3e4947'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6e7977'
  outline-variant: '#bec9c6'
  surface-tint: '#016a62'
  primary: '#00504a'
  on-primary: '#ffffff'
  primary-container: '#006a62'
  on-primary-container: '#95e7dc'
  inverse-primary: '#84d5cb'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfdf'
  on-secondary-container: '#636262'
  tertiary: '#3f474f'
  on-tertiary: '#ffffff'
  tertiary-container: '#575f67'
  on-tertiary-container: '#d1d9e2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a0f1e7'
  primary-fixed-dim: '#84d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1c1b1c'
  on-secondary-fixed-variant: '#474647'
  tertiary-fixed: '#dbe3ed'
  tertiary-fixed-dim: '#bfc7d1'
  on-tertiary-fixed: '#151c23'
  on-tertiary-fixed-variant: '#40484f'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  accent-turquoise: '#40e0d0'
  editorial-red: '#ba1a1a'
  surface-stroke: '#bacac6'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  body-lg:
    fontFamily: Source Sans Three
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Source Sans Three
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
  button:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 80px
  gutter: 24px
  container-max: 1120px
---

## Brand & Style
The brand personality is a sophisticated blend of **Editorial Minimalism** and **Culinary Chic**. It targets a high-end audience of food enthusiasts and curators who value aesthetic plating as much as the meal itself. The UI should evoke a sense of a high-fashion digital magazine—pristine, organized, and quietly luxurious.

The design style utilizes a "Neo-Editorial" approach: 
- **Sharp Typography:** High-contrast serif headlines paired with technical sans-serif labels.
- **Minimalist Structure:** Heavy use of whitespace and "ghost" containers that rely on fine lines (hairline borders) rather than shadows.
- **Micro-Accents:** Small, high-energy pops of turquoise and coral-red to break the monochromatic base.

## Colors
The palette is rooted in a **Light Fidelity** scheme. The background uses a crisp, slightly cool off-white (`#f8f9fa`) to provide a gallery-like backdrop for food photography. 

- **Primary & Accents:** A deep teal-green acts as the anchor, while a vibrant Turquoise (`#40e0d0`) is used for active states and prominent action buttons. 
- **Semantic Accents:** A sophisticated "Editorial Red" is reserved for quantitative data (like follower counts) to draw the eye without feeling like an "error" state.
- **Neutral System:** Grays are tiered carefully—using low-contrast strokes for container definitions to maintain the airy, open feel.

## Typography
The typographic system is a study in contrast. **Playfair Display** provides the editorial "voice," used for headlines and branding with tight tracking in larger sizes. 

**Source Sans Three** is used for all long-form reading and body copy, ensuring high legibility against the minimalist UI. 

**Hanken Grotesk** is the functional workhorse, used exclusively in uppercase for labels, buttons, and navigation. This triple-font approach ensures that data (Hanken), content (Source), and brand (Playfair) are immediately distinguishable.

## Layout & Spacing
The system follows a **Fixed-Width Content Grid** within a fluid viewport. The central content is constrained to a `1120px` max-width to ensure readability on desktop.

- **Horizontal Rhythm:** A 24px gutter is maintained as the primary safe zone for mobile and tablet margins.
- **Vertical Rhythm:** Large gaps (40px–80px) are used between major sections to emphasize the editorial feel and prevent the UI from feeling "app-like" and cluttered.
- **Gallery Grid:** A responsive masonry or square-grid approach (1 column mobile, 3 columns desktop) with 16px (md) gaps between items.

## Elevation & Depth
Depth is communicated through **Low-contrast Outlines** and **Tonal Layering** rather than traditional shadows.

1.  **Level 0 (Base):** The `surface` color (`#f8f9fa`).
2.  **Level 1 (Structural Containers):** Defined by 1px solid strokes using `outline-variant` or `primary-container/50`. No shadows.
3.  **Level 2 (Interactive Overlays):** Navigation bars use a high-opacity backdrop blur (`backdrop-blur-xl`) with a 70% transparent background to create a "glass" effect that suggests the content continues beneath.
4.  **Level 3 (Interactive Elements):** Buttons and cards utilize subtle scaling (`scale-95`) on active press to provide tactile feedback without visual lift.

## Shapes
The design adopts a **Strict Geometric** language. 
- **Sharp Corners:** Most interactive elements, including filter pills and primary buttons, use a 0px radius to maintain the architectural, editorial look.
- **The "Circle Exception":** User avatars and specific circular icon-buttons are the only rounded elements allowed, used specifically to soften human-centric data points.
- **Grid-Aligned Images:** All photography is housed in strict aspect-ratio containers (usually 1:1) with zero rounding.

## Components
### Buttons & Pills
Buttons are rectangular with 1px borders. The "Primary" state uses a filled `primary-container` background with `on-primary-container` text. Filter pills utilize the same sharp-edged geometry, switching between a filled state and an outlined `surface` state.

### Input Fields
Inputs are minimalist, defined by a single bottom border or a low-contrast container background (`surface-container-low`). Icons are placed with generous padding (16px) to maintain the "airy" aesthetic.

### Cards & Vault Items
The "Vault" or "Gallery" items are borderless with a 1px internal divider. They feature a hover-state overlay using a subtle gradient (`black/60` to transparent) to reveal metadata.

### Bottom Navigation
A fixed-bottom bar with a high `backdrop-blur`. The central action (Add) is treated as a floating-but-integrated square block with a turquoise background, breaking the horizontal line of the nav bar for prominence.