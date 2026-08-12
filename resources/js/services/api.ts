import api from '@/lib/api';
import type { MemorizationStatus, User, LoginResponse } from '@/types';

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
  async list(params?: { page?: number; per_page?: number; search?: string }) {
    const response = await api.get('/teachers', { params });
    return response.data;
  },

  async get(id: number) {
    const response = await api.get(`/teachers/${id}`);
    return response.data;
  },

  async create(data: {
    teacher_code: string;
    name: string;
    nip?: string;
    phone?: string;
    email?: string;
  }) {
    const response = await api.post('/teachers', data);
    return response.data;
  },

  async update(id: number, data: Partial<{
    teacher_code: string;
    name: string;
    nip: string;
    phone: string;
    email: string;
    status: string;
  }>) {
    const response = await api.put(`/teachers/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/teachers/${id}`);
  },
};

export const studentService = {
  async list(params?: { page?: number; per_page?: number; search?: string; class_id?: number }) {
    const response = await api.get('/students', { params });
    return response.data;
  },

  async get(id: number) {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  async create(data: {
    student_code: string;
    name: string;
    nis?: string;
    nisn?: string;
    gender: 'L' | 'P';
    birth_place?: string;
    birth_date?: string;
    class_id: number;
    academic_year_id: number;
  }) {
    const response = await api.post('/students', data);
    return response.data;
  },

  async update(id: number, data: Partial<{
    student_code: string;
    name: string;
    nis: string;
    nisn: string;
    gender: 'L' | 'P';
    birth_place: string;
    birth_date: string;
    class_id: number;
    academic_year_id: number;
    status: string;
  }>) {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/students/${id}`);
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
  async surahs(params?: { juz_number?: number }) {
    const response = await api.get('/quran/surahs', { params });
    return response.data;
  },

  async ayahs(surahId: number, params?: { from?: number; to?: number; paged?: boolean; per_page?: number }) {
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
    student_id?: number;
    surah_id?: number;
    academic_year_id?: number;
    from?: string;
    to?: string;
  }) {
    const response = await api.get('/submissions', { params });
    return response.data;
  },

  async create(data: {
    student_id: number;
    teacher_id?: number;
    submission_date: string;
    surah_id: number;
    start_ayah: number;
    end_ayah: number;
    type: 'new_memorization' | 'repetition';
    fluency_score: number;
    tajwid_score: number;
    makhraj_score: number;
    fashahah_score: number;
    notes?: string;
  }) {
    const response = await api.post('/submissions', data);
    return response.data;
  },

  async update(id: number, data: {
    student_id: number;
    submission_date: string;
    surah_id: number;
    start_ayah: number;
    end_ayah: number;
    type: 'new_memorization' | 'repetition';
    fluency_score: number;
    tajwid_score: number;
    makhraj_score: number;
    fashahah_score: number;
    notes?: string;
  }) {
    const response = await api.put(`/submissions/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/submissions/${id}`);
  },
};

export const murajaahService = {
  async list(params?: { page?: number; per_page?: number; student_id?: number; surah_id?: number; academic_year_id?: number }) {
    const response = await api.get('/murajaahs', { params });
    return response.data;
  },

  async create(data: {
    student_id: number;
    teacher_id?: number;
    date: string;
    surah_id: number;
    start_ayah: number;
    end_ayah: number;
    fluency_score: number;
    tajwid_score: number;
    makhraj_score: number;
    fashahah_score: number;
    status: 'LANCAR' | 'PERLU_MUROJAAH';
    notes?: string;
  }) {
    const response = await api.post('/murajaahs', data);
    return response.data;
  },

  async update(id: number, data: {
    student_id: number;
    date: string;
    surah_id: number;
    start_ayah: number;
    end_ayah: number;
    fluency_score: number;
    tajwid_score: number;
    makhraj_score: number;
    fashahah_score: number;
    status: 'LANCAR' | 'PERLU_MUROJAAH';
    notes?: string;
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
};

export const progressService = {
  async list(params?: { page?: number; per_page?: number; class_id?: number }) {
    const response = await api.get('/progress', { params });
    return response.data;
  },

  async show(studentId: number) {
    const response = await api.get(`/progress/${studentId}`);
    return response.data;
  },
};
