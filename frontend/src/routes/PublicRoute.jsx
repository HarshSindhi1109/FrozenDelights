import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../services/api";

const PublicRoute = ({ children, redirectTo = "/customer/home" }) => {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("/auth/me");
        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

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

  if (isLoggedIn) return <Navigate to={redirectTo} replace />;

  return children;
};

export default PublicRoute;
