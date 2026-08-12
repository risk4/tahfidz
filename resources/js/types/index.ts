export interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'teacher' | 'student';
  teacher_id?: number;
  student_id?: number;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Teacher {
  id: number;
  user_id?: number;
  teacher_code: string;
  name: string;
  nip?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
}

export interface Student {
  id: number;
  user_id?: number;
  student_code: string;
  nis?: string;
  nisn?: string;
  name: string;
  gender: 'L' | 'P';
  birth_place?: string;
  birth_date?: string;
  class_id: number;
  academic_year_id: number;
  status: 'active' | 'inactive' | 'graduated';
  class_room?: ClassRoom;
  academic_year?: AcademicYear;
}

export interface ClassRoom {
  id: number;
  name: string;
  grade: number;
  academic_year_id: number;
  homeroom_teacher_id?: number;
  homeroom_teacher?: Teacher;
}

export interface TahfidzGroup {
  id: number;
  name: string;
  teacher_id: number;
  academic_year_id: number;
  description?: string;
  status: 'active' | 'inactive';
  teacher?: Teacher;
  academic_year?: AcademicYear;
  members?: Student[];
}

export interface QuranSurah {
  id: number;
  surah_number: number;
  name_arabic: string;
  name_latin: string;
  translation: string;
  total_ayahs: number;
}

export interface QuranAyah {
  id: number;
  juz_id: number;
  surah_id: number;
  ayah_number: number;
  text_arabic: string;
  text_translation?: string | null;
  juz?: {
    id: number;
    juz_number: number;
  };
}

export type MemorizationStatus = 'not_memorized' | 'in_progress' | 'memorized';

export interface AyahMemorizationStatus {
  ayah_number: number;
  memorization_status: MemorizationStatus;
}

export interface Submission {
  id: number;
  student_id: number;
  teacher_id: number;
  academic_year_id: number;
  submission_date: string;
  surah_id: number;
  start_ayah: number;
  end_ayah: number;
  type: 'new_memorization' | 'repetition';
  fluency_score: number;
  tajwid_score: number;
  makhraj_score: number;
  fashahah_score: number;
  final_score: number;
  notes?: string;
  student?: Student;
  teacher?: Teacher;
  academic_year?: AcademicYear;
  surah?: QuranSurah;
}

export interface Murajaah {
  id: number;
  student_id: number;
  teacher_id: number;
  academic_year_id: number;
  date: string;
  surah_id: number;
  start_ayah: number;
  end_ayah: number;
  fluency_score: number;
  tajwid_score: number;
  makhraj_score: number;
  fashahah_score: number;
  final_score: number;
  status: 'LANCAR' | 'PERLU_MUROJAAH';
  notes?: string;
  student?: Student;
  teacher?: Teacher;
  academic_year?: AcademicYear;
  surah?: QuranSurah;
}

export interface StudentProgressSummary {
  student_id: number;
  total_ayah_covered: number;
  total_surah_completed: number;
  total_juz_completed: number;
  progress_percentage: number;
  average_score: number;
  last_submission_at?: string;
  student?: Pick<Student, 'id' | 'name' | 'student_code' | 'class_id'>;
}

export interface SurahProgress {
  surah_id: number;
  surah_number: number;
  name_latin: string;
  total_ayahs: number;
  covered_ayahs: number;
  progress_percentage: number;
  average_score?: number | null;
  last_submission_at?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
