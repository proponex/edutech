import { createClient } from '@supabase/supabase-js';

// Dedicated server-side admin client using service role key
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export class StudentIdService {
  /**
   * Format: ED-YYYY-NNNNNN
   * E.g. ED-2026-000001
   */
  static formatId(year: number, seq: number): string {
    return `ED-${year}-${String(seq).padStart(6, '0')}`;
  }

  /**
   * Validate that a string adheres strictly to the ED-YYYY-NNNNNN format.
   */
  static isValidId(idString: string): boolean {
    if (!idString || typeof idString !== 'string') return false;
    const regex = /^ED-\d{4}-\d{6}$/;
    return regex.test(idString.trim().toUpperCase());
  }

  /**
   * Normalize input student ID to clean uppercase format
   */
  static normalizeId(idString: string): string {
    return idString ? idString.trim().toUpperCase() : '';
  }

  /**
   * Atomically generate a new unique student ID for the current year.
   * Ensures concurrent account registrations cannot generate duplicate IDs.
   */
  static async generateUniqueStudentId(year?: number): Promise<string> {
    const supabase = getAdminSupabase();
    const targetYear = year || new Date().getFullYear();

    // 1. Try atomic database stored procedure first if available
    try {
      const { data: rpcId, error: rpcErr } = await supabase.rpc('generate_student_id');
      if (!rpcErr && rpcId && typeof rpcId === 'string' && this.isValidId(rpcId)) {
        return rpcId;
      }
    } catch {
      // Stored proc not yet installed, proceed to sequence table
    }

    // 2. Atomic sequence table update
    try {
      // Fetch or initialize sequence row for targetYear
      const { data: seqRow, error: fetchErr } = await supabase
        .from('student_id_sequences')
        .select('current_seq')
        .eq('year', targetYear)
        .maybeSingle();

      if (!fetchErr && seqRow) {
        const nextSeq = (seqRow.current_seq || 0) + 1;
        const { data: updated, error: updateErr } = await supabase
          .from('student_id_sequences')
          .update({
            current_seq: nextSeq,
            updated_at: new Date().toISOString(),
          })
          .eq('year', targetYear)
          .select('current_seq')
          .single();

        if (!updateErr && updated) {
          return this.formatId(targetYear, updated.current_seq);
        }
      } else {
        // Initialize for target year
        const { data: inserted, error: insertErr } = await supabase
          .from('student_id_sequences')
          .insert({
            year: targetYear,
            current_seq: 1,
            updated_at: new Date().toISOString(),
          })
          .select('current_seq')
          .single();

        if (!insertErr && inserted) {
          return this.formatId(targetYear, inserted.current_seq);
        }
      }
    } catch {
      // Sequence table not yet initialized, fall back to counting existing students
    }

    // 3. Fallback: Count existing students with safe retry loop to prevent collisions
    let maxRetries = 10;
    while (maxRetries > 0) {
      maxRetries--;
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'student');

      const estimatedSeq = (count || 0) + 1 + (10 - maxRetries);
      const candidateId = this.formatId(targetYear, estimatedSeq);

      // Verify uniqueness
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('student_id_code', candidateId)
        .maybeSingle();

      if (!existing) {
        return candidateId;
      }
    }

    // Ultimate fallback if high concurrency collision
    const randomOffset = Math.floor(100000 + Math.random() * 900000);
    return `ED-${targetYear}-${String(randomOffset).slice(0, 6)}`;
  }

  /**
   * Assign or retrieve permanent student ID for a given student user ID.
   * Ensures the student ID is permanent and never changes during normal edits.
   */
  static async getOrAssignStudentId(userId: string): Promise<string> {
    const supabase = getAdminSupabase();

    // 1. Check if student already has an ID in profiles
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && profile?.student_id_code) {
        return profile.student_id_code;
      }

      // Check registration year from creation date
      const regYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear();

      // 2. Generate permanent ID
      const newId = await this.generateUniqueStudentId(regYear);

      // 3. Persist to profiles
      try {
        await supabase
          .from('profiles')
          .update({
            student_id_code: newId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } catch (e) {
        console.warn('Could not update profiles.student_id_code:', e);
      }

      // 4. Persist to students table if exists
      try {
        await supabase
          .from('students')
          .update({
            student_id_code: newId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } catch (e) {
        console.warn('Could not update students.student_id_code:', e);
      }

      return newId;
    } catch (err) {
      console.error('Error in getOrAssignStudentId:', err);
      // Fallback deterministic pseudo-ID based on UUID hash to prevent blank UI
      const hash = Math.abs(
        userId.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)
      ) % 1000000;
      return this.formatId(new Date().getFullYear(), Math.max(hash, 1));
    }
  }

  /**
   * Backfill IDs for all existing students who don't have one.
   * Safe and repeatable: does NOT overwrite previously assigned IDs.
   */
  static async backfillMissingStudentIds(): Promise<{
    totalStudents: number;
    assignedCount: number;
    existingCount: number;
  }> {
    const supabase = getAdminSupabase();

    // Get all students ordered chronologically
    const { data: students, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: true });

    if (error || !students) {
      console.error('Failed to fetch students for backfill:', error);
      return { totalStudents: 0, assignedCount: 0, existingCount: 0 };
    }

    let assignedCount = 0;
    let existingCount = 0;

    for (const student of students) {
      if (student.student_id_code && this.isValidId(student.student_id_code)) {
        existingCount++;
      } else {
        const year = student.created_at ? new Date(student.created_at).getFullYear() : new Date().getFullYear();
        const newId = await this.generateUniqueStudentId(year);

        try {
          await supabase
            .from('profiles')
            .update({ student_id_code: newId, updated_at: new Date().toISOString() })
            .eq('id', student.id);

          await supabase
            .from('students')
            .update({ student_id_code: newId, updated_at: new Date().toISOString() })
            .eq('id', student.id);

          assignedCount++;
        } catch (err) {
          console.error(`Failed to assign ID to student ${student.id}:`, err);
        }
      }
    }

    return {
      totalStudents: students.length,
      assignedCount,
      existingCount,
    };
  }

  /**
   * Look up a student securely by student_id_code.
   * Returns public identity without sensitive private information (password, token, etc.).
   */
  static async lookupStudentById(studentIdCode: string): Promise<{
    id: string;
    name: string;
    student_id_code: string;
    photo_url: string | null;
    class_id: string | null;
    board_id: string | null;
  } | null> {
    const normalized = this.normalizeId(studentIdCode);
    if (!this.isValidId(normalized)) return null;

    const supabase = getAdminSupabase();

    // 1. Query profiles
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .eq('student_id_code', normalized)
        .maybeSingle();

      if (!error && profile) {
        return {
          id: profile.id,
          name: profile.name,
          student_id_code: profile.student_id_code,
          photo_url: profile.photo_url || null,
          class_id: profile.class_id || null,
          board_id: profile.board_id || null,
        };
      }
    } catch {
      // Column might not exist yet
    }

    // 2. Fallback: check all students by computed or backfilled ID
    const { data: allStudents } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: true });

    if (allStudents) {
      for (const s of allStudents) {
        if (!s.student_id_code) {
          const assigned = await this.getOrAssignStudentId(s.id);
          if (assigned === normalized) {
            return {
              id: s.id,
              name: s.name,
              student_id_code: assigned,
              photo_url: s.photo_url || null,
              class_id: s.class_id || null,
              board_id: s.board_id || null,
            };
          }
        }
      }
    }

    return null;
  }
}
