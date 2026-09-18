const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

/** Authorization header for raw `fetch` calls (uploads / audio binaries). */
function authHeader(): Record<string, string> {
  const token = localStorage.getItem('lp-auth-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeader(),
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'request-failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  baseURL: (): string => API_BASE,
  auth: {
    signup: (data: { email: string; password: string; name: string; role: string; inviteCode?: string }) =>
      request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string; inviteCode?: string }) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
    providers: () => request('/auth/providers'),
    setPassword: (data: { token: string; password: string }) =>
      request('/auth/set-password', { method: 'POST', body: JSON.stringify(data) }),
  },
  users: {
    me: () => request('/users/me'),
    get: (id: string) => request(`/users/${id}`),
  },
   learning: {
    recordEvent: (event: any) => request('/learning/events', { method: 'POST', body: JSON.stringify(event) }),
    getEvents: (limit?: number) => request(`/learning/events?limit=${limit || 100}`),
    upsertMastery: (record: any) => request('/learning/mastery', { method: 'POST', body: JSON.stringify(record) }),
    getMastery: () => request('/learning/mastery'),
    getProgress: () => request('/learning/progress'),
    listPlans: () => request('/learning/plans'),
    upsertPlan: (plan: any) => request('/learning/plans', { method: 'POST', body: JSON.stringify(plan) }),
    updatePlan: (id: string, data: any) => request(`/learning/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    saveExamResult: (result: any) => request('/learning/exam-results', { method: 'POST', body: JSON.stringify(result) }),
    getExamResults: () => request('/learning/exam-results'),
    awardXp: (data: any) => request('/learning/xp', { method: 'POST', body: JSON.stringify(data) }),
    getXp: () => request('/learning/xp'),
  },
  classrooms: {
    list: () => request('/classrooms'),
    get: (id: string) => request(`/classrooms/${id}`),
    create: (data: any) => request('/classrooms', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/classrooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => request(`/classrooms/${id}`, { method: 'DELETE' }),
    addStudent: (id: string, email: string) => request(`/classrooms/${id}/students`, { method: 'POST', body: JSON.stringify({ email }) }),
    removeStudent: (id: string, studentId: string) => request(`/classrooms/${id}/students/${studentId}`, { method: 'DELETE' }),
    join: (id: string) => request(`/classrooms/${id}/join`, { method: 'POST' }),
    leave: (id: string) => request(`/classrooms/${id}/leave`, { method: 'POST' }),
    analytics: (id: string) => request(`/classrooms/${id}/analytics`),
  },
  assignments: {
    list: (classroomId?: string) => request(`/assignments${classroomId ? `?classroomId=${classroomId}` : ''}`),
    get: (id: string) => request(`/assignments/${id}`),
    create: (data: any) => request('/assignments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    publish: (id: string) => request(`/assignments/${id}/publish`, { method: 'POST' }),
    remove: (id: string) => request(`/assignments/${id}`, { method: 'DELETE' }),
    submit: (id: string, data: any) => request(`/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),
    listSubmissions: (id: string) => request(`/assignments/${id}/submissions`),
    grade: (assignmentId: string, submissionId: string, data: any) =>
      request(`/assignments/${assignmentId}/submissions/${submissionId}/grade`, { method: 'POST', body: JSON.stringify(data) }),
  },
  courses: {
    list: (params?: any) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/courses${qs}`);
    },
    get: (id: string) => request(`/courses/${id}`),
    create: (data: any) => request('/courses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => request(`/courses/${id}`, { method: 'DELETE' }),
    enroll: (id: string) => request(`/courses/${id}/enroll`, { method: 'POST' }),
    unenroll: (id: string) => request(`/courses/${id}/unenroll`, { method: 'POST' }),
    listEnrollments: (id: string) => request(`/courses/${id}/enrollments`),
  },
  assessments: {
    listQuestions: (params?: any) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/assessments/questions${qs}`);
    },
    getQuestion: (id: string) => request(`/assessments/questions/${id}`),
    createQuestion: (data: any) => request('/assessments/questions', { method: 'POST', body: JSON.stringify(data) }),
    list: (params?: any) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/assessments${qs}`);
    },
    get: (id: string) => request(`/assessments/${id}`),
    create: (data: any) => request('/assessments', { method: 'POST', body: JSON.stringify(data) }),
    recordAttempt: (data: any) => request('/assessments/attempts', { method: 'POST', body: JSON.stringify(data) }),
    listMyAttempts: () => request('/assessments/attempts/me'),
  },
  notifications: {
    list: () => request('/notifications'),
    markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
  },
  files: {
    upload: (form: FormData) =>
      fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        headers: localStorage.getItem('lp-auth-token')
          ? { Authorization: `Bearer ${localStorage.getItem('lp-auth-token')}` }
          : {},
        body: form,
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({} as any))).error || `HTTP ${res.status}`);
        return res.json();
      }),
    register: (data: any) => request('/files/register', { method: 'POST', body: JSON.stringify(data) }),
    list: (params?: any) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/files${qs}`);
    },
    get: (id: string) => request(`/files/${id}`),
    remove: (id: string) => request(`/files/${id}`, { method: 'DELETE' }),
  },
  admin: {
    listUsers: (params?: any) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/admin/users${qs}`);
    },
    getUser: (id: string) => request(`/admin/users/${id}`),
    updateUser: (id: string, data: any) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id: string) => request(`/admin/users/${id}`, { method: 'DELETE' }),
    getStats: () => request('/admin/stats'),
    listAuditLogs: (limit?: number) => request(`/admin/audit-logs${limit ? `?limit=${limit}` : ''}`),
  },
  owner: {
    changeRole: (id: string, role: string) => request(`/owner/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
    // Admin invite / security codes (Owner-issued, required by Admin login).
    inviteCodes: () => request('/owner/invite-codes'),
    createInviteCode: (data: { code?: string; label?: string; maxUses?: number; expiresAt?: string | null }) =>
      request('/owner/invite-codes', { method: 'POST', body: JSON.stringify(data) }),
    updateInviteCode: (id: string, data: { active?: boolean; maxUses?: number; expiresAt?: string | null; label?: string | null }) =>
      request(`/owner/invite-codes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteInviteCode: (id: string) => request(`/owner/invite-codes/${id}`, { method: 'DELETE' }),
    listFeatureFlags: () => request('/owner/feature-flags'),
    updateFeatureFlag: (key: string, data: any) => request(`/owner/feature-flags/${key}`, { method: 'PUT', body: JSON.stringify(data) }),
    getAiGatewayPolicy: () => request('/owner/ai-gateway-policy'),
    updateAiGatewayPolicy: (id: string, data: any) => request(`/owner/ai-gateway-policy/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    listOrganizations: () => request('/owner/organizations'),
    createOrganization: (data: any) => request('/owner/organizations', { method: 'POST', body: JSON.stringify(data) }),
  },
  privacy: {
    getConsents: () => request('/privacy/consents'),
    setConsent: (category: string, data: any) => request(`/privacy/consents/${category}`, { method: 'PUT', body: JSON.stringify(data) }),
    revokeConsent: (category: string) => request(`/privacy/consents/${category}`, { method: 'DELETE' }),
    getPreferences: () => request('/privacy/preferences'),
    updatePreferences: (data: any) => request('/privacy/preferences', { method: 'PUT', body: JSON.stringify(data) }),
    exportData: () => request('/privacy/export'),
    deleteAccount: () => request('/privacy/account', { method: 'DELETE' }),
  },
  rag: {
    ask: (question: string, courseId: string) =>
      request('/rag/ask', { method: 'POST', body: JSON.stringify({ question, courseId }) }),
    status: (courseId: string) => request(`/rag/status/${courseId}`),
  },
  sandbox: {
    validate: (data: { language: 'js' | 'python'; code: string; timeoutMs?: number }) =>
      request('/sandbox/validate', { method: 'POST', body: JSON.stringify(data) }),
    run: (data: { language: 'js' | 'python'; code: string; timeoutMs?: number; stdin?: string }) =>
      request('/sandbox/run', { method: 'POST', body: JSON.stringify(data) }),
    listRuns: (limit?: number) => request(`/sandbox/runs${limit ? `?limit=${limit}` : ''}`),
    getRun: (id: string) => request(`/sandbox/runs/${id}`),
  },
  voice: {
    createSession: (language: 'en' | 'ar') =>
      request('/voice/sessions', { method: 'POST', body: JSON.stringify({ language }) }),
    listSessions: () => request('/voice/sessions'),
    getSession: (id: string) => request(`/voice/sessions/${id}`),
    appendTranscript: (id: string, text: string, lang: 'en' | 'ar') =>
      request(`/voice/sessions/${id}/transcript`, { method: 'POST', body: JSON.stringify({ text, lang }) }),
    appendAnswer: (id: string, content: string, latencyMs?: number) =>
      request(`/voice/sessions/${id}/answer`, { method: 'POST', body: JSON.stringify({ content, latencyMs }) }),
    closeSession: (id: string, summary?: string) =>
      request(`/voice/sessions/${id}/close`, { method: 'POST', body: JSON.stringify({ summary }) }),
    summary: (id: string) => request(`/voice/summary/${id}`),
    /** Server-side STT: multipart upload, returns { text, provider }. */
    transcribe: (blob: Blob, lang: 'en' | 'ar', filename = 'audio.webm') => {
      const form = new FormData();
      form.append('audio', blob, filename);
      form.append('lang', lang);
      return fetch(`${API_BASE}/voice/transcribe`, { method: 'POST', headers: authHeader(), body: form }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({} as { error?: string }))).error || `HTTP ${res.status}`);
        return res.json();
      });
    },
    /** Server-side TTS: returns a playable object URL, or null when unavailable. */
    synthesize: async (text: string, lang: 'en' | 'ar'): Promise<string | null> => {
      const res = await fetch(`${API_BASE}/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) return null;
      return URL.createObjectURL(await res.blob());
    },
  },
  collab: {
    createRoom: (data: { kind: string; title: string; courseId?: string; privacy?: string; language?: 'en' | 'ar' }) =>
      request('/collab/rooms', { method: 'POST', body: JSON.stringify(data) }),
    listRooms: (params?: { kind?: string; status?: string; limit?: number }) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
      ).toString() : '';
      return request(`/collab/rooms${qs}`);
    },
    getRoom: (id: string) => request(`/collab/rooms/${id}`),
    join: (id: string, data: { code?: string; name?: string } = {}) =>
      request(`/collab/rooms/${id}/join`, { method: 'POST', body: JSON.stringify(data) }),
    start: (id: string) => request(`/collab/rooms/${id}/start`, { method: 'POST' }),
    award: (id: string, userId: string, points: number) =>
      request(`/collab/rooms/${id}/award`, { method: 'POST', body: JSON.stringify({ userId, points }) }),
    finish: (id: string) => request(`/collab/rooms/${id}/finish`, { method: 'POST' }),
    listMessages: (id: string) => request(`/collab/rooms/${id}/messages`),
    postMessage: (id: string, content: string, kind: 'CHAT' | 'SYSTEM' | 'SCORE' = 'CHAT') =>
      request(`/collab/rooms/${id}/messages`, { method: 'POST', body: JSON.stringify({ content, kind }) }),
  },
};
