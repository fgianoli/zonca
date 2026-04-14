import { colors, fonts } from "../styles/theme";

const S = {
  section: {
    maxWidth: 600,
    margin: "0 auto",
    padding: "40px 20px 0",
  },
  title: {
    fontFamily: fonts.display,
    color: colors.gold,
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 24,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    backgroundColor: colors.deep,
    border: `1px solid ${colors.lagoon}33`,
    borderRadius: 12,
    padding: "24px 28px",
  },
  icon: {
    fontSize: 40,
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  cardTitle: {
    color: colors.foam,
    fontSize: 16,
    fontWeight: 700,
    margin: 0,
  },
  cardDesc: {
    color: colors.muted,
    fontSize: 13,
    margin: "4px 0 0",
  },
  btn: {
    display: "inline-block",
    padding: "10px 24px",
    backgroundColor: colors.gold,
    color: colors.deep,
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: fonts.body,
    textDecoration: "none",
    cursor: "pointer",
    flexShrink: 0,
    transition: "opacity .2s",
  },
};

export default function DownloadAdesione() {
  return (
    <section style={S.section}>
      <h2 style={S.title}>Diventa Socio</h2>
      <p style={S.subtitle}>
        Scarica il modulo di richiesta adesione, compilalo e consegnalo in sede.
      </p>
      <div style={S.card}>
        <div style={S.icon}>📄</div>
        <div style={S.info}>
          <p style={S.cardTitle}>Modulo Richiesta Adesione Socio</p>
          <p style={S.cardDesc}>
            Scuola Padovana di Voga alla Veneta "Vittorio Zonca" — PDF
          </p>
        </div>
        <a
          href="/Modulo_Adesione_Socio.pdf"
          download="Modulo_Adesione_Socio_Zonca.pdf"
          style={S.btn}
        >
          Scarica PDF
        </a>
      </div>
    </section>
  );
}
