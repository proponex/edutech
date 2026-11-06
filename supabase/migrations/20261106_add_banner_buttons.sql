-- Migration: Add button_text and button_link to banners table for dynamic CTA control
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT 'Explore Channels';
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS button_link TEXT DEFAULT '/student?tab=channels';

