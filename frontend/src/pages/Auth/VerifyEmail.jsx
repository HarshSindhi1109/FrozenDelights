import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./VerifyEmail.css";

const OTP_LENGTH = 6;
const CIRCUMFERENCE = 2 * Math.PI * 24; // radius = 24

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;

  const [boxes, setBoxes] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [maxCooldown, setMaxCooldown] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!email) {
    return (
      <div className="icv-page">
        <p className="icv-invalid">🍦 Invalid access. Please register again.</p>
      </div>
    );
  }

  // Derive full OTP string from boxes
  const otp = boxes.join("");

  /* ── Box keyboard handlers ── */
  const handleBoxChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...boxes];
    next[index] = val;
    setBoxes(next);
    if (val && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBoxKeyDown = (e, index) => {
    if (e.key === "Backspace" && !boxes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleBoxPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => {
      next[i] = ch;
    });
    setBoxes(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  /* ── Submit ── */
  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/otp/verify-email", { email, otp });
      alert(res.data.message);
      navigate("/customer/home");
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend ── */
  const handleResendOtp = async () => {
    setError("");
    try {
      const res = await api.post("/otp/resend-otp", { email });
      const cd = res.data.cooldownUntil || 60;
      setMaxCooldown(cd);
      setCooldown(cd);
      alert(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  /* ── Countdown ring ── */
  const progress = cooldown / maxCooldown;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const sprinkles = [
    { w: 6, h: 20, bg: "#ffe082", top: "10%", left: "10%", dur: "7s" },
    { w: 5, h: 18, bg: "#f48fb1", top: "20%", right: "8%", dur: "9s" },
    { w: 6, h: 22, bg: "#9fa8da", bottom: "20%", left: "7%", dur: "6s" },
    { w: 5, h: 16, bg: "#80deea", top: "68%", right: "16%", dur: "8s" },
    { w: 6, h: 24, bg: "#a5d6a7", top: "42%", right: "4%", dur: "11s" },
    { w: 5, h: 18, bg: "#ffab91", bottom: "32%", left: "18%", dur: "7s" },
  ];

  return (
    <div className="icv-page">
      {/* Background blobs */}
      <div className="icv-blob icv-blob-1" />
      <div className="icv-blob icv-blob-2" />
      <div className="icv-blob icv-blob-3" />

      {/* Sprinkles */}
      {sprinkles.map((s, i) => (
        <div
          key={i}
          className="icv-sprinkle"
          style={{
            width: s.w,
            height: s.h,
            background: s.bg,
            top: s.top,
            left: s.left,
            right: s.right,
            bottom: s.bottom,
            animationDuration: s.dur,
            transform: `rotate(${i * 35}deg)`,
          }}
        />
      ))}

      <div className="icv-card">
        {/* Icon */}
        <div className="icv-icon-wrap">
          <span className="icv-icon-emoji">🍪</span>
        </div>

        <h2 className="icv-title">Check Your Inbox!</h2>
        <p className="icv-hint">
          We scooped a secret code to <strong>{email}</strong>.<br />
          Enter it below to verify your account.
        </p>

        <form onSubmit={handleVerify}>
          <label className="icv-otp-label" htmlFor="otp-box-0">
            🍬 Enter your 6-digit code
          </label>

          {/* Individual OTP boxes */}
          <div className="icv-otp-wrap" onPaste={handleBoxPaste}>
            {boxes.map((val, i) => (
              <input
                key={i}
                id={i === 0 ? "otp-box-0" : undefined}
                ref={(el) => (inputRefs.current[i] = el)}
                className={`icv-otp-box${val ? " filled" : ""}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={val}
                onChange={(e) => handleBoxChange(e, i)}
                onKeyDown={(e) => handleBoxKeyDown(e, i)}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {error && (
            <div className="icv-error">
              <span>🍦</span> {error}
            </div>
          )}

          <button
            className="icv-btn"
            type="submit"
            disabled={loading || otp.length < OTP_LENGTH}
          >
            <div className="icv-btn-shine" />
            {loading ? "Verifying your scoop... 🍨" : "Verify & Dive In! 🎉"}
          </button>
        </form>

        <div className="icv-divider">didn't get it?</div>

        <div className="icv-resend-wrap">
          {cooldown > 0 ? (
            <div className="icv-cooldown-wrap">
              <div className="icv-cooldown-ring">
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle className="track" cx="28" cy="28" r="24" />
                  <circle
                    className="progress"
                    cx="28"
                    cy="28"
                    r="24"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                  />
                </svg>
                <div className="icv-cooldown-number">{cooldown}</div>
              </div>
              <span className="icv-cooldown-label">seconds until resend</span>
            </div>
          ) : (
            <>
              <p className="icv-resend-text">Didn't receive your code?</p>
              <button className="icv-resend-btn" onClick={handleResendOtp}>
                🔁 Resend Code
              </button>
            </>
          )}
        </div>

        <div className="icv-dots">
          {[
            "#ffe082",
            "#f48fb1",
            "#9fa8da",
            "#80deea",
            "#a5d6a7",
            "#ffab91",
          ].map((c, i) => (
            <div key={i} className="icv-dot" style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
