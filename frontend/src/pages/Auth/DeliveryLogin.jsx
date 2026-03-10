import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import "./DeliveryLogin.css";
import GoogleAuthButton from "../../components/common/GoogleAuthButton";

const DeliveryLogin = () => {
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
      if (user.role === "delivery_man") {
        navigate("/delivery/dashboard");
      } else {
        setError("Access denied. Delivery personnel only.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dl-page">
      <div className="dl-road">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="dl-road-dash"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>

      <div className="dl-noise" />

      <div className="dl-container">
        <div className="dl-left">
          <div className="dl-badge">
            <span className="dl-badge-icon">🛵</span>
          </div>
          <h1 className="dl-brand">
            <span className="dl-brand-top">DELIVERY</span>
            <span className="dl-brand-bottom">PORTAL</span>
          </h1>
          <p className="dl-tagline">
            Every delivery,
            <br />a mission complete.
          </p>
          <div className="dl-stats">
            <div className="dl-stat">
              <span className="dl-stat-num">24/7</span>
              <span className="dl-stat-label">On Duty</span>
            </div>
            <div className="dl-stat-divider" />
            <div className="dl-stat">
              <span className="dl-stat-num">🍦</span>
              <span className="dl-stat-label">Ice Cold</span>
            </div>
            <div className="dl-stat-divider" />
            <div className="dl-stat">
              <span className="dl-stat-num">100%</span>
              <span className="dl-stat-label">Hustle</span>
            </div>
          </div>
        </div>

        <div className="dl-card">
          <div className="dl-card-header">
            <div className="dl-status-dot" />
            <span className="dl-status-text">RIDER ACCESS</span>
          </div>

          <h2 className="dl-title">Sign In</h2>
          <p className="dl-subtitle">Clock in and hit the road</p>

          <form onSubmit={handleSubmit} className="dl-form">
            <div className="dl-field">
              <label className="dl-label" htmlFor="email">
                Email Address
              </label>
              <div className="dl-input-wrap">
                <span className="dl-input-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  className="dl-input"
                  id="email"
                  type="email"
                  name="email"
                  placeholder="rider@icecream.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="dl-field">
              <label className="dl-label" htmlFor="password">
                Password
              </label>
              <div className="dl-input-wrap">
                <span className="dl-input-icon">
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
                </span>
                <input
                  className="dl-input"
                  id="password"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="dl-error">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button className="dl-btn" type="submit" disabled={loading}>
              <span className="dl-btn-text">
                {loading ? "Checking credentials..." : "Start My Shift"}
              </span>
              {!loading && (
                <span className="dl-btn-arrow">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          <div className="ic-divider">or</div>

          <GoogleAuthButton
            onSuccess={(user) => {
              if (user.role === "delivery_man") navigate("/delivery/dashboard");
              else setError("Access denied. Delivery personnel only.");
            }}
            onError={(msg) => setError(msg)}
          />

          <p className="dl-footer">
            Not a rider yet? <Link to="/register">Become Scooper</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLogin;
