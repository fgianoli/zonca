import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { colors, fonts, S } from "../styles/theme";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/calendario");
    } catch (err) {
      setError(err.response?.data?.detail || "Errore di accesso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.water,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: fonts.body,
      }}
    >
      <div
        style={{
          backgroundColor: colors.deep,
          borderRadius: 16,
          padding: 40,
          maxWidth: 420,
          width: "100%",
          border: `1px solid ${colors.lagoon}33`,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src="/logo_zonca.png"
            alt="Zonca"
            style={{
              height: 100,
              width: "auto",
              objectFit: "contain",
              marginBottom: 16,
            }}
          />
          <h1
            style={{
              fontFamily: fonts.display,
              color: colors.gold,
              fontSize: 26,
              margin: 0,
            }}
          >
            Remiera Zonca
          </h1>
          <p style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
            Accedi al gestionale
          </p>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Email</label>
            <input
              style={S.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={S.label}>Password</label>
            <input
              style={S.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div
              style={{
                padding: 12,
                backgroundColor: colors.red + "22",
                border: `1px solid ${colors.red}`,
                borderRadius: 6,
                color: colors.red,
                fontSize: 13,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...S.btn,
              width: "100%",
              padding: "12px",
              opacity: loading ? 0.5 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            paddingTop: 24,
            borderTop: `1px solid ${colors.lagoon}33`,
            textAlign: "center",
            color: colors.muted,
            fontSize: 12,
          }}
        >
          <a href="/" style={{ color: colors.lagoon, textDecoration: "none" }}>
            ← Torna alla homepage
          </a>
        </div>
      </div>
    </div>
  );
}
