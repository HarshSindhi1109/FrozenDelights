import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import "./Login.css";
import GoogleAuthButton from "../../components/common/GoogleAuthButton";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const res = await api.post("/auth/login", formData);
      const user = res.data.user;
      if (user.role === "customer") {
        navigate("/");
      } else {
        setError("Access denied. Customer only.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const sprinkles = [
    { w: 6, h: 22, bg: "#f06292", top: "12%", left: "15%", dur: "6s" },
    { w: 6, h: 18, bg: "#ffe082", top: "22%", right: "12%", dur: "8s" },
    { w: 5, h: 20, bg: "#80deea", bottom: "18%", left: "10%", dur: "7s" },
    { w: 6, h: 16, bg: "#ce93d8", top: "70%", right: "18%", dur: "9s" },
    { w: 5, h: 14, bg: "#a5d6a7", top: "45%", right: "6%", dur: "5s" },
    { w: 6, h: 22, bg: "#ffab91", bottom: "30%", left: "20%", dur: "10s" },
  ];

  return (
    <div className="ic-page">
      {/* Background blobs */}
      <div className="ic-blob ic-blob-1" />
      <div className="ic-blob ic-blob-2" />
      <div className="ic-blob ic-blob-3" />

      {/* Sprinkles */}
      {sprinkles.map((s, i) => (
        <div
          key={i}
          className="ic-sprinkle"
          style={{
            width: s.w,
            height: s.h,
            background: s.bg,
            top: s.top,
            left: s.left,
            right: s.right,
            bottom: s.bottom,
            animationDuration: s.dur,
            transform: `rotate(${i * 30}deg)`,
          }}
        />
      ))}

      <div className="ic-card">
        <div className="ic-icon-wrap">
          <span className="ic-cone-emoji">🍦</span>
        </div>

        <h2 className="ic-title">Welcome Back!</h2>
        <p className="ic-subtitle">Sign in to scoop your favorites</p>

        <form onSubmit={handleSubmit}>
          <div className="ic-field">
            <label className="ic-label" htmlFor="email">
              Email
            </label>
            <div className="ic-input-wrap">
              <span className="ic-input-icon">✉️</span>
              <input
                className="ic-input"
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

          <div className="ic-field">
            <label className="ic-label" htmlFor="password">
              Password
            </label>
            <div className="ic-input-wrap">
              <span className="ic-input-icon">🔒</span>
              <input
                className="ic-input"
                id="password"
                type="password"
                name="password"
                placeholder="Your secret recipe"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {error && (
            <div className="ic-error">
              <span>🍦</span> {error}
            </div>
          )}

          <button className="ic-btn" type="submit" disabled={loading}>
            <div className="ic-btn-shine" />
            {loading ? "Scooping you in... 🍨" : "Let's Scoop! 🍦"}
          </button>
        </form>

        <div className="ic-divider">or</div>

        <GoogleAuthButton
          onSuccess={(user) => {
            if (user.role === "customer") navigate("/");
            else setError("Access denied. Customer only.");
          }}
          onError={(msg) => setError(msg)}
        />

        <p className="ic-footer">
          New to our parlor? <Link to="/register">Join the crew 🎉</Link>
        </p>

        <div className="ic-dots">
          {["#f48fb1", "#ffe082", "#80deea", "#ce93d8", "#a5d6a7"].map(
            (c, i) => (
              <div key={i} className="ic-dot" style={{ background: c }} />
            ),
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
