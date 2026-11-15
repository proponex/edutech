# EduTech Design System (DESIGN.md)

**Project:** EduTech Public Platform Redesign  
**Version:** 4.0 (3D Educational Centerpiece & Luxury Violet Art Direction)  
**Target:** Public Web Landing Page, Header, Hero, and Promotional Surfaces  
**Mode:** Persuade & Clarify (High Craft, Photorealistic 3D Composition, Distinctive Typography, Flowing Waves)  

---

## 1. Visual Direction & Aesthetic Philosophy

EduTech's public landing page matches the elite reference composition:

- **Photorealistic 3D Educational Accents:** Real-rendered 3D assets (study books, ultrabooks with study charts, stepping stone journeys, cozy pastel study desks, and 8k luxury fluid wave ribbons).
- **Architectural 11:9 Split-Screen Hero:**
  - Left: Full visual promotional banner with 3D laptop centerpiece, floating stacked books, board certification badges (`CBSE • ICSE • State Boards`), 4.9★ rating chip, and the *Class 12 Comprehensive Prep* progress card.
  - Right: High-contrast white card with top gradient stripe, role switcher pills (`Student`, `Parent`, `Teacher`), email/password inputs, and role-based redirects.
- **Narrative Centerpiece Banner:** *Designed from the Ground Up for Real Academic Mastery* with ambient grid overlay, textbook checklist, and 3D floating laptop with alphabet book.
- **How It Works (Dark Violet Sanctuary):** `#180C2E` rich dark violet canvas with 3D educational stepping stone texture, constellation graphics, and 4 elevated glass cards (`bg-white/95 backdrop-blur-xl`).
- **Student Experiences:** `#F8F6FF` canvas with wave contour patterns, cozy pastel study desk scene, and verified reviews.
- **Features:** Editorial bento grid with topographical lilac pattern, 3D study table scene, and curriculum metrics.
- **Footer:** Luxury dark violet ground (`#130924`) with 8k fluid neon wave texture.

---

## 2. Color Palette & Semantic Tokens

| Token Role | Hex Code | Purpose / Application |
| :--- | :--- | :--- |
| **Ground White** | `#FFFFFF` | Feature cards, login container, primary surfaces |
| **Porcelain Violet** | `#F8F6FF` | Global body background, input background tints |
| **Soft Lavender** | `#EEE8FF` | Badge grounds, secondary containers, progress bar tracks |
| **Border Lavender** | `#DCCFFF` | Primary divider borders, card outlines |
| **Vibrant Violet** | `#8060CE` | Interactive elements, hover states, active badges |
| **Primary Violet** | `#6244A6` | Main brand color, buttons, focal icons |
| **Deep Violet** | `#4C268F` / `#3D1E6D` | Headline accents, button gradients, role tags |
| **Dark Violet Canvas** | `#180C2E` / `#130924` | How-It-Works section, luxury footer ground |
| **Text Dark** | `#1E1035` | Display headlines, body headings, high-contrast readable copy |
| **Text Muted** | `#5F5875` | Subtitles, helper text, input labels, metadata |

---

## 3. Reference 3D Asset Registry (100% True Alpha Transparent PNGs)

All 3D assets have been processed into 32-bit RGBA PNGs (`hasAlpha: true`) with alpha=0 on all background/border pixels, completely eliminating solid rectangular background seams:

| Asset Name | Local Transparent Path | Usage Location |
| :--- | :--- | :--- |
| **3D Stacked Books** | `/images/hero_books_transparent.png` | Hero floating decor, Curriculum Card, How-It-Works |
| **3D Education Laptop Centerpiece** | `/images/hero_laptop_transparent.png` | Hero Left Promotional Banner |
| **3D Floating Laptop with Alphabet Book** | `/images/centerpiece_narrative_transparent.png` | Narrative Centerpiece Banner |
| **Cozy Pastel Study Desk Scene** | `/images/study_desk_transparent.png` | Student Experiences (Reviews) & HD Video Lesson Card |
| **3D Stepping Stones Journey Texture** | Cloud Asset (`AB6AXuDw7EVrhLkDo...`) | How It Works Ambient Background Layer (`mix-blend-screen`) |
| **8k Fluid Waves Luxury Texture** | Cloud Asset (`AB6AXuDuUU5e1L...`) | Luxury Dark Violet Footer with smooth fade mask |

---

## 4. Keyframe Animations & Wave Motion Choreography

- `.animate-wave-flow`: 10s smooth horizontal wave translation (-35px, scaleY 1.08) for foreground wave ribbons.
- `.animate-wave-flow-reverse`: 12s reverse wave translation (+35px, scaleY 0.95) for midground wave ribbons.
- `.animate-wave-flow-slow`: 16s slow wave translation for base background wave dividers.
- `.animate-dash-flow`: 8s linear SVG stroke-dashoffset animation creating continuous flowing motion along constellation pathway vectors.
- `.animate-node-glow`: 3s breathing scale and drop-shadow glow pulse on constellation waypoint nodes.
- `.animate-float-slow`: 7s subtle translation (-14px) and gentle rotation (1.5deg).
- `.animate-float-medium`: 5s translation (-10px).
- `.animate-float-gentle`: 4s translation (-6px).
- `.animate-pulse-soft`: 3s subtle scale & opacity breathing.
- `.animate-glow-pulse`: 4s blur & opacity shift.
- `.glass-card`: `rgba(255, 255, 255, 0.94)` with `backdrop-filter: blur(18px)`.
- `.glass-dark`: `rgba(26, 14, 46, 0.78)` with `backdrop-filter: blur(20px)`.
- `.pattern-topographic`: subtle radial dot grid pattern on lilac ground.
- `.pattern-grid`: 36px linear gradient grid overlay.
- Reduced-motion accessibility override fully implemented via `@media (prefers-reduced-motion: reduce)`.
