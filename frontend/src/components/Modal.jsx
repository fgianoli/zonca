import { S, colors, fonts } from "../styles/theme";
import { useIsMobile } from "../hooks/useMediaQuery";

export default function Modal({ title, onClose, children, maxWidth = 600 }) {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        ...S.modalOverlay,
        padding: isMobile ? 10 : 20,
        alignItems: isMobile ? "flex-start" : "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...S.modal,
          maxWidth: isMobile ? "100%" : maxWidth,
          padding: isMobile ? 18 : 32,
          borderRadius: isMobile ? 12 : 18,
          marginTop: isMobile ? 8 : 0,
          maxHeight: isMobile ? "calc(100vh - 20px)" : "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: isMobile ? 16 : 24,
            paddingBottom: isMobile ? 10 : 16,
            borderBottom: `1px solid ${colors.lagoon}33`,
          }}
        >
          <h2
            style={{
              fontFamily: fonts.display,
              color: colors.gold,
              fontSize: isMobile ? 18 : 22,
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
