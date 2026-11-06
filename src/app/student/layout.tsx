'use client';

import React, { useEffect } from 'react';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Enforce light theme only for the entire student dashboard experience
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <div className="prepnx-student-theme min-h-screen bg-[#FAF9FF] text-[#17133A] selection:bg-[#F3E8FF] selection:text-[#7E22CE] flex flex-col font-sans">
      {children}
    </div>
  );
}

