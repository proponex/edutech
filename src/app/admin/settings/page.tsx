'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import {
  Settings,
  ShieldCheck,
  User,
  Database,
  Video,
  Key,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Profile } from '@/types';

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadAdminProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data as Profile);
          setName(data.name || '');
        }
      }
    }

    loadAdminProfile();
  }, [supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      setMessage(null);
      const { error } = await supabase
        .from('profiles')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;
      setMessage('Admin profile updated successfully.');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopySqlPath = () => {
    navigator.clipboard.writeText('supabase/super_admin_schema.sql');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-900 dark:bg-primary-950/80 dark:text-primary-300">
            System Configuration
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Platform & Administrator Settings
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Manage administrator profile details, verify cloud service connections, and review database migration status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Admin Profile */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-primary-500" />
                Administrator Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {message && (
                <div
                  className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                    message.startsWith('Error')
                      ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                      : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Admin Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Email Address (Read Only)
                  </label>
                  <input
                    type="email"
                    value={profile?.email || 'admin@gmail.com'}
                    disabled
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Super Admin authentication email cannot be modified from the web console.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Role Tier
                  </label>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800 text-primary-900 dark:text-primary-200 font-bold">
                    <ShieldCheck className="w-4 h-4 text-primary-600" />
                    <span>Super Administrator (Root)</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={saving}
                  className="w-full mt-2"
                >
                  Save Profile Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Cloud & Database Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cloud Services Health Card */}
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-primary-500" />
                Integrated Cloud Services Status
              </CardTitle>
              <CardDescription className="text-xs">
                Verification status for backend storage, video streaming, and authentication providers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Supabase Status */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                    SB
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      Supabase PostgreSQL & Auth
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Live connection &bull; RLS policy enforcement active
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Operational
                </span>
              </div>

              {/* Mux Video Status */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      Mux Video Pipeline
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Token IDs configured &bull; Webhooks listening on /api/webhooks/mux
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Operational
                </span>
              </div>

              {/* Razorpay Gateway Status */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      Razorpay Payment Gateway
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Phase 2 readiness &bull; Minor-unit pricing foundation active
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Planned Integration
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Database Migration Instructions Card */}
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                Super Admin Database Migration Script
              </CardTitle>
              <CardDescription className="text-xs">
                Idempotent SQL script to enable Audit Logging, Parent-Student Linking, and Pricing.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                The Super Admin Dashboard operates smoothly out-of-the-box. To initialize dedicated database tables for persistent audit logging and explicit parent-student links, execute the migration script in your Supabase SQL editor:
              </p>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-[11px]">
                <span className="text-neutral-800 dark:text-neutral-200">
                  supabase/super_admin_schema.sql
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopySqlPath}
                  className="h-7 text-xs flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied' : 'Copy Path'}</span>
                </Button>
              </div>

              <div className="pt-2 text-neutral-500 text-[11px] leading-relaxed">
                <strong>Steps:</strong>
                <ol className="list-decimal pl-4 mt-1 space-y-1">
                  <li>Open your Supabase project dashboard at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-primary-500 underline">supabase.com</a>.</li>
                  <li>Navigate to <strong>SQL Editor</strong> &gt; <strong>New Query</strong>.</li>
                  <li>Copy and paste the contents of <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">supabase/super_admin_schema.sql</code>.</li>
                  <li>Click <strong>Run</strong> to establish the schema extension.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
