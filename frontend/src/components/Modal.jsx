import { S, colors, fonts } from "../styles/theme";

export default function Modal({ title, onClose, children, maxWidth = 600 }) {
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div
        style={{ ...S.modal, maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: `1px solid ${colors.lagoon}33`,
          }}
        >
          <h2
            style={{
              fontFamily: fonts.display,
              color: colors.gold,
              fontSize: 22,
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: colors.foam,
              fontSize: 24,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
