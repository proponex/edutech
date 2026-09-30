import React from 'react';
import { ClassManager } from '@/components/admin/ClassManager';

export const metadata = {
  title: 'Class Management — Edutech Admin',
  description: 'Manage educational classes from Kindergarten to Class 12, toggle visibility, and adjust order.',
};

export default function AdminClassesPage() {
  return <ClassManager />;
}
