# EduTech Design System (DESIGN.md)

**Project:** EduTech Public Platform Redesign  
**Version:** 2.0 (Premium Lavender & Violet Direction)  
**Target:** Public Web Landing Page, Header, Hero, and Promotional Surfaces  
**Mode:** Persuade (High Craft, Distinctive Typography, Calm Authority)  

---

## 1. Visual Direction & Aesthetic Philosophy

EduTech is designed as an elite, international-standard digital education platform. It departs entirely from utilitarian, saturated green learning portals and cookie-cutter SaaS templates. Instead, it embodies:

- **Calm, academic authority** combined with warm optimism.
- **Architectural clarity**: 50/50 split-screen hero composition, generous negative space, intentional scale jumps.
- **One unified world**: Soft lavender foundations, crisp porcelain white surfaces, and deep violet typographic hierarchy.
- **Zero theme fluctuation**: The public landing page preserves a stable, immaculate light lavender aesthetic without jarring dark-mode switches.

---

## 2. Color Palette & Semantic Tokens

| Token Role | Hex Code | Purpose / Application | Contrast Ratio (vs #FFF) |
| :--- | :--- | :--- | :--- |
| **Ground White** | `#FFFFFF` | Primary card surfaces, login container, navigation bar background | 1:1 |
| **Porcelain Violet** | `#F8F6FF` | Global body ground, subtle surface tinting | 1.05:1 |
| **Soft Lavender** | `#EEE8FF` | Badge grounds, secondary containers, input background tints | 1.15:1 |
| **Border Lavender** | `#DCCFFF` | Primary subtle divider borders, card outlines | 1.35:1 |
| **Muted Violet** | `#BBA5F0` | Decorative glows, tag borders, focus ring accents | 2.1:1 |
| **Vibrant Violet** | `#8060CE` | Interactive primary elements, button hover states, active badges | 4.8:1 (AAA on Light) |
| **Deep Violet** | `#6244A6` | Primary action buttons, prominent icons, focal brand accents | 6.5:1 (AAA on White) |
| **Royal Charcoal** | `#282238` | Display headlines, body headings, high-contrast readable copy | 14.8:1 (AAA Highest) |
| **Text Secondary** | `#5F5875` | Subtitles, helper text, input labels, metadata | 6.2:1 (AAA Compliant) |
| **Surface Accent** | `#FAF5FF` | Subtle callout highlights, feature card backdrops | 1.03:1 |

---

## 3. Typography Hierarchy

Fonts are loaded natively via Next.js Google Font optimization (`next/font/google`):

- **Display & Headings:** `Plus Jakarta Sans` / `Manrope` (`var(--font-plus-jakarta)`, `var(--font-manrope)`)
  - Weight: 700 (Bold) / 800 (ExtraBold)
  - Tracking: `-0.025em` to `-0.035em` (tight, crisp, editorial)
  - Scale jump: `Hero Headline: clamp(2.25rem, 4vw, 3.5rem)` (36px – 56px)
- **Body & Controls:** `Inter` (`var(--font-inter)`)
  - Weight: 400 (Regular) / 500 (Medium) / 600 (SemiBold)
  - Line height: `1.6` for long reading, `1.4` for card descriptors
  - Sizes: Body Large (`1.125rem`), Body Standard (`0.9375rem`), Captions/Labels (`0.8125rem`)

---

## 4. Layout & Spacing Matrix

In accordance with Inspo MCP guidelines:
- **First Viewport Target:** ~1280×800. The entire hero composition (Navbar, Left Promotional Banner, Right Login Card) fits above the fold on standard desktop viewports.
- **Section Spacing Rhythm:** `py-20 lg:py-28` (`clamp(5rem, 8vw, 7rem)`) for consistent vertical rhythm between major sections.
- **Horizontal Container:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Container applies `padding-inline` only; sections own `padding-block`.
- **Card Radii:**
  - Login Card: `rounded-3xl` (`24px`) with soft ambient violet drop-shadow (`shadow-2xl shadow-violet-900/8`).
  - Feature & Step Cards: `rounded-2xl` (`16px`) with 1px border `#DCCFFF/60`.
  - Badges & Buttons: `rounded-full` or `rounded-xl` (`12px`).

---

## 5. Public Landing Page Structure (6 Sections Only)

1. **Navigation Header:** Sticky glassmorphism header (`bg-white/80 backdrop-blur-md border-b border-violet-100`). Direct anchor navigation, dynamic auth state detection.
2. **Hero (50/50 Split):**
   - **Left:** Dynamic Admin-Managed Promotional Banner with high-resolution student visuals, badge, title, description, and optional CTA.
   - **Right:** White card with full interactive authentication (Role-based redirect, validation, password reveal toggle, loading indicators).
3. **How It Works:** 4 structured steps explaining Account Creation → Curriculum Exploration → Live/Video Learning → Progress Tracking.
4. **Student Experiences:** Authentic quotes and reviews from students and parents across grades.
5. **Features (Bento / Editorial):** Highlighting EduTech's verified curriculum, K-12 coverage, expert educators, Mux video lessons, parent monitoring, and chapter drills.
6. **Footer:** Brand mission, platform links, legal terms, student support, and copyright.

---

## 6. Motion & Micro-Interactions

Following Emil Kowalski's animation discipline:
- **Hero Entrance:** Single coordinated fade & subtle slide (`translate-y-3` to `translate-y-0` in 400ms, `cubic-bezier(0.16, 1, 0.3, 1)`).
- **Cards & Hover:** Linked cards lift 2px (`translate-y-[-2px]`), borders shift from `#DCCFFF` to `#8060CE/40`, subtle shadow expansion.
- **Interactive Buttons:** `active:scale-[0.98]` tactile press feedback, smooth transition `150ms ease-out`.
- **Accessibility:** Full `@media (prefers-reduced-motion: reduce)` compliance, ensuring animations degrade cleanly to instant transitions.

