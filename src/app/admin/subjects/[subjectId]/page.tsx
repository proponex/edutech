import React from 'react';
import { SyllabusManager } from '@/components/admin/SyllabusManager';

export const metadata = {
  title: 'Manage Syllabus & Topics — Edutech Admin',
  description: 'Manage units, chapters, and topics for this subject.',
};

interface PageProps {
  params: Promise<{
    subjectId: string;
  }>;
}

export default async function AdminSubjectDetailPage({ params }: PageProps) {
  const { subjectId } = await params;
  return <SyllabusManager subjectId={subjectId} />;
}
