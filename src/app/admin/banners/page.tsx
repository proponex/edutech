import React from 'react';
import { BannerManager } from '@/components/admin/BannerManager';

export const metadata = {
  title: 'Banner Management — Edutech Admin',
  description: 'Manage homepage banners, upload images to Supabase storage, and set display order.',
};

export default function AdminBannersPage() {
  return <BannerManager />;
}
