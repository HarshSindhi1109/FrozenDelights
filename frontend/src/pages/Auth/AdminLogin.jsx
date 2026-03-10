import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./AdminLogin.css";

const AdminLogin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", formData);
      const user = res.data.user;
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        setError("Access denied. Administrator credentials required.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm-page">
      {/* Grid background */}
      <div className="adm-grid" />

      {/* Glow orbs */}
      <div className="adm-orb adm-orb-1" />
      <div className="adm-orb adm-orb-2" />

      {/* Corner brackets */}
      <div className="adm-corner adm-corner-tl" />
      <div className="adm-corner adm-corner-tr" />
      <div className="adm-corner adm-corner-bl" />
      <div className="adm-corner adm-corner-br" />

      <div className="adm-wrapper">
        {/* Top identifier bar */}
        <div className="adm-topbar">
          <div className="adm-topbar-left">
            <div className="adm-topbar-dot" />
            <span>ADMIN CONTROL PANEL</span>
          </div>
        </div>

        <div className="adm-card">
          {/* Card top strip */}
          <div className="adm-card-strip" />

          <div className="adm-card-inner">
            {/* Logo area */}
            <div className="adm-logo-area">
              <div className="adm-logo-hex">
                <span className="adm-logo-icon">🍨</span>
              </div>
              <div className="adm-logo-text">
                <span className="adm-logo-brand">IceCream</span>
                <span className="adm-logo-scope">Administration</span>
              </div>
            </div>

            <div className="adm-divider-line" />

            <h2 className="adm-title">Secure Access</h2>
            <p className="adm-subtitle">Authorized personnel only</p>

            <form onSubmit={handleSubmit} className="adm-form">
              <div className="adm-field">
                <label className="adm-label" htmlFor="adm-email">
                  <span className="adm-label-marker">//</span> Administrator
                  Email
                </label>
                <div className="adm-input-wrap">
                  <input
                    className="adm-input"
                    id="adm-email"
                    type="email"
                    name="email"
                    placeholder="admin@icecream.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <div className="adm-input-border" />
                </div>
              </div>

              <div className="adm-field">
                <label className="adm-label" htmlFor="adm-password">
                  <span className="adm-label-marker">//</span> Access Code
                </label>
                <div className="adm-input-wrap">
                  <input
                    className="adm-input"
                    id="adm-password"
                    type="password"
                    name="password"
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <div className="adm-input-border" />
                </div>
              </div>

              {error && (
                <div className="adm-error">
                  <div className="adm-error-icon">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <span>{error}</span>
                </div>
              )}

              <button className="adm-btn" type="submit" disabled={loading}>
                {loading ? (
                  <span className="adm-btn-loading">
                    <span className="adm-spinner" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <span>Authenticate</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom status bar */}
          <div className="adm-statusbar">
            <span className="adm-statusbar-item">
              <span className="adm-status-active" />
              Encrypted
            </span>
            <span className="adm-statusbar-item">
              <span className="adm-status-active" />
              CSRF Protected
            </span>
            <span className="adm-statusbar-item">
              <span className="adm-status-active" />
              Rate Limited
            </span>
          </div>
        </div>

        <p className="adm-footer">
          Unauthorized access is prohibited and monitored.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
