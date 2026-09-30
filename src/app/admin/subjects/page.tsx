import React from 'react';
import { SubjectManager } from '@/components/admin/SubjectManager';

export const metadata = {
  title: 'Subject Catalog — Edutech Admin',
  description: 'Manage academic subjects, syllabus units, and learning topics across classes.',
};

export default function AdminSubjectsPage() {
  return <SubjectManager />;
}
