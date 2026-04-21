// Light Venetian theme - easier to read
export const colors = {
  // Backgrounds (chiari)
  water: "#f5f1ea",   // sand / cream background principale
  deep: "#ffffff",    // card / panel background
  panel: "#faf7f2",   // alternate panel (subtle ivory)

  // Testo
  foam: "#1a3a4a",    // primary text (dark teal)
  muted: "#6b7f8c",   // secondary text

  // Accenti Venezia
  lagoon: "#2d7d9a",  // primary action (teal)
  gold: "#b8822f",    // headers / highlights (un po' piu scuro per contrasto su bg chiaro)
  red: "#c0392b",     // destructive
  green: "#16a34a",   // success
  orange: "#d35400",  // warning

  // Bordi
  border: "#d9d0c0",  // neutral beige border
  borderSoft: "#e9e2d4",
};

export const fonts = {
  display: "'Playfair Display', serif",
  body: "'Lato', sans-serif",
};

// Shared UI styles
export const S = {
  btn: {
    padding: "10px 20px",
    backgroundColor: colors.lagoon,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: fonts.body,
    cursor: "pointer",
    transition: "opacity .2s, background-color .2s",
  },
  btnSmall: {
    padding: "6px 12px",
    fontSize: 12,
    borderRadius: 6,
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: fonts.body,
  },
  btnGold: {
    backgroundColor: colors.gold,
    color: "#fff",
  },
  btnRed: {
    backgroundColor: colors.red,
    color: "#fff",
  },
  btnGreen: {
    backgroundColor: colors.green,
    color: "#fff",
  },
  btnGhost: {
    backgroundColor: "transparent",
    border: `1px solid ${colors.border}`,
    color: colors.foam,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: "#fff",
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    color: colors.foam,
    fontSize: 14,
    fontFamily: fonts.body,
    outline: "none",
    boxSizing: "border-box",
  },
  label: {
    display: "block",
    color: colors.muted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: fonts.body,
    fontWeight: 700,
  },
  card: {
    backgroundColor: colors.deep,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 1px 3px rgba(26, 58, 74, 0.06)",
  },
  title: {
    fontFamily: fonts.display,
    color: colors.gold,
    fontSize: 28,
    margin: 0,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(26, 58, 74, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    backgroundColor: colors.deep,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 32,
    maxWidth: 600,
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 10px 30px rgba(26, 58, 74, 0.2)",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px 20px",
  },
};

// Ruoli/tipi info
export const RUOLI = {
  pope: { label: "Pope", badge: "PP", desc: "Capitano / Responsabile", color: "#b8822f", icon: "⚓" },
  paron: { label: "Paron", badge: "PA", desc: "Proprietario barca", color: "#d35400", icon: "🏛" },
  provin: { label: "Provin", badge: "PV", desc: "Vogatore", color: "#2d7d9a", icon: "🚣" },
  ospite: { label: "Ospite", badge: "OS", desc: "Non socio", color: "#6b7f8c", icon: "👤" },
};

export const TIPI_BARCA = {
  mascareta: { label: "Mascareta", icon: "🛶", seats: 1 },
  "sandolo-w": { label: "Sandolo W", icon: "🚤", seats: 2 },
  "sandolo-4": { label: "Sandolo 4", icon: "⛵", seats: 4 },
  "gondolino-4": { label: "Gondolino 4", icon: "🛥", seats: 4 },
  "caorlina-6": { label: "Caorlina 6", icon: "🚣", seats: 6 },
  altro: { label: "Altro", icon: "⛵", seats: 2 },
};

export const SLOTS = ["06:00", "07:30", "09:00", "10:30", "14:00", "15:30", "17:00", "18:30"];

export const DAYS_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

// Helpers
export const todayStr = () => new Date().toISOString().split("T")[0];

export const getDays = (baseDate) => {
  const days = [];
  const monday = new Date(baseDate);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const formatEuro = (amount) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amount || 0);
