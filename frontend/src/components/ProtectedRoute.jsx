import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { colors } from "../styles/theme";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: colors.water,
          color: colors.foam,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
        }}
      >
        Caricamento...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/calendario" replace />;
  }

  return children;
}
