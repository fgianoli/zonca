import api from "./client";

// ── Auth ──────────────────────────────────────────
export const authApi = {
  login: (email, password) => api.post("/api/auth/login", { email, password }),
  me: () => api.get("/api/auth/me"),
  register: (data) => api.post("/api/auth/register", data),
};

// ── Users (admin) ─────────────────────────────────
export const usersApi = {
  list: () => api.get("/api/users/"),
  get: (id) => api.get(`/api/users/${id}`),
  create: (data) => api.post("/api/users/", data),
  update: (id, data) => api.patch(`/api/users/${id}`, data),
  remove: (id) => api.delete(`/api/users/${id}`),
  resetPassword: (id, newPassword = null) =>
    api.post(`/api/users/${id}/reset-password`, { new_password: newPassword }),
  changeOwnPassword: (currentPassword, newPassword) =>
    api.post("/api/users/me/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    }),
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
  padova: () => api.get("/api/weather/padova"),
  laguna: () => api.get("/api/weather/laguna-venezia"),
  current: () => api.get("/api/weather/current"), // back-compat
};

// ── Crews ─────────────────────────────────────────
export const crewsApi = {
  list: () => api.get("/api/crews/"),
  get: (id) => api.get(`/api/crews/${id}`),
  create: (data) => api.post("/api/crews/", data),
  update: (id, data) => api.patch(`/api/crews/${id}`, data),
  remove: (id) => api.delete(`/api/crews/${id}`),
};

// ── Gallery ───────────────────────────────────────
export const galleryApi = {
  listAlbums: (params = {}) => api.get("/api/gallery/albums/", { params }),
  getAlbum: (id) => api.get(`/api/gallery/albums/${id}`),
  createAlbum: (data) => api.post("/api/gallery/albums/", data),
  updateAlbum: (id, data) => api.patch(`/api/gallery/albums/${id}`, data),
  removeAlbum: (id) => api.delete(`/api/gallery/albums/${id}`),
  uploadPhotos: (albumId, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return api.post(`/api/gallery/albums/${albumId}/photos`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  removePhoto: (photoId) => api.delete(`/api/gallery/photos/${photoId}`),
  setCover: (albumId, photoId) => api.post(`/api/gallery/albums/${albumId}/set-cover/${photoId}`),
};

// ── Email Templates ───────────────────────────────
export const emailTemplatesApi = {
  list: () => api.get("/api/email-templates/"),
  get: (key) => api.get(`/api/email-templates/${key}`),
  update: (key, data) => api.patch(`/api/email-templates/${key}`, data),
  seed: () => api.post("/api/email-templates/seed"),
  preview: (key, vars) => api.post(`/api/email-templates/${key}/preview`, { vars }),
};

// ── Invoices ──────────────────────────────────────
export const invoicesApi = {
  list: (params = {}) => api.get("/api/invoices/", { params }),
  get: (id) => api.get(`/api/invoices/${id}`),
  nextNumber: (year) => api.get("/api/invoices/next-number", { params: { year } }),
  create: (data) => api.post("/api/invoices/", data),
  fromFee: (feeId) => api.post(`/api/invoices/from-fee/${feeId}`),
  downloadPdf: (id) => api.get(`/api/invoices/${id}/pdf`, { responseType: "blob" }),
  remove: (id) => api.delete(`/api/invoices/${id}`),
};

// ── GDPR ──────────────────────────────────────────
export const gdprApi = {
  myData: () => api.get("/api/gdpr/my-data", { responseType: "blob" }),
  requestDelete: (reason) => api.post("/api/gdpr/delete-request", { reason, confirm: true }),
  listRequests: () => api.get("/api/gdpr/requests"),
  processRequest: (id) => api.post(`/api/gdpr/requests/${id}/process`),
};

// ── Backups ───────────────────────────────────────
export const backupsApi = {
  list: () => api.get("/api/backups/"),
  runNow: () => api.post("/api/backups/run-now"),
  download: (filename) => api.get(`/api/backups/${filename}/download`, { responseType: "blob" }),
  remove: (filename) => api.delete(`/api/backups/${filename}`),
};

// ── Contact ───────────────────────────────────────
export const contactApi = {
  send: (data) => api.post("/api/contact/", data),
};

// ── iCal ──────────────────────────────────────────
export const icalApi = {
  generateToken: () => api.post("/api/ical/token"),
  revokeToken: () => api.delete("/api/ical/token"),
};

// ── Exports ───────────────────────────────────────
export const exportsApi = {
  members: () => api.get("/api/export/members.csv", { responseType: "blob" }),
  fees: (year) => api.get("/api/export/fees.csv", { params: { year }, responseType: "blob" }),
  finance: (dateFrom, dateTo) =>
    api.get("/api/export/finance.csv", {
      params: { date_from: dateFrom, date_to: dateTo },
      responseType: "blob",
    }),
  attendance: (dateFrom, dateTo) =>
    api.get("/api/export/attendance.csv", {
      params: { date_from: dateFrom, date_to: dateTo },
      responseType: "blob",
    }),
  bookings: (dateFrom, dateTo) =>
    api.get("/api/export/bookings.csv", {
      params: { date_from: dateFrom, date_to: dateTo },
      responseType: "blob",
    }),
};

// ── Events ────────────────────────────────────────
export const eventsApi = {
  list: (params = {}) => api.get("/api/events/", { params }),
  listPublic: () => api.get("/api/events/public"),
  get: (id) => api.get(`/api/events/${id}`),
  create: (data) => api.post("/api/events/", data),
  update: (id, data) => api.patch(`/api/events/${id}`, data),
  remove: (id) => api.delete(`/api/events/${id}`),
  register: (eventId, data) => api.post(`/api/events/${eventId}/register`, data),
  unregister: (eventId, memberId) => api.delete(`/api/events/${eventId}/register/${memberId}`),
  confirmRegistration: (eventId, regId) => api.post(`/api/events/${eventId}/registrations/${regId}/confirm`),
};

// ── Maintenance ───────────────────────────────────
export const maintenanceApi = {
  list: (params = {}) => api.get("/api/maintenance/", { params }),
  byBoat: (boatId) => api.get(`/api/maintenance/boat/${boatId}`),
  create: (data) => api.post("/api/maintenance/", data),
  update: (id, data) => api.patch(`/api/maintenance/${id}`, data),
  remove: (id) => api.delete(`/api/maintenance/${id}`),
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
