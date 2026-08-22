export interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'teacher' | 'student';
  must_change_password?: boolean;
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
  gender?: 'L' | 'P';
  nip?: string;
  nuptk?: string;
  birth_place?: string;
  birth_date?: string;
  photo_path?: string;
  phone?: string;
  email?: string;
  address?: string;
  subject?: string;
  status: 'active' | 'inactive';
  submissions_count?: number;
  murajaahs_count?: number;
  tahfidz_groups_count?: number;
  supervised_students?: number;
  homeroom_classes?: { id: number; name: string }[];
  tahfidz_groups?: { id: number; name: string; status: string }[];
  user?: User;
}

export interface TeacherStats {
  total: number;
  active: number;
  pembimbing_active: number;
  supervised_students: number;
  avg_per_teacher: number;
}

export interface TeacherStudentRow {
  id: number;
  name: string;
  class_name: string | null;
  status: string;
  total_juz: number;
  progress_percentage: number;
  total_setoran: number;
  total_murajaah: number;
  last_submission_at: string | null;
  last_murajaah_at: string | null;
}

export interface TeacherActivity {
  type: 'submission' | 'murajaah';
  student_name: string;
  action: string;
  detail: string;
  datetime: string | null;
  time: string | null;
}

export interface TeacherDetail {
  teacher: Teacher;
  students: TeacherStudentRow[];
  statistics: {
    total_santri: number;
    total_setoran: number;
    total_murajaah: number;
    avg_progress: number;
  };
  activities: TeacherActivity[];
}

export interface TeacherPerformancePoint {
  date: string;
  label: string;
  setoran: number;
  murajaah: number;
  target: number;
}

export type TeacherPerformanceRange = '7d' | '30d' | '3m';

export interface Student {
  id: number;
  user_id?: number;
  student_code: string;
  nis?: string;
  nisn?: string;
  nik?: string;
  name: string;
  gender: 'L' | 'P';
  birth_place?: string;
  birth_date?: string;
  photo_path?: string;
  address?: string;
  phone?: string;
  class_id: number;
  academic_year_id: number;
  entry_year?: number;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  father_name?: string;
  mother_name?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_address?: string;
  memorization_target?: number;
  starting_juz?: number;
  notes?: string;
  submissions_count?: number;
  murajaahs_count?: number;
  class_room?: ClassRoom;
  academic_year?: AcademicYear;
  tahfidz_groups?: TahfidzGroup[];
  progress_summary?: StudentProgressSummary;
  tahfidz_profile?: {
    total_juz: number;
    progress_target: number;
    hafalan_terakhir?: string;
    setoran_terakhir?: string;
    murajaah_terakhir?: string;
    total_setoran: number;
    total_murajaah: number;
  };
}

export interface ClassRoom {
  id: number;
  name: string;
  grade: number;
  academic_year_id: number;
  homeroom_teacher_id?: number;
  homeroom_teacher?: Teacher;
  academic_year?: AcademicYear;
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
  members_count?: number;
}

export interface QuranSurah {
  id: number;
  surah_number: number;
  name_arabic: string;
  name_latin: string;
  translation: string;
  total_ayahs: number;
  revelation_place?: 'makkiyah' | 'madaniyah' | null;
  juz_range?: { min: number; max: number } | null;
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

export interface QuranStatistics {
  total_surahs: number;
  total_ayahs: number;
  total_juz: number;
  makkiyah: number;
  madaniyah: number;
}

export type MemorizationStatus = 'not_memorized' | 'in_progress' | 'memorized';

export interface RecitationWordResult {
  ayah_number: number;
  word: string;
  status: 'correct' | 'incorrect' | 'missing';
  spoken?: string | null;
}

export interface RecitationCheckPayload {
  surah_id: number;
  start_ayah: number;
  end_ayah: number;
  transcript?: string;
  extra_count: number;
  details: RecitationWordResult[];
}

export interface RecitationCheck {
  id: number;
  student_id: number;
  surah_id: number;
  start_ayah: number;
  end_ayah: number;
  score: number;
  correct_count: number;
  incorrect_count: number;
  missing_count: number;
  extra_count: number;
  transcript?: string | null;
  details: RecitationWordResult[];
  ayah_statuses?: Record<number, string> | null;
  checked_at: string;
  student?: Student;
  surah?: QuranSurah;
}

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
  submission_time?: string | null;
  surah_id: number;
  start_ayah: number;
  end_ayah: number;
  page_count?: number | string | null;
  type: 'new_memorization' | 'repetition';
  method?: 'setoran' | 'murojaah' | 'tasmi' | 'sambung_ayat';
  fluency_score: number;
  tajwid_score: number;
  makhraj_score: number;
  fashahah_score: number;
  final_score: number;
  status?: 'pending' | 'approved' | 'revision' | 'rejected';
  notes?: string;
  audio_path?: string | null;
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
  time?: string | null;
  juz?: number | null;
  surah_id: number;
  start_ayah: number;
  end_ayah: number;
  page_count?: number | string | null;
  method?: 'independent' | 'repeated' | 'group' | 'guided';
  duration_minutes?: number | null;
  fluency_score: number;
  tajwid_score: number;
  makhraj_score: number;
  fashahah_score: number;
  final_score: number;
  status: 'pending' | 'approved' | 'revision' | 'rejected' | 'LANCAR' | 'PERLU_MUROJAAH';
  notes?: string;
  audio_path?: string | null;
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
  student?: Pick<Student, 'id' | 'name' | 'student_code' | 'class_id' | 'memorization_target' | 'starting_juz'>;
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

export interface ProgressStats {
  total_students: number;
  avg_progress: number;
  avg_score: number;
  total_juz: number;
}

export interface Certificate {
  id: number;
  certificate_number: string;
  student_id: number;
  juz_count: number;
  issued_date: string;
  pembina_name?: string | null;
  pengajar_name?: string | null;
  verification_code: string;
  notes?: string | null;
  created_at?: string;
  juz_label?: string;
  institution_name?: string | null;
  institution_city?: string | null;
  institution_logo_path?: string | null;
  student?: {
    id: number;
    name: string;
    student_code?: string | null;
    class_name?: string | null;
    class_room?: { id: number; name: string } | null;
  } | null;
}

export interface EligibleStudent {
  student_id: number;
  name: string;
  student_code?: string | null;
  class_name?: string | null;
  starting_juz?: number;
  total_juz_completed: number;
  certified_max_juz: number;
  juz_label: string;
  already_certified: boolean;
}

export interface CertificateStats {
  total_certificates: number;
  total_recipients: number;
  eligible_students: number;
  kamil_count: number;
}

export interface CertificateVerifyResponse {
  valid: boolean;
  message?: string;
  certificate?: {
    certificate_number: string;
    juz_count: number;
    juz_label: string;
    issued_date: string;
    institution_name: string;
    student_name: string;
    class_name?: string | null;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface MurajaahMethod {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  sort: number;
}

export interface AppSettings {
  profile: {
    name: string;
    npsn: string;
    nsm: string;
    madrasah_type: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    city: string;
    province: string;
    logo_path: string | null;
  };
  application: {
    app_name: string;
    tagline: string;
    logo_path: string | null;
    favicon_path: string | null;
    primary_color: string;
    timezone: string;
    language: string;
    date_format: string;
    time_format: string;
  };
  notifications: {
    setoran_enabled: boolean;
    murajaah_enabled: boolean;
    target_enabled: boolean;
    announcement_enabled: boolean;
    absensi_enabled: boolean;
    system_enabled: boolean;
    templates: Record<string, string>;
  };
  targets: {
    daily_pages: number;
    weekly_pages: number;
    monthly_pages: number;
  };
  murajaah_methods: {
    methods: MurajaahMethod[];
  };
  recitation_check: {
    save_enabled: boolean;
  };
  security: {
    session_timeout_minutes: number;
    two_factor_auth: boolean;
    login_notification: boolean;
  };
  backup: {
    schedule_time: string;
    retention_days: number;
    encryption_enabled: boolean;
    last_backup_at: string | null;
    last_backup_status: string | null;
    last_backup_size: string | null;
  };
  integrations: {
    whatsapp_enabled: boolean;
    whatsapp_number: string;
    smtp_enabled: boolean;
    smtp_host: string;
    smtp_port: number;
    smtp_from_name: string;
    smtp_from_email: string;
    smtp_password: string;
    cloud_storage_enabled: boolean;
    google_drive_enabled: boolean;
    api_enabled: boolean;
    api_key: string;
    webhook_enabled: boolean;
    webhook_url: string;
    webhook_secret: string;
  };
}

export interface SettingsUser extends User {
  is_active: boolean;
  last_login_at: string | null;
  teacher?: { id: number; name: string } | null;
  student?: { id: number; name: string } | null;
}

export interface UsersResponse {
  users: PaginatedResponse<SettingsUser>;
  role_counts: Record<string, number>;
}

export interface ActivityLog {
  id: number;
  action: string;
  model: string;
  model_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
  user_name: string | null;
  user_email: string | null;
}

export interface SessionInfo {
  id: number;
  name: string;
  created_at: string | null;
  last_used_at: string | null;
  current: boolean;
}

export interface NotificationItem {
  id: number;
  type: string;
  subject: string | null;
  body: string | null;
  status: 'sent' | 'skipped' | 'failed';
  error: string | null;
  student_id: number | null;
  student_name: string | null;
  recipient_email: string | null;
  sent_at: string | null;
  created_at: string | null;
  is_read: boolean;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  unread_count: number;
  total: number;
  last_page: number;
  current_page: number;
}

export interface DashboardStatistics {
  total_students: number;
  active_students: number;
  submissions_today: number;
  submissions_trend: number | null;
  murajaahs_today: number;
  murajaahs_trend: number | null;
  target_reached: number;
  target_base: number;
  target_percentage: number;
  avg_pages_per_student: number;
}

export interface DashboardChartPoint {
  date: string;
  label: string;
  setoran: number;
  setoran_pages: number;
  murajaah: number;
  murajaah_pages: number;
  target: number;
}

export interface DashboardTarget {
  total: number;
  reached: number;
  not_reached: number;
  no_activity: number;
  percentage: number;
}

export interface DashboardActivity {
  type: 'submission' | 'murajaah';
  id: number;
  student_name: string;
  student_id: number;
  action: string;
  detail: string;
  teacher_name: string | null;
  status: string | null;
  datetime: string | null;
  time: string | null;
}

export interface DashboardRecentSubmission {
  id: number;
  student_name: string;
  class_name: string | null;
  surah: string;
  ayah_range: string | null;
  page_count: string | number | null;
  teacher_name: string | null;
  status: string | null;
  date: string | null;
  time: string | null;
}

export interface DashboardAttentionStudent {
  id: number;
  name: string;
  class_name: string | null;
  severity: 'warning' | 'danger' | 'info';
  message: string;
}

export interface DashboardClassPerformance {
  id: number;
  name: string;
  students: number;
  submissions: number;
  murajaahs: number;
  target_percentage: number;
}

export interface DashboardTopStudent {
  id: number;
  name: string;
  class_name: string | null;
  total_juz: number;
  progress_percentage: number;
  score: number;
}

export interface DashboardTeacherActivity {
  active_teachers: number;
  submissions_30d: number;
  murajaahs_30d: number;
  avg_students_per_teacher: number;
  teachers: {
    id: number;
    name: string;
    students: number;
    submissions: number;
    murajaahs: number;
  }[];
}

export interface DashboardInsight {
  type: 'success' | 'warning' | 'info';
  text: string;
}

export interface DashboardOverview {
  statistics: DashboardStatistics;
  chart: DashboardChartPoint[];
  target: DashboardTarget;
  recent_activities: DashboardActivity[];
  recent_submissions: DashboardRecentSubmission[];
  attention: DashboardAttentionStudent[];
  class_performance: DashboardClassPerformance[];
  top_students: DashboardTopStudent[];
  teacher_activity?: DashboardTeacherActivity;
  insights: DashboardInsight[];
}

export type DashboardRange = '7d' | '30d' | '3m' | '6m' | '1y';

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
