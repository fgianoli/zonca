import api from "./client";

// ── Auth ──────────────────────────────────────────
export const authApi = {
  login: (email, password) => api.post("/api/auth/login", { email, password }),
  me: () => api.get("/api/auth/me"),
  register: (data) => api.post("/api/auth/register", data),
};

// ── Members ───────────────────────────────────────
export const membersApi = {
  list: (params = {}) => api.get("/api/members/", { params }),
  get: (id) => api.get(`/api/members/${id}`),
  create: (data) => api.post("/api/members/", data),
  update: (id, data) => api.patch(`/api/members/${id}`, data),
  remove: (id) => api.delete(`/api/members/${id}`),
  uploadMedicalCert: (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/api/members/${id}/medical-cert`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  downloadMedicalCert: (id) =>
    api.get(`/api/members/${id}/medical-cert`, { responseType: "blob" }),
};

// ── Documents ─────────────────────────────────────
export const documentsApi = {
  list: (memberId) => api.get(`/api/members/${memberId}/documents/`),
  upload: (memberId, file, docType, expiryDate = null, note = null) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", docType);
    if (expiryDate) fd.append("expiry_date", expiryDate);
    if (note) fd.append("note", note);
    return api.post(`/api/members/${memberId}/documents/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  download: (memberId, docId) =>
    api.get(`/api/members/${memberId}/documents/${docId}/download`, {
      responseType: "blob",
    }),
  remove: (memberId, docId) =>
    api.delete(`/api/members/${memberId}/documents/${docId}`),
};

// ── Boats ─────────────────────────────────────────
export const boatsApi = {
  list: (params = {}) => api.get("/api/boats/", { params }),
  get: (id) => api.get(`/api/boats/${id}`),
  create: (data) => api.post("/api/boats/", data),
  update: (id, data) => api.patch(`/api/boats/${id}`, data),
  remove: (id) => api.delete(`/api/boats/${id}`),
};

// ── Bookings ──────────────────────────────────────
export const bookingsApi = {
  list: (params = {}) => api.get("/api/bookings/", { params }),
  get: (id) => api.get(`/api/bookings/${id}`),
  create: (data) => api.post("/api/bookings/", data),
  update: (id, data) => api.patch(`/api/bookings/${id}`, data),
  confirm: (id) => api.post(`/api/bookings/${id}/confirm`),
  remove: (id) => api.delete(`/api/bookings/${id}`),
};

// ── Attendance ────────────────────────────────────
export const attendanceApi = {
  list: (params = {}) => api.get("/api/attendance/", { params }),
  bulk: (data) => api.post("/api/attendance/bulk", data),
  stats: (memberId, year) =>
    api.get(`/api/attendance/member/${memberId}/stats`, {
      params: year ? { year } : {},
    }),
  remove: (id) => api.delete(`/api/attendance/${id}`),
};

// ── Fees ──────────────────────────────────────────
export const feesApi = {
  list: (params = {}) => api.get("/api/fees/", { params }),
  create: (data) => api.post("/api/fees/", data),
  update: (id, data) => api.patch(`/api/fees/${id}`, data),
  remove: (id) => api.delete(`/api/fees/${id}`),
  summary: (year) => api.get("/api/fees/summary", { params: { year } }),
};

// ── Finance ───────────────────────────────────────
export const financeApi = {
  list: (params = {}) => api.get("/api/finance/", { params }),
  create: (data) => api.post("/api/finance/", data),
  update: (id, data) => api.patch(`/api/finance/${id}`, data),
  remove: (id) => api.delete(`/api/finance/${id}`),
  summary: (params = {}) => api.get("/api/finance/summary", { params }),
};

// ── Circulars ─────────────────────────────────────
export const circularsApi = {
  list: () => api.get("/api/circulars/"),
  get: (id) => api.get(`/api/circulars/${id}`),
  create: (data) => api.post("/api/circulars/", data),
};

// ── Dashboard ─────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get("/api/dashboard/stats"),
};

// ── Settings ──────────────────────────────────────
export const settingsApi = {
  getSmtp: () => api.get("/api/settings/smtp"),
  updateSmtp: (data) => api.patch("/api/settings/smtp", data),
  seedSmtp: () => api.post("/api/settings/smtp/seed"),
};

// ── Weather ───────────────────────────────────────
export const weatherApi = {
  current: () => api.get("/api/weather/current"),
};

// ── Contact ───────────────────────────────────────
export const contactApi = {
  send: (data) => api.post("/api/contact/", data),
};

// ── Helpers ───────────────────────────────────────
export const downloadBlob = (response, filename) => {
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
