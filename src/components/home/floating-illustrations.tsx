'use client';

import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM EDUCATIONAL SVG ILLUSTRATIONS
// Designed with the cohesive White, Lavender (#EEE8FF, #F8F6FF),
// Soft Violet (#BBA5F0, #8060CE), and Deep Violet (#6244A6, #282238) palette.
// All elements have aria-hidden="true" and pointer-events-none for accessibility.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Floating Laptop
 * Modern sleek ultrabook with screen displaying learning graph / code lines
 */
export function FloatingLaptop({
  className = '',
  size = 58,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      {/* Soft ambient shadow */}
      <ellipse cx="32" cy="54" rx="24" ry="4" fill="#282238" fillOpacity="0.08" />
      {/* Laptop Screen Bezel */}
      <rect x="12" y="10" width="40" height="28" rx="3.5" fill="#282238" />
      {/* Inner Screen Display (Lavender Glow) */}
      <rect x="14" y="12" width="36" height="24" rx="2" fill="#F8F6FF" />
      {/* Screen Header Bar */}
      <rect x="14" y="12" width="36" height="4" fill="#EEE8FF" />
      <circle cx="17" cy="14" r="1" fill="#8060CE" />
      <circle cx="20" cy="14" r="1" fill="#BBA5F0" />
      {/* Screen Graphic: Video/Learning Chart & Text Lines */}
      <rect x="17" y="19" width="14" height="12" rx="1.5" fill="#EEE8FF" />
      <path d="M22 23 L26 25 L22 27 Z" fill="#6244A6" />
      {/* Chart bars on right of screen */}
      <rect x="34" y="27" width="2" height="4" rx="1" fill="#BBA5F0" />
      <rect x="38" y="23" width="2" height="8" rx="1" fill="#8060CE" />
      <rect x="42" y="20" width="2" height="11" rx="1" fill="#6244A6" />
      <line x1="33" y1="32" x2="45" y2="32" stroke="#DCCFFF" strokeWidth="1" strokeLinecap="round" />
      {/* Laptop Base (Hinge & Keyboard) */}
      <path d="M6 40 L58 40 L54 46 C53.5 47 52 47 51 47 L13 47 C12 47 10.5 47 10 46 Z" fill="#6244A6" />
      {/* Keyboard trackpad indent */}
      <rect x="27" y="42" width="10" height="3" rx="1" fill="#8060CE" />
      {/* Front edge highlight */}
      <path d="M8 44.5 L56 44.5 L54 46 C53.5 46.5 52 46.8 51 46.8 L13 46.8 C12 46.8 10.5 46.5 10 46 Z" fill="#4F3589" />
    </svg>
  );
}

/**
 * 2. Floating Book
 * Multi-layered textbook with ribbon bookmark and page depth
 */
export function FloatingBook({
  className = '',
  size = 54,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <ellipse cx="28" cy="48" rx="20" ry="3.5" fill="#282238" fillOpacity="0.08" />
      {/* Book Cover Base */}
      <rect x="13" y="10" width="30" height="36" rx="3.5" fill="#6244A6" />
      {/* Spine Highlight */}
      <rect x="13" y="10" width="5.5" height="36" rx="2" fill="#4F3589" />
      <line x1="15.5" y1="14" x2="15.5" y2="42" stroke="#BBA5F0" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {/* Inner Pages Block */}
      <rect x="17" y="11" width="25" height="34" rx="2" fill="#FFFFFF" />
      {/* Page edge tint */}
      <rect x="40" y="12" width="2" height="32" fill="#EEE8FF" />
      {/* Text Lines */}
      <rect x="20" y="16" width="14" height="2" rx="1" fill="#DCCFFF" />
      <rect x="20" y="21" width="18" height="2" rx="1" fill="#EEE8FF" />
      <rect x="20" y="26" width="16" height="2" rx="1" fill="#EEE8FF" />
      <rect x="20" y="31" width="12" height="2" rx="1" fill="#EEE8FF" />
      {/* Bookmark Ribbon hanging down */}
      <path d="M33 10 L33 24 L29.5 20.5 L26 24 L26 10 Z" fill="#8060CE" />
    </svg>
  );
}

/**
 * 3. Floating Graduation Cap
 * Academic mortarboard with golden/violet tassel and 3D bevel
 */
export function FloatingGraduationCap({
  className = '',
  size = 58,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <ellipse cx="30" cy="50" rx="22" ry="4" fill="#282238" fillOpacity="0.08" />
      {/* Cap Skull Base */}
      <path d="M21 28 C21 28 21 39 30 39 C39 39 39 28 39 28 Z" fill="#282238" />
      <path d="M22 29 C22 29 22 38 30 38 C38 38 38 29 38 29 Z" fill="#4F3589" />
      {/* Mortarboard Diamond Top */}
      <path d="M30 14 L52 24 L30 34 L8 24 Z" fill="#6244A6" />
      {/* Bevel highlights for depth */}
      <path d="M30 14 L52 24 L30 27 L8 24 Z" fill="#8060CE" fillOpacity="0.7" />
      <circle cx="30" cy="24" r="2.5" fill="#EEE8FF" />
      {/* Tassel cord */}
      <path d="M30 24 C36 24 46 27 47 34" stroke="#BBA5F0" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* Tassel brush */}
      <path d="M45.5 34 L48.5 34 L49.5 42 L44.5 42 Z" fill="#8060CE" />
      <circle cx="47" cy="34" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * 4. Floating Pencil & Ruler
 * Architectural pencil with eraser ferrule and ruler
 */
export function FloatingPencil({
  className = '',
  size = 50,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <g transform="rotate(-30 26 26)">
        {/* Eraser */}
        <rect x="23" y="6" width="7" height="6" rx="2" fill="#BBA5F0" />
        {/* Ferrule (Metal Ring) */}
        <rect x="23" y="11" width="7" height="3" fill="#EEE8FF" />
        <line x1="23" y1="12.5" x2="30" y2="12.5" stroke="#DCCFFF" strokeWidth="0.8" />
        {/* Pencil Wooden Body */}
        <rect x="23" y="14" width="7" height="24" fill="#8060CE" />
        <rect x="25.5" y="14" width="2" height="24" fill="#6244A6" />
        {/* Sharpened Wood Cone */}
        <path d="M23 38 L30 38 L26.5 45 Z" fill="#EEE8FF" />
        {/* Graphite Tip */}
        <path d="M25 42 L28 42 L26.5 45 Z" fill="#282238" />
      </g>
    </svg>
  );
}

/**
 * 5. Floating Spiral Notebook
 * Wirebound student notebook with rule lines and bookmarks
 */
export function FloatingNotebook({
  className = '',
  size = 52,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 54 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <ellipse cx="27" cy="47" rx="19" ry="3.5" fill="#282238" fillOpacity="0.08" />
      {/* Notebook Base Cover */}
      <rect x="11" y="9" width="32" height="37" rx="3.5" fill="#8060CE" />
      {/* White Paper Block */}
      <rect x="15" y="10" width="27" height="35" rx="2" fill="#FFFFFF" />
      {/* Ruled lines */}
      <line x1="19" y1="17" x2="38" y2="17" stroke="#EEE8FF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="22" x2="35" y2="22" stroke="#EEE8FF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="27" x2="37" y2="27" stroke="#EEE8FF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="32" x2="31" y2="32" stroke="#EEE8FF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="37" x2="36" y2="37" stroke="#EEE8FF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Left spiral rings */}
      {[13, 18, 23, 28, 33, 38].map((y) => (
        <g key={y}>
          <circle cx="13" cy={y} r="2.2" fill="#DCCFFF" />
          <circle cx="13" cy={y} r="1.3" fill="#282238" fillOpacity="0.15" />
          <path d={`M12 ${y - 1} C14 ${y - 1} 16 ${y + 0.5} 15.5 ${y + 1}`} stroke="#6244A6" strokeWidth="1.2" fill="none" />
        </g>
      ))}
    </svg>
  );
}

/**
 * 6. Floating Stars & Sparkles
 */
export function FloatingStars({
  className = '',
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <path
        d="M18 4 L20.5 13 L30 13 L22.5 18.5 L25 27 L18 22 L11 27 L13.5 18.5 L6 13 L15.5 13 Z"
        fill="#BBA5F0"
      />
      <circle cx="7" cy="7" r="2" fill="#8060CE" opacity="0.6" />
      <circle cx="29" cy="27" r="1.8" fill="#6244A6" opacity="0.5" />
      <path d="M28 6 L29 9 L32 9 L29.5 11 L30.5 14 L28 12 L25.5 14 L26.5 11 L24 9 L27 9 Z" fill="#8060CE" opacity="0.4" />
    </svg>
  );
}

/**
 * 7. Floating Atom / Science Motif
 */
export function FloatingAtom({
  className = '',
  size = 48,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <circle cx="24" cy="24" r="4.5" fill="#6244A6" />
      <ellipse cx="24" cy="24" rx="15" ry="6" stroke="#BBA5F0" strokeWidth="1.6" fill="none" />
      <ellipse cx="24" cy="24" rx="15" ry="6" stroke="#BBA5F0" strokeWidth="1.6" fill="none" transform="rotate(60 24 24)" />
      <ellipse cx="24" cy="24" rx="15" ry="6" stroke="#BBA5F0" strokeWidth="1.6" fill="none" transform="rotate(120 24 24)" />
      <circle cx="39" cy="24" r="2.5" fill="#8060CE" />
      <circle cx="10" cy="16" r="2.5" fill="#8060CE" />
      <circle cx="10" cy="32" r="2.5" fill="#8060CE" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOWING LAVENDER & WHITE WAVE DIVIDERS (Pure SVG Layered Waves)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multi-layered organic flowing wave transition from Lavender to White
 */
export function FlowingWaveTransition({
  direction = 'down', // 'down' (lavender to white) or 'up' (white to lavender)
  className = '',
}: {
  direction?: 'down' | 'up';
  className?: string;
}) {
  const isUp = direction === 'up';

  return (
    <div
      className={`w-full overflow-hidden leading-none pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className={`w-full h-14 sm:h-20 lg:h-24 ${isUp ? 'rotate-180' : ''}`}
      >
        {/* Layer 1: Deep Soft Lavender Wave (slow ambient sway) */}
        <path
          d="M0,32 C320,70 640,-10 960,42 C1200,75 1360,20 1440,32 L1440,96 L0,96 Z"
          fill="#EEE8FF"
          fillOpacity="0.6"
        />
        {/* Layer 2: Muted Violet Accent Wave */}
        <path
          d="M0,48 C240,15 520,75 800,38 C1080,8 1280,60 1440,48 L1440,96 L0,96 Z"
          fill="#DCCFFF"
          fillOpacity="0.4"
        />
        {/* Layer 3: Solid Foreground Wave */}
        <path
          d="M0,60 C360,20 720,80 1080,40 C1260,20 1380,50 1440,55 L1440,96 L0,96 Z"
          fill={isUp ? '#F8F6FF' : '#FFFFFF'}
        />
      </svg>
    </div>
  );
}

/**
 * Hero Decorative Wave Backdrop — for inside cards or section headers
 */
export function HeroCardWaveBackdrop() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <svg
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full opacity-35"
      >
        <path
          d="M-50,200 C150,120 280,320 500,220 C720,120 820,280 900,240 L900,650 L-50,650 Z"
          fill="url(#wave-gradient-1)"
        />
        <path
          d="M-50,300 C200,220 350,420 580,320 C750,250 820,380 900,350 L900,650 L-50,650 Z"
          fill="url(#wave-gradient-2)"
        />
        <defs>
          <linearGradient id="wave-gradient-1" x1="0" y1="0" x2="800" y2="600" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EEE8FF" />
            <stop offset="1" stopColor="#BBA5F0" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="wave-gradient-2" x1="800" y1="0" x2="0" y2="600" gradientUnits="userSpaceOnUse">
            <stop stopColor="#DCCFFF" stopOpacity="0.8" />
            <stop offset="1" stopColor="#8060CE" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITE FLOATING ILLUSTRATION LAYERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hero Floating Layer: Laptops, Books, Pens, Caps, Stars
 */
export function HeroFloatingIllustrations() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Top Left: Floating Open Book */}
      <FloatingBook
        size={58}
        className="absolute top-2 left-6 sm:left-12 opacity-40 animate-float-slow hover:opacity-75 transition-opacity"
      />
      {/* Top Center-Right: Sleek Laptop */}
      <FloatingLaptop
        size={60}
        className="absolute top-4 right-1/3 opacity-30 animate-float-medium"
      />
      {/* Far Right: Graduation Cap */}
      <FloatingGraduationCap
        size={66}
        className="absolute top-8 right-6 sm:right-10 opacity-35 animate-float-medium"
      />
      {/* Bottom Left: Architectural Pencil */}
      <FloatingPencil
        size={46}
        className="absolute bottom-20 left-4 sm:left-10 opacity-35 animate-float-fast"
      />
      {/* Center-Left Background: Spiral Notebook */}
      <FloatingNotebook
        size={50}
        className="absolute top-1/2 left-2 opacity-25 animate-float-slow hidden md:block"
      />
      {/* Right Mid: Sparkle Stars */}
      <FloatingStars
        size={34}
        className="absolute top-2/3 right-8 opacity-40 animate-float-slow"
      />
      {/* Bottom Right: Atom */}
      <FloatingAtom
        size={46}
        className="absolute bottom-8 right-1/4 opacity-25 animate-float-medium hidden sm:block"
      />
    </div>
  );
}

/**
 * How-It-Works Floating Layer
 */
export function HowItWorksFloatingIllustrations() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      <FloatingLaptop
        size={52}
        className="absolute top-10 left-6 opacity-25 animate-float-slow hidden md:block"
      />
      <FloatingNotebook
        size={48}
        className="absolute top-8 right-10 opacity-25 animate-float-medium"
      />
      <FloatingPencil
        size={42}
        className="absolute bottom-12 left-10 opacity-25 animate-float-fast"
      />
      <FloatingGraduationCap
        size={54}
        className="absolute bottom-10 right-8 opacity-25 animate-float-slow"
      />
    </div>
  );
}
