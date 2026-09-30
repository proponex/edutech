'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { BannerItem } from '@/types';

export function HeroCarousel() {
  const supabase = createClient();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Load active banners from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadActiveBanners() {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (isMounted && !error && data) {
          setBanners(data as BannerItem[]);
        }
      } catch {
        // Fallback: stay empty
      }
    }
    loadActiveBanners();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const bannerCount = banners.length;

  const nextSlide = useCallback(() => {
    if (bannerCount <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % bannerCount);
  }, [bannerCount]);

  const prevSlide = useCallback(() => {
    if (bannerCount <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + bannerCount) % bannerCount);
  }, [bannerCount]);

  // Auto-slide every 5 seconds (paused on hover or when banner count <= 1)
  useEffect(() => {
    if (bannerCount <= 1 || isPaused) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [bannerCount, isPaused, nextSlide]);

  // Touch handlers for mobile swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  // STRICT PHASE 2 REQUIREMENT:
  // If zero active banners exist in Supabase, DO NOT show fake banner or empty carousel.
  // Simply hide the banner section completely!
  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <section
      className="relative overflow-hidden pt-6 pb-10 sm:py-12"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-label="Homepage Banners"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-2xl bg-neutral-950 min-h-[440px] sm:min-h-[500px] flex items-center transition-all">
          {/* Banner Images (stacked with smooth opacity transition) */}
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentIndex ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'
              }`}
            >
              <Image
                src={banner.image_url}
                alt={banner.title}
                fill
                priority={index === 0}
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="w-full h-full object-cover opacity-40 dark:opacity-30"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent" />
            </div>
          ))}

          {/* Banner Content */}
          <div className="relative z-10 max-w-2xl px-6 sm:px-12 py-12 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/20 border border-primary-400/30 text-primary-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-primary-400" />
              <span>Featured Program</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight font-display">
              {currentBanner.title}
            </h1>

            {currentBanner.description && (
              <p className="text-base sm:text-lg text-neutral-300 font-normal leading-relaxed">
                {currentBanner.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/signup">
                <Button variant="primary" size="lg" className="flex items-center gap-2">
                  Get Started Today
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/#programs">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-white border-neutral-700 bg-neutral-900/60 hover:bg-neutral-800 backdrop-blur-sm"
                >
                  Explore Curriculum
                </Button>
              </Link>
            </div>
          </div>

          {/* Carousel Arrows (only if more than 1 banner) */}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous Slide"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700 backdrop-blur-md transition-all opacity-80 hover:opacity-100 hover:scale-105 hidden sm:flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next Slide"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700 backdrop-blur-md transition-all opacity-80 hover:opacity-100 hover:scale-105 hidden sm:flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Pagination Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-neutral-950/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-neutral-800">
                {banners.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setCurrentIndex(dotIdx)}
                    aria-label={`Go to slide ${dotIdx + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      dotIdx === currentIndex
                        ? 'w-6 bg-primary-500'
                        : 'w-2 bg-neutral-600 hover:bg-neutral-400'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
