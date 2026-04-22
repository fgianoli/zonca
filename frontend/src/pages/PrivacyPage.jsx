import { colors, fonts, S } from "../styles/theme";

const sections = [
  {
    icon: "🏛",
    title: "Titolare del trattamento",
    body: (
      <>
        <p style={{ margin: "0 0 6px 0" }}>
          <strong>Scuola Padovana di Voga alla Veneta "Vittorio Zonca" ASD</strong>
        </p>
        <p style={{ margin: "0 0 4px 0" }}>Corso Garibaldi 41, 35131 Padova (PD)</p>
        <p style={{ margin: 0 }}>
          Email:{" "}
          <a
            href="mailto:scuolazonca@gmail.com"
            style={{ color: colors.lagoon, fontWeight: 600 }}
          >
            scuolazonca@gmail.com
          </a>
        </p>
      </>
    ),
  },
  {
    icon: "📇",
    title: "Dati personali raccolti",
    body: (
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
        <li>Dati anagrafici dei soci (nome, cognome, tessera, data di nascita)</li>
        <li>Recapiti (email, telefono)</li>
        <li>Certificato medico sportivo e relativa scadenza</li>
        <li>Documenti associativi (privacy, assicurazione, tessere UISP/FIC)</li>
        <li>Dati sui pagamenti delle quote associative</li>
        <li>Registro delle presenze e prenotazioni delle uscite in barca</li>
        <li>Fotografie pubblicate nella gallery interna dell'associazione</li>
      </ul>
    ),
  },
  {
    icon: "🎯",
    title: "Finalità del trattamento",
    body: (
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
        <li>Gestione del rapporto associativo e delle attività sportive</li>
        <li>Comunicazioni interne (circolari, eventi, convocazioni)</li>
        <li>Adempimenti amministrativi, contabili e fiscali</li>
        <li>Tesseramento presso le federazioni sportive di riferimento</li>
        <li>Sicurezza dei partecipanti (verifica certificato medico valido)</li>
      </ul>
    ),
  },
  {
    icon: "⚖️",
    title: "Base giuridica",
    body: (
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
        <li>
          <strong>Esecuzione del contratto associativo</strong> — art. 6.1.b GDPR
        </li>
        <li>
          <strong>Obbligo legale</strong> — art. 6.1.c GDPR (adempimenti fiscali e sportivi)
        </li>
        <li>
          <strong>Consenso</strong> — art. 6.1.a GDPR (per la pubblicazione di foto nella
          gallery, revocabile in ogni momento)
        </li>
      </ul>
    ),
  },
  {
    icon: "📆",
    title: "Periodo di conservazione",
    body: (
      <p style={{ margin: 0, lineHeight: 1.7 }}>
        I dati vengono conservati per tutta la durata del rapporto associativo e, successivamente,
        per un periodo di <strong>10 anni</strong> per adempiere agli obblighi fiscali e
        contabili previsti dalla normativa vigente. Le fotografie vengono conservate fino a
        revoca del consenso.
      </p>
    ),
  },
  {
    icon: "🤝",
    title: "Destinatari dei dati",
    body: (
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
        <li>Membri del Consiglio Direttivo dell'associazione</li>
        <li>Federazioni sportive (UISP e/o FIC) limitatamente al tesseramento</li>
        <li>Consulenti amministrativi/fiscali vincolati da segreto professionale</li>
        <li>Autorità competenti in caso di richieste legittime</li>
      </ul>
    ),
  },
  {
    icon: "🌍",
    title: "Trasferimento extra-UE",
    body: (
      <p style={{ margin: 0, lineHeight: 1.7 }}>
        I dati personali <strong>non vengono trasferiti al di fuori dell'Unione Europea</strong>.
      </p>
    ),
  },
  {
    icon: "🛡",
    title: "I tuoi diritti",
    body: (
      <>
        <p style={{ margin: "0 0 10px 0", lineHeight: 1.7 }}>
          Ai sensi degli articoli 15-22 del GDPR hai diritto di:
        </p>
        <ul style={{ margin: "0 0 12px 0", paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Accedere ai tuoi dati personali</li>
          <li>Chiederne la rettifica o l'aggiornamento</li>
          <li>Chiederne la cancellazione (diritto all'oblio)</li>
          <li>Limitare o opporti al trattamento</li>
          <li>Ricevere i tuoi dati in formato portabile</li>
          <li>Revocare il consenso in qualsiasi momento</li>
        </ul>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          Puoi esercitare questi diritti dall'
          <a
            href="/profilo"
            style={{ color: colors.lagoon, fontWeight: 600 }}
          >
            area riservata → sezione GDPR
          </a>
          {"  "}
          oppure scrivendo a{" "}
          <a
            href="mailto:scuolazonca@gmail.com"
            style={{ color: colors.lagoon, fontWeight: 600 }}
          >
            scuolazonca@gmail.com
          </a>
          .
        </p>
      </>
    ),
  },
  {
    icon: "📣",
    title: "Reclami",
    body: (
      <p style={{ margin: 0, lineHeight: 1.7 }}>
        Hai il diritto di proporre reclamo al{" "}
        <a
          href="https://www.garanteprivacy.it/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: colors.lagoon, fontWeight: 600 }}
        >
          Garante per la Protezione dei Dati Personali
        </a>{" "}
        italiano se ritieni che il trattamento dei tuoi dati violi il GDPR.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.water,
        color: colors.foam,
        fontFamily: fonts.body,
      }}
    >
      <header
        style={{
          background: colors.gradHero,
          padding: "56px 20px 40px",
          borderBottom: `1px solid ${colors.borderSoft}`,
          textAlign: "center",
        }}
      >
        <a
          href="/"
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            color: colors.lagoon,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          ← Torna alla home
        </a>
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: 42,
            margin: 0,
            fontWeight: 700,
            letterSpacing: -0.5,
            color: colors.foam,
          }}
        >
          Privacy <span style={{ color: colors.lagoon }}>Policy</span>
        </h1>
        <p style={{ color: colors.muted, marginTop: 10, fontSize: 15 }}>
          Informativa ai sensi del Regolamento UE 2016/679 (GDPR)
        </p>
      </header>

      <main style={{ ...S.container, maxWidth: 860 }}>
        <div
          style={{
            ...S.card,
            background: `${colors.lagoon}10`,
            border: `1px solid ${colors.lagoon}44`,
            marginBottom: 20,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          La presente informativa descrive come la Scuola Padovana di Voga alla Veneta "Vittorio
          Zonca" ASD tratta i dati personali dei soci, degli ospiti e dei visitatori del
          gestionale online, nel rispetto della normativa vigente in materia di protezione dei
          dati personali.
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {sections.map((s, i) => (
            <section key={i} style={{ ...S.card }}>
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  margin: "0 0 12px 0",
                  color: colors.lagoon,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 24 }}>{s.icon}</span> {s.title}
              </h2>
              <div style={{ color: colors.foam, fontSize: 14 }}>{s.body}</div>
            </section>
          ))}
        </div>

        <div
          style={{
            marginTop: 28,
            textAlign: "center",
            color: colors.muted,
            fontSize: 12,
          }}
        >
          Ultimo aggiornamento:{" "}
          {new Date().toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </div>
      </main>
    </div>
  );
}
