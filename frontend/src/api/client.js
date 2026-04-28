import axios from "axios";

const api = axios.create({
  baseURL: "",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await axios.post("/api/auth/refresh", null, {
            params: { token: refresh },
          });
          localStorage.setItem("access_token", res.data.access_token);
          localStorage.setItem("refresh_token", res.data.refresh_token);
          original.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Estrae un messaggio leggibile da un errore axios.
 * Gestisce:
 *  - HTTPException FastAPI: detail = "stringa"
 *  - Validation 422 Pydantic: detail = [{ msg, loc, ... }]
 *  - Errori di rete (no response)
 * Ritorna sempre una STRINGA (mai un oggetto), così è renderizzabile
 * direttamente dentro un componente React senza crash error #31.
 */
export function getErrorMessage(error, fallback = "Errore") {
  if (!error) return fallback;
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        const where = Array.isArray(e?.loc) ? e.loc.filter((p) => p !== "body").join(".") : "";
        const msg = e?.msg || e?.message || "errore";
        return where ? `${where}: ${msg}` : msg;
      })
      .join(" · ");
  }
  if (typeof detail === "object" && detail !== null) {
    return detail.msg || JSON.stringify(detail);
  }
  if (error.message) return error.message;
  return fallback;
}

export default api;
