import api from '@/lib/api';
import axios from 'axios';
import type {
  ActivityLog,
  AppSettings,
  DashboardOverview,
  DashboardRange,
  MemorizationStatus,
  NotificationListResponse,
  PaginatedResponse,
  ProgressStats,
  QuranStatistics,
  RecitationCheckPayload,
  SessionInfo,
  TeacherDetail,
  TeacherPerformancePoint,
  TeacherPerformanceRange,
  TeacherStats,
  User,
  LoginResponse,
  UsersResponse,
} from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async me(): Promise<User> {
    const response = await api.get<User>('/me');
    return response.data;
  },

  async changePassword(current_password: string, password: string, password_confirmation: string) {
    const response = await api.post('/auth/change-password', { current_password, password, password_confirmation });
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(data: { email: string; token: string; password: string; password_confirmation: string }): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/reset-password', data);
    return response.data;
  },
};

export const academicYearService = {
  async list(params?: { page?: number; per_page?: number }) {
    const response = await api.get('/academic-years', { params });
    return response.data;
  },

  async create(data: { name: string; start_date: string; end_date: string }) {
    const response = await api.post('/academic-years', data);
    return response.data;
  },

  async update(id: number, data: { name: string; start_date: string; end_date: string }) {
    const response = await api.put(`/academic-years/${id}`, data);
    return response.data;
  },

  async activate(id: number) {
    const response = await api.post(`/academic-years/${id}/activate`);
    return response.data;
  },
};

export const teacherService = {
  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    subject?: string;
    role?: string;
    class_id?: number;
    halaqah_id?: number;
  }) {
    const response = await api.get('/teachers', { params });
    return response.data;
  },

  async stats() {
    const response = await api.get<TeacherStats>('/teachers/stats');
    return response.data;
  },

  async get(id: number) {
    const response = await api.get<TeacherDetail>(`/teachers/${id}`);
    return response.data;
  },

  async performance(id: number, range: TeacherPerformanceRange = '30d') {
    const response = await api.get<TeacherPerformancePoint[]>(`/teachers/${id}/performance`, { params: { range } });
    return response.data;
  },

  async create(data: {
    teacher_code: string;
    name: string;
    gender?: string;
    nip?: string;
    nuptk?: string;
    birth_place?: string;
    birth_date?: string;
    photo_path?: string;
    phone?: string;
    email?: string;
    address?: string;
    subject?: string;
    status?: string;
    password?: string;
    password_confirmation?: string;
  }) {
    const response = await api.post('/teachers', data);
    return response.data;
  },

  async update(id: number, data: Partial<{
    teacher_code: string;
    name: string;
    gender: string;
    nip: string;
    nuptk: string;
    birth_place: string;
    birth_date: string;
    photo_path: string;
    phone: string;
    email: string;
    address: string;
    subject: string;
    status: string;
    password: string;
    password_confirmation: string;
  }>) {
    const response = await api.put(`/teachers/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/teachers/${id}`);
  },

  async uploadPhoto(id: number, file: File): Promise<{ message: string; photo_path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/teachers/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deletePhoto(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/teachers/${id}/photo`);
    return response.data;
  },

  async export(params?: { search?: string; status?: string; subject?: string; role?: string; class_id?: number; halaqah_id?: number; format?: 'csv' | 'xlsx' }) {
    const token = localStorage.getItem('token');
    const format = params?.format ?? 'csv';
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    const response = await fetch(`/api/teachers/export${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Gagal mengunduh data export.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_guru_${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async downloadTemplate(format: 'csv' | 'xlsx' = 'csv') {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/teachers/import-template?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Gagal mengunduh template.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_import_guru.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async import(file: File, mode: 'update' | 'insert_only' = 'update'): Promise<{ message: string; imported: number; skipped: Array<{ row: number; data: string; errors: string[] }> }> {
    const form = new FormData();
    form.append('file', file);
    form.append('mode', mode);
    const response = await api.post('/teachers/import', form);
    return response.data;
  },
};

type StudentPayload = {
  student_code: string;
  name: string;
  nis?: string | null;
  nisn?: string | null;
  nik?: string | null;
  gender: 'L' | 'P';
  birth_place?: string | null;
  birth_date?: string | null;
  photo_path?: string | null;
  address?: string | null;
  phone?: string | null;
  class_id: number;
  academic_year_id: number;
  entry_year?: number | null;
  status?: string;
  father_name?: string | null;
  mother_name?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_address?: string | null;
  memorization_target?: number | null;
  starting_juz?: number | null;
  notes?: string | null;
};

export const studentService = {
  async list(params?: { page?: number; per_page?: number; search?: string; class_id?: number; kelas_id?: number; halaqah_id?: number; gender?: string; status?: string; tahun_masuk?: number; entry_year?: number }) {
    const response = await api.get('/students', { params });
    return response.data;
  },

  async get(id: number) {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  async create(data: StudentPayload) {
    const response = await api.post('/students', data);
    return response.data;
  },

  async update(id: number, data: Partial<StudentPayload>) {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/students/${id}`);
  },

  async uploadPhoto(id: number, file: File): Promise<{ message: string; photo_path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/students/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deletePhoto(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/students/${id}/photo`);
    return response.data;
  },

  async export(params?: { search?: string; class_id?: number; halaqah_id?: number; gender?: string; status?: string; tahun_masuk?: number; format?: 'csv' | 'xlsx' }) {
    const token = localStorage.getItem('token');
    const format = params?.format ?? 'csv';
    const query = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    const response = await fetch(`/api/students/export${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Gagal mengunduh data export.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_santri_${new Date().toISOString().slice(0,10)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async downloadTemplate(format: 'csv' | 'xlsx' = 'csv') {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/students/import-template?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Gagal mengunduh template.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_import_santri.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async import(file: File, mode: 'update' | 'insert_only' = 'update'): Promise<{ message: string; imported: number; skipped: Array<{ row: number; data: string; errors: string[] }> }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    const response = await api.post('/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export const classService = {
  async list(params?: { page?: number; per_page?: number; search?: string; academic_year_id?: number }) {
    const response = await api.get('/classes', { params });
    return response.data;
  },

  async create(data: { name: string; grade: number; academic_year_id: number; homeroom_teacher_id?: number }) {
    const response = await api.post('/classes', data);
    return response.data;
  },

  async update(id: number, data: Partial<{ name: string; grade: number; academic_year_id: number; homeroom_teacher_id: number }>) {
    const response = await api.put(`/classes/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/classes/${id}`);
  },
};

export const tahfidzGroupService = {
  async list(params?: { page?: number; per_page?: number; search?: string }) {
    const response = await api.get('/tahfidz-groups', { params });
    return response.data;
  },

  async get(id: number) {
    const response = await api.get(`/tahfidz-groups/${id}`);
    return response.data;
  },

  async create(data: { name: string; teacher_id: number; academic_year_id: number; description?: string }) {
    const response = await api.post('/tahfidz-groups', data);
    return response.data;
  },

  async update(id: number, data: Partial<{ name: string; teacher_id: number; description: string; status: string }>) {
    const response = await api.put(`/tahfidz-groups/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/tahfidz-groups/${id}`);
  },

  async addMember(groupId: number, studentId: number) {
    const response = await api.post(`/tahfidz-groups/${groupId}/members`, { student_id: studentId });
    return response.data;
  },

  async removeMember(groupId: number, studentId: number) {
    await api.delete(`/tahfidz-groups/${groupId}/members/${studentId}`);
  },
};

export const quranService = {
  async surahs(params?: {
    search?: string;
    juz_number?: number;
    revelation_place?: string;
    ayah_count?: string;
    page?: number;
    per_page?: number;
  }) {
    const response = await api.get('/quran/surahs', { params });
    return response.data;
  },

  async surah(id: number | string) {
    const response = await api.get(`/quran/surahs/${id}`);
    return response.data;
  },

  async statistics() {
    const response = await api.get<QuranStatistics>('/quran/statistics');
    return response.data;
  },

  async juz() {
    const response = await api.get('/quran/juz');
    return response.data as Array<{ id: number; juz_number: number }>;
  },

  async ayahs(surahId: number, params?: { search?: string; from?: number; to?: number; paged?: boolean; per_page?: number }) {
    const response = await api.get(`/quran/surahs/${surahId}/ayahs`, { params });
    return response.data;
  },

  async externalAyahs(surahNumber: number) {
    const [arabicResponse, translationResponse] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`),
      fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/id.indonesian`),
    ]);

    const arabicData = await arabicResponse.json();
    const translationData = translationResponse.ok ? await translationResponse.json() : null;
    const translations = new Map<number, string>(
      (translationData?.data?.ayahs ?? []).map((ayah: { numberInSurah: number; text: string }) => [ayah.numberInSurah, ayah.text])
    );

    return (arabicData?.data?.ayahs ?? []).map((ayah: { numberInSurah: number; text: string }) => ({
      ayah_number: ayah.numberInSurah,
      text_arabic: ayah.text,
      text_translation: translations.get(ayah.numberInSurah) ?? null,
    }));
  },
};

export const submissionService = {
  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    student_id?: number;
    surah_id?: number;
    juz?: number;
    type?: 'new_memorization' | 'repetition';
    status?: 'pending' | 'approved' | 'revision' | 'rejected';
    academic_year_id?: number;
    from?: string;
    to?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const response = await api.get('/submissions', { params });
    return response.data;
  },

  async create(data: {
    student_id: number;
    teacher_id?: number;
    submission_date: string;
    submission_time?: string;
    surah_id: number;
    start_ayah: number;
    end_ayah: number;
    page_count?: number;
    type: 'new_memorization' | 'repetition';
    method?: 'setoran' | 'murojaah' | 'tasmi' | 'sambung_ayat';
    status?: 'pending' | 'approved' | 'revision' | 'rejected';
    fluency_score: number;
    tajwid_score: number;
    makhraj_score: number;
    fashahah_score: number;
    notes?: string;
    audio_path?: string;
  }) {
    const response = await api.post('/submissions', data);
    return response.data;
  },

  async update(id: number, data: {
    student_id: number;
    teacher_id?: number;
    submission_date: string;
    submission_time?: string;
    surah_id: number;
    start_ayah: number;
    end_ayah: number;
    page_count?: number;
    type: 'new_memorization' | 'repetition';
    method?: 'setoran' | 'murojaah' | 'tasmi' | 'sambung_ayat';
    status?: 'pending' | 'approved' | 'revision' | 'rejected';
    fluency_score: number;
    tajwid_score: number;
    makhraj_score: number;
    fashahah_score: number;
    notes?: string;
    audio_path?: string;
  }) {
    const response = await api.put(`/submissions/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/submissions/${id}`);
  },

  async get(id: number) {
    const response = await api.get(`/submissions/${id}`);
    return response.data;
  },

  async export(params?: {
    search?: string;
    student_id?: number;
    surah_id?: number;
    juz?: number;
    type?: 'new_memorization' | 'repetition';
    status?: string;
    academic_year_id?: number;
    from?: string;
    to?: string;
    date_from?: string;
    date_to?: string;
    format?: 'csv' | 'xlsx';
  }) {
    const token = localStorage.getItem('token');
    const format = params?.format ?? 'csv';
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    const response = await fetch(`/api/submissions/export${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Gagal mengunduh data export.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_setoran_${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

export const murajaahService = {
  async list(params?: { page?: number; per_page?: number; search?: string; student_id?: number; surah_id?: number; academic_year_id?: number; juz?: number; method?: string; metode?: string; status?: string; date_from?: string; date_to?: string; from?: string; to?: string }) {
    const response = await api.get('/murajaahs', { params });
    return response.data;
  },

  async create(data: {
    student_id: number;
    teacher_id?: number;
    date: string;
    time?: string;
    juz?: number;
    surah_id: number;
    start_ayah: number;
    end_ayah: number;
    page_count?: number;
    method?: 'independent' | 'repeated' | 'group' | 'guided';
    duration_minutes?: number;
    fluency_score?: number;
    tajwid_score?: number;
    makhraj_score?: number;
    fashahah_score?: number;
    status?: 'pending' | 'approved' | 'revision' | 'rejected' | 'LANCAR' | 'PERLU_MUROJAAH';
    notes?: string;
    audio_path?: string;
  }) {
    const response = await api.post('/murajaahs', data);
    return response.data;
  },

  async update(id: number, data: {
    student_id: number;
    teacher_id?: number;
    date: string;
    time?: string;
    juz?: number;
    surah_id: number;
    start_ayah: number;
    end_ayah: number;
    page_count?: number;
    method?: 'independent' | 'repeated' | 'group' | 'guided';
    duration_minutes?: number;
    fluency_score?: number;
    tajwid_score?: number;
    makhraj_score?: number;
    fashahah_score?: number;
    status?: 'pending' | 'approved' | 'revision' | 'rejected' | 'LANCAR' | 'PERLU_MUROJAAH';
    notes?: string;
    audio_path?: string;
  }) {
    const response = await api.put(`/murajaahs/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/murajaahs/${id}`);
  },

  async ayahStatuses(id: number) {
    const response = await api.get(`/murajaahs/${id}/ayah-statuses`);
    return response.data;
  },

  async updateAyahStatus(id: number, data: { ayah_number: number; memorization_status: MemorizationStatus }) {
    const response = await api.patch(`/murajaahs/${id}/ayah-status`, data);
    return response.data;
  },

  async export(params?: {
    search?: string;
    student_id?: number;
    surah_id?: number;
    juz?: number;
    method?: string;
    metode?: string;
    status?: string;
    academic_year_id?: number;
    date_from?: string;
    date_to?: string;
    from?: string;
    to?: string;
    format?: 'csv' | 'xlsx';
  }) {
    const token = localStorage.getItem('token');
    const format = params?.format ?? 'csv';
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    const response = await fetch(`/api/murajaahs/export${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Gagal mengunduh data export.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_murajaah_${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

export const recitationService = {
  /** Flag penyimpanan riwayat (Pengaturan → Pengecekan Bacaan). */
  async config() {
    const response = await api.get<{ save_enabled: boolean }>('/recitation-checks/config');
    return response.data;
  },

  async list(params?: { page?: number; per_page?: number; student_id?: number }) {
    const response = await api.get('/recitation-checks', { params });
    return response.data;
  },

  async create(payload: RecitationCheckPayload) {
    const response = await api.post('/recitation-checks', payload);
    return response.data;
  },
};

export const progressService = {
  async list(params?: { page?: number; per_page?: number; class_id?: number; search?: string }) {
    const response = await api.get('/progress', { params });
    return response.data;
  },

  async stats(params?: { class_id?: number }) {
    const response = await api.get<ProgressStats>('/progress/stats', { params });
    return response.data;
  },

  async show(studentId: number) {
    const response = await api.get(`/progress/${studentId}`);
    return response.data;
  },
};

export const dashboardService = {
  async overview(range: DashboardRange = '30d') {
    const response = await api.get('/dashboard/overview', { params: { range } });
    return response.data as DashboardOverview;
  },
};

export const notificationService = {
  async list(params?: { per_page?: number }): Promise<NotificationListResponse> {
    const response = await api.get<NotificationListResponse>('/notifications', { params });
    return response.data;
  },

  async markRead(id: number): Promise<{ message: string }> {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllRead(): Promise<{ message: string }> {
    const response = await api.post('/notifications/read');
    return response.data;
  },
};

export type SettingsGroup = keyof AppSettings;

export const settingsService = {
  async all(): Promise<AppSettings> {
    const response = await api.get<AppSettings>('/settings');
    return response.data;
  },

  async updateGroup(group: SettingsGroup, values: Record<string, unknown>) {
    const response = await api.put(`/settings/${group}`, values);
    return response.data as { group: string; values: AppSettings[typeof group] };
  },

  async uploadLogo(key: string, file: File): Promise<{ path: string }> {
    const formData = new FormData();
    formData.append('key', key);
    formData.append('file', file);
    const response = await api.post('/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteLogo(key: string): Promise<{ message: string }> {
    const response = await api.delete('/settings/logo', { data: { key } });
    return response.data;
  },

  async users(params?: { page?: number; per_page?: number }): Promise<UsersResponse> {
    const response = await api.get<UsersResponse>('/settings/users', { params });
    return response.data;
  },

  async toggleUserActive(id: number): Promise<User> {
    const response = await api.post(`/settings/users/${id}/toggle-active`);
    return response.data;
  },

  async activityLogs(params?: { page?: number; per_page?: number }): Promise<PaginatedResponse<ActivityLog>> {
    const response = await api.get<PaginatedResponse<ActivityLog>>('/settings/activity-logs', { params });
    return response.data;
  },

  async clearActivityLogs(): Promise<{ message: string }> {
    const response = await api.delete('/settings/activity-logs');
    return response.data;
  },

  async sessions(): Promise<SessionInfo[]> {
    const response = await api.get<SessionInfo[]>('/settings/sessions');
    return response.data;
  },

  async revokeSession(id: number) {
    const response = await api.delete(`/settings/sessions/${id}`);
    return response.data;
  },

  async logoutAll(): Promise<{ message: string }> {
    const response = await api.post('/settings/logout-all');
    return response.data;
  },

  async backupNow(): Promise<{ group: string; values: AppSettings['backup'] }> {
    const response = await api.post('/settings/backup');
    return response.data;
  },

  /** Unduh file backup konfigurasi terbaru sebagai JSON. */
  async downloadBackup(): Promise<void> {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/settings/backup/download', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Gagal mengunduh backup.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_pengaturan_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async restoreBackup(file: File): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/settings/backup/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async testEmail(to?: string): Promise<{ status: 'sent' | 'failed'; message: string }> {
    const response = await api.post('/settings/test-email', { to });
    return response.data;
  },
};

/**
 * Endpoint publik — tidak memerlukan autentikasi.
 * Digunakan untuk menampilkan logo & nama aplikasi di halaman login
 * sebelum user masuk, sehingga tidak ada guard token yang bisa
 * menyebabkan logo "muncul sebentar lalu hilang".
 */

const BRANDING_CACHE_KEY = 'app_branding_cache';

export type BrandingData = { app_name: string | null; logo_path: string | null };

/** Baca cache branding dari localStorage (null jika belum ada / rusak). */
export function getBrandingCache(): BrandingData | null {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BrandingData;
  } catch {
    return null;
  }
}

export const brandingService = {
  async get(): Promise<BrandingData> {
    // Gunakan axios biasa (bukan instance `api`) agar interceptor 401
    // tidak memicu redirect ke /login saat request ini gagal.
    const response = await axios.get<BrandingData>('/api/branding');
    const data = response.data;
    // Simpan ke localStorage agar tersedia setelah hard refresh.
    try {
      localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(data));
    } catch {
      // localStorage penuh / mode private — abaikan saja.
    }
    return data;
  },
};
