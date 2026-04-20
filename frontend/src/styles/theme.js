export const colors = {
  water: "#1a3a4a",
  deep: "#0d2535",
  foam: "#e8f4f8",
  lagoon: "#2d7d9a",
  gold: "#c8963e",
  red: "#c0392b",
  green: "#27ae60",
  muted: "#6b8fa3",
  orange: "#d35400",
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
    transition: "opacity .2s",
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
    color: colors.deep,
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
    border: `1px solid ${colors.lagoon}`,
    color: colors.foam,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: colors.deep,
    border: `1px solid ${colors.lagoon}44`,
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
  },
  card: {
    backgroundColor: colors.deep,
    border: `1px solid ${colors.lagoon}33`,
    borderRadius: 12,
    padding: 20,
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
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    backgroundColor: colors.water,
    border: `1px solid ${colors.lagoon}`,
    borderRadius: 12,
    padding: 32,
    maxWidth: 600,
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px 20px",
  },
};

// Ruoli/tipi info
export const RUOLI = {
  pope: { label: "Pope", badge: "PP", desc: "Capitano / Responsabile", color: colors.gold, icon: "⚓" },
  paron: { label: "Paron", badge: "PA", desc: "Proprietario barca", color: colors.orange, icon: "🏛" },
  provin: { label: "Provin", badge: "PV", desc: "Vogatore", color: colors.lagoon, icon: "🚣" },
  ospite: { label: "Ospite", badge: "OS", desc: "Non socio", color: colors.muted, icon: "👤" },
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
