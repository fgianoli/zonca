// Modern Venetian Sky theme – light, vivace, arioso
export const colors = {
  // Backgrounds
  water: "#f8fbfd",    // sfondo principale, bianco con un filo di azzurro
  deep: "#ffffff",     // card / panel bianche pure
  panel: "#f1f7fa",    // pannelli alternati (hero, sezioni)

  // Testo
  foam: "#0f1f2e",     // primary text (quasi nero, caldo-freddo)
  muted: "#64748b",    // secondary text (slate-500)
  faint: "#94a3b8",    // tertiary / placeholder

  // Accenti Venezia (vivaci)
  lagoon: "#0891b2",   // cyan-600, azzurro laguna vibrante
  lagoonLight: "#22d3ee", // cyan-400
  lagoonDark: "#0e7490",  // cyan-700 per hover
  gold: "#d97706",     // amber-600, oro caldo
  goldLight: "#f59e0b",// amber-500
  red: "#dc2626",
  green: "#059669",
  orange: "#ea580c",

  // Strutturali
  border: "#e2e8f0",   // slate-200
  borderSoft: "#f1f5f9", // slate-100

  // Shadows colorate
  shadowLagoon: "0 6px 20px rgba(8, 145, 178, 0.10)",
  shadowGold: "0 6px 20px rgba(217, 119, 6, 0.12)",
  shadowSoft: "0 2px 8px rgba(15, 31, 46, 0.06)",
  shadowMed: "0 8px 24px rgba(15, 31, 46, 0.08)",
  shadowLg: "0 16px 48px rgba(15, 31, 46, 0.12)",

  // Gradients
  gradLagoon: "linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)",
  gradGold: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
  gradSky: "linear-gradient(180deg, #ecfeff 0%, #f8fbfd 50%, #ffffff 100%)",
  gradHero: "linear-gradient(135deg, #e0f2fe 0%, #f0fdfa 50%, #fffbeb 100%)",
};

export const fonts = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Inter', 'Lato', -apple-system, BlinkMacSystemFont, sans-serif",
};

// Shared UI styles
export const S = {
  // Bottoni
  btn: {
    padding: "11px 22px",
    background: colors.gradLagoon,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: "pointer",
    transition: "transform .15s ease, box-shadow .15s ease, opacity .15s ease",
    boxShadow: colors.shadowLagoon,
    letterSpacing: 0.2,
  },
  btnSmall: {
    padding: "7px 14px",
    fontSize: 12,
    borderRadius: 8,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: fonts.body,
    transition: "all .15s ease",
  },
  btnGold: {
    background: colors.gradGold,
    color: "#fff",
    boxShadow: colors.shadowGold,
  },
  btnRed: {
    backgroundColor: colors.red,
    color: "#fff",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.2)",
  },
  btnGreen: {
    backgroundColor: colors.green,
    color: "#fff",
    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.2)",
  },
  btnGhost: {
    background: "transparent",
    border: `1.5px solid ${colors.border}`,
    color: colors.foam,
    boxShadow: "none",
  },

  // Input
  input: {
    width: "100%",
    padding: "11px 14px",
    backgroundColor: "#fff",
    border: `1.5px solid ${colors.border}`,
    borderRadius: 10,
    color: colors.foam,
    fontSize: 14,
    fontFamily: fonts.body,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color .15s ease, box-shadow .15s ease",
  },
  label: {
    display: "block",
    color: colors.muted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: fonts.body,
    fontWeight: 600,
  },

  // Card
  card: {
    backgroundColor: colors.deep,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: 14,
    padding: 20,
    boxShadow: colors.shadowSoft,
  },
  cardElevated: {
    backgroundColor: colors.deep,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: 16,
    padding: 24,
    boxShadow: colors.shadowMed,
  },

  // Titoli
  title: {
    fontFamily: fonts.display,
    color: colors.foam,
    fontSize: 30,
    margin: 0,
    fontWeight: 700,
    letterSpacing: -0.5,
  },
  titleAccent: {
    fontFamily: fonts.display,
    color: colors.lagoon,
    fontSize: 30,
    margin: 0,
    fontWeight: 700,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
    fontWeight: 400,
  },

  // Badge
  badge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.3,
  },

  // Modali
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 31, 46, 0.45)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    backgroundColor: colors.deep,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: 18,
    padding: 32,
    maxWidth: 600,
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: colors.shadowLg,
  },

  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 24px",
  },
};

// Ruoli
export const RUOLI = {
  pope: { label: "Pope", badge: "PP", desc: "Capitano / Responsabile", color: "#d97706", icon: "⚓" },
  paron: { label: "Paron", badge: "PA", desc: "Proprietario barca", color: "#ea580c", icon: "🏛" },
  provin: { label: "Provin", badge: "PV", desc: "Vogatore", color: "#0891b2", icon: "🚣" },
  ospite: { label: "Ospite", badge: "OS", desc: "Non socio", color: "#64748b", icon: "👤" },
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
