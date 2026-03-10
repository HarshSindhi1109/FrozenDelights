import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import "./Register.css";
import GoogleAuthButton from "../../components/common/GoogleAuthButton";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const res = await api.post("/auth/register", formData);
      navigate("/verify-email", {
        state: { email: formData.email },
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const sprinkles = [
    { w: 6, h: 22, bg: "#a5d6a7", top: "10%", left: "8%", dur: "7s" },
    { w: 5, h: 18, bg: "#ffe082", top: "20%", right: "9%", dur: "9s" },
    { w: 6, h: 20, bg: "#f48fb1", bottom: "22%", left: "6%", dur: "6s" },
    { w: 5, h: 16, bg: "#80deea", top: "65%", right: "14%", dur: "8s" },
    { w: 6, h: 24, bg: "#ce93d8", top: "40%", right: "4%", dur: "11s" },
    { w: 5, h: 18, bg: "#ffab91", bottom: "35%", left: "16%", dur: "7.5s" },
    { w: 6, h: 14, bg: "#80cbc4", top: "80%", right: "25%", dur: "10s" },
  ];

  return (
    <div className="icr-page">
      {/* Background blobs */}
      <div className="icr-blob icr-blob-1" />
      <div className="icr-blob icr-blob-2" />
      <div className="icr-blob icr-blob-3" />

      {/* Sprinkles */}
      {sprinkles.map((s, i) => (
        <div
          key={i}
          className="icr-sprinkle"
          style={{
            width: s.w,
            height: s.h,
            background: s.bg,
            top: s.top,
            left: s.left,
            right: s.right,
            bottom: s.bottom,
            animationDuration: s.dur,
            transform: `rotate(${i * 40}deg)`,
          }}
        />
      ))}

      <div className="icr-card">
        <div className="icr-icon-wrap">
          <span className="icr-cone-emoji">🍧</span>
        </div>

        <h2 className="icr-title">Join the Parlor!</h2>
        <p className="icr-subtitle">
          Unlock sweet treats &amp; exclusive flavors
        </p>

        {/* Step indicator */}
        <div className="icr-steps">
          <div className="icr-step">
            <div className="icr-step-num">1</div>
            <span>Sign up</span>
          </div>
          <span className="icr-step-arrow">›</span>
          <div className="icr-step">
            <div className="icr-step-num">2</div>
            <span>Verify</span>
          </div>
          <span className="icr-step-arrow">›</span>
          <div className="icr-step">
            <div className="icr-step-num">3</div>
            <span>Scoop! 🎉</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="icr-field">
            <label className="icr-label" htmlFor="username">
              Username
            </label>
            <div className="icr-input-wrap">
              <span className="icr-input-icon">🍨</span>
              <input
                className="icr-input"
                id="username"
                type="text"
                name="username"
                placeholder="Your sweet nickname"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="icr-field">
            <label className="icr-label" htmlFor="email">
              Email
            </label>
            <div className="icr-input-wrap">
              <span className="icr-input-icon">✉️</span>
              <input
                className="icr-input"
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="icr-field">
            <label className="icr-label" htmlFor="password">
              Password
            </label>
            <div className="icr-input-wrap">
              <span className="icr-input-icon">🔒</span>
              <input
                className="icr-input"
                id="password"
                type="password"
                name="password"
                placeholder="Make it as strong as a waffle cone"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {error && (
            <div className="icr-error">
              <span>🍦</span> {error}
            </div>
          )}

          <button className="icr-btn" type="submit" disabled={loading}>
            <div className="icr-btn-shine" />
            {loading ? "Mixing your scoop... 🍨" : "Create My Account 🎉"}
          </button>
        </form>

        <div style={{ marginTop: "1rem" }}>
          <GoogleAuthButton
            onSuccess={(user) => {
              if (user.role === "customer") navigate("/");
              else setError("Access denied. Customer only.");
            }}
            onError={(msg) => setError(msg)}
          />
        </div>

        <div className="icr-divider">already a scooper?</div>

        <p className="icr-footer">
          Have an account? <Link to="/login">Sign in 🍦</Link>
        </p>

        <div className="icr-dots">
          {[
            "#a5d6a7",
            "#ffe082",
            "#f48fb1",
            "#80deea",
            "#ce93d8",
            "#ffab91",
          ].map((c, i) => (
            <div key={i} className="icr-dot" style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Register;
