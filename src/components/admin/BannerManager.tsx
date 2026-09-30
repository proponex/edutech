'use client';

import React, { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { BannerItem } from '@/types';

export function BannerManager() {
  const supabase = createClient();

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<BannerItem | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPreview, setFormPreview] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load banners on mount
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('banners')
          .select('*')
          .order('display_order', { ascending: true });

        if (!ignore) {
          if (fetchErr) {
            setError(fetchErr.message);
          } else {
            setBanners((data as BannerItem[]) || []);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to fetch banners.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  // Refetch helper for action handlers
  const fetchBanners = async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setBanners((data as BannerItem[]) || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch banners.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormOrder(banners.length + 1);
    setFormIsActive(true);
    setFormFile(null);
    setFormPreview(null);
    setSelectedBanner(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormFile(file);
      setFormPreview(URL.createObjectURL(file));
    }
  };

  // Add Banner
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFile) {
      setError('Please select an image for the banner.');
      return;
    }
    if (!formTitle) {
      setError('Please provide a banner title.');
      return;
    }

    try {
      setFormSubmitting(true);
      setError(null);

      // 1. Upload to Supabase Storage 'banners'
      const fileExt = formFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, formFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      // 2. Insert record into banners table
      const { error: insertError } = await supabase.from('banners').insert({
        title: formTitle,
        description: formDescription || null,
        image_url: imageUrl,
        storage_path: filePath,
        display_order: Number(formOrder),
        is_active: formIsActive,
      });

      if (insertError) {
        throw new Error(`Database record creation failed: ${insertError.message}`);
      }

      setActionSuccess('Banner successfully created and uploaded!');
      setIsAddOpen(false);
      resetForm();
      fetchBanners();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating banner.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (banner: BannerItem) => {
    setSelectedBanner(banner);
    setFormTitle(banner.title);
    setFormDescription(banner.description || '');
    setFormOrder(banner.display_order);
    setFormIsActive(banner.is_active);
    setFormPreview(banner.image_url);
    setFormFile(null);
    setIsEditOpen(true);
  };

  // Edit Banner
  const handleEditBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBanner) return;

    try {
      setFormSubmitting(true);
      setError(null);

      let finalImageUrl = selectedBanner.image_url;
      let finalStoragePath = selectedBanner.storage_path;

      // If a new file was chosen, upload it
      if (formFile) {
        const fileExt = formFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(filePath, formFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('banners')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrlData.publicUrl;
        finalStoragePath = filePath;
      }

      // Update record
      const { error: updateError } = await supabase
        .from('banners')
        .update({
          title: formTitle,
          description: formDescription || null,
          image_url: finalImageUrl,
          storage_path: finalStoragePath,
          display_order: Number(formOrder),
          is_active: formIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBanner.id);

      if (updateError) {
        throw new Error(`Banner update failed: ${updateError.message}`);
      }

      setActionSuccess('Banner updated successfully!');
      setIsEditOpen(false);
      resetForm();
      fetchBanners();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating banner.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Active Status
  const toggleActive = async (banner: BannerItem) => {
    try {
      const newStatus = !banner.is_active;
      // Optimistic update
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, is_active: newStatus } : b))
      );

      const { error: updateErr } = await supabase
        .from('banners')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', banner.id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
      fetchBanners();
    }
  };

  // Delete Banner
  const handleDeleteBanner = async () => {
    if (!selectedBanner) return;

    try {
      setFormSubmitting(true);

      // Try deleting from storage if storage_path is present
      if (selectedBanner.storage_path) {
        try {
          await supabase.storage
            .from('banners')
            .remove([selectedBanner.storage_path]);
        } catch {
          // Non-blocking storage removal
        }
      }

      // Delete from table
      const { error: deleteErr } = await supabase
        .from('banners')
        .delete()
        .eq('id', selectedBanner.id);

      if (deleteErr) {
        throw new Error(deleteErr.message);
      }

      setActionSuccess('Banner removed successfully!');
      setIsDeleteOpen(false);
      resetForm();
      fetchBanners();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete banner.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Banner Management
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Upload and control hero banners displayed on the Edutech public homepage.
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
          variant="primary"
          size="md"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Banner
        </Button>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Banners Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-44 bg-neutral-200 dark:bg-neutral-800 rounded-t-2xl" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <Card className="text-center py-16 px-4 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800/80 flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            No Banners Created Yet
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mt-1 mb-6">
            Get started by adding up to 3 homepage banners. Images are securely stored in Supabase Storage.
          </p>
          <Button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            variant="primary"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Your First Banner
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <Card
              key={banner.id}
              className="overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow border-neutral-200 dark:border-neutral-800"
            >
              <div>
                {/* Banner Thumbnail */}
                <div className="relative h-44 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden group">
                  <NextImage
                    src={banner.image_url}
                    alt={banner.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant={banner.is_active ? 'success' : 'neutral'}>
                      {banner.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-neutral-950/70 text-white backdrop-blur-sm">
                      Order: {banner.display_order}
                    </span>
                  </div>
                </div>

                {/* Banner Details */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {banner.title}
                  </h3>
                  {banner.description && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                      {banner.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-5 pt-0 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/80 mt-2">
                <button
                  type="button"
                  onClick={() => toggleActive(banner)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {banner.is_active ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Enable
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(banner)}
                    className="p-2 h-8 w-8"
                    title="Edit Banner"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedBanner(banner);
                      setIsDeleteOpen(true);
                    }}
                    className="p-2 h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Delete Banner"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ADD BANNER MODAL */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Banner"
        description="Upload an image and set details for the homepage banner."
        maxWidth="lg"
      >
        <form onSubmit={handleAddBanner} className="space-y-4">
          {/* File Picker / Drag & Drop */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Banner Image (Required)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-primary-500 dark:hover:border-primary-500 rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-colors bg-neutral-50 dark:bg-neutral-900/50"
            >
              {formPreview ? (
                <div className="space-y-2">
                  <div className="relative h-32 sm:h-36 w-full rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center">
                    <NextImage
                      src={formPreview}
                      alt="Preview"
                      fill
                      sizes="400px"
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                    Click to change image
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-2">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/80 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    Choose a banner file or drag & drop here
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    PNG, JPG, WEBP recommended (1200x500 or 16:9)
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <Input
            label="Banner Title"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="e.g. Empower Your Future with Edutech"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g. Admissions open for academic year 2026-2027."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/80 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Display Order"
              type="number"
              min={1}
              value={formOrder}
              onChange={(e) => setFormOrder(Number(e.target.value))}
            />

            <div className="flex flex-col justify-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Visible on Homepage
                </span>
              </label>
            </div>
          </div>

          {/* Sticky action buttons at modal bottom */}
          <div className="sticky bottom-0 bg-white dark:bg-neutral-900 pt-3 pb-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5 z-10 -mx-1 px-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={formSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={formSubmitting}
            >
              Upload & Save Banner
            </Button>
          </div>
        </form>
      </Dialog>

      {/* EDIT BANNER MODAL */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Banner"
        description="Update banner text, display order, or replace image."
        maxWidth="lg"
      >
        <form onSubmit={handleEditBanner} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Current / New Image
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-neutral-50 dark:bg-neutral-900/50"
            >
              {formPreview && (
                <div className="space-y-2">
                  <div className="relative h-36 w-full rounded-xl overflow-hidden bg-neutral-950">
                    <NextImage
                      src={formPreview}
                      alt="Preview"
                      fill
                      sizes="400px"
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                    Click to replace image file (optional)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <Input
            label="Banner Title"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Description
            </label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/80 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Display Order"
              type="number"
              min={1}
              value={formOrder}
              onChange={(e) => setFormOrder(Number(e.target.value))}
            />

            <div className="flex flex-col justify-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Visible on Homepage
                </span>
              </label>
            </div>
          </div>

          {/* Sticky action buttons at modal bottom */}
          <div className="sticky bottom-0 bg-white dark:bg-neutral-900 pt-3 pb-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5 z-10 -mx-1 px-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={formSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={formSubmitting}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Banner"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Are you sure you want to delete banner &ldquo;
            <strong className="text-neutral-900 dark:text-white">
              {selectedBanner?.title}
            </strong>
            &rdquo;? This will remove the image from Supabase Storage and remove the record permanently.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={formSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteBanner}
              isLoading={formSubmitting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
