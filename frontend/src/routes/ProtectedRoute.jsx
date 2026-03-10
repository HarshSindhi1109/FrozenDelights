import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../services/api";

const ProtectedRoute = ({ children, role }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get("/auth/me");

        if (role && res.data.user.role !== role) {
          setAuthorized(false);
        } else {
          setAuthorized(true);
        }
      } catch {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [role]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffbf6",
          fontFamily: "DM Sans, sans-serif",
          color: "#b07090",
          fontSize: "0.9rem",
          fontWeight: 600,
        }}
      >
        🍦 Loading...
      </div>
    );
  }

  if (!authorized) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
