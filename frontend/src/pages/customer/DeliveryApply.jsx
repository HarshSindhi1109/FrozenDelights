import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import "./DeliveryApply.css";

const VEHICLE_TYPES = [
  { value: "bicycle", label: "Bicycle", icon: "🚲", needsDocs: false },
  { value: "e_bike", label: "E-Bike", icon: "⚡", needsDocs: false },
  { value: "scooter", label: "Scooter", icon: "🛵", needsDocs: true },
  { value: "e_scooter", label: "E-Scooter", icon: "🛴", needsDocs: true },
  { value: "motorcycle", label: "Motorcycle", icon: "🏍️", needsDocs: true },
];

const STEPS = ["Personal", "Vehicle", "Bank", "Documents", "Review"];

/* ── File upload box ── */
const FileUploadBox = ({
  label,
  name,
  accept,
  file,
  onChange,
  required,
  hint,
}) => {
  const inputRef = useRef();
  return (
    <div className="da-file-box" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => onChange(name, e.target.files[0] || null)}
      />
      {file ? (
        <div className="da-file-preview">
          {file.type?.startsWith("image/") ? (
            <img
              src={URL.createObjectURL(file)}
              alt={label}
              className="da-file-thumb"
            />
          ) : (
            <div className="da-file-icon">📄</div>
          )}
          <div className="da-file-info">
            <span className="da-file-name">{file.name}</span>
            <span className="da-file-size">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <button
            className="da-file-remove"
            onClick={(e) => {
              e.stopPropagation();
              onChange(name, null);
            }}
          >
            ×
          </button>
        </div>
      ) : (
        <div className="da-file-empty">
          <span className="da-file-upload-icon">⬆</span>
          <span className="da-file-label">
            {label}
            {required && <span className="da-req">*</span>}
          </span>
          {hint && <span className="da-file-hint">{hint}</span>}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const DeliveryApply = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const checkExistingApplication = async () => {
      try {
        await api.get("/delivery-persons/me");
        // Profile exists (pending/active/etc.) — show the submitted screen
        setSubmitted(true);
      } catch (err) {
        // 404 means no application yet — show the form as normal
        if (err.response?.status !== 404) {
          console.error("Status check failed:", err);
        }
      } finally {
        setCheckingStatus(false);
      }
    };

    checkExistingApplication();
  }, []);

  const [form, setForm] = useState({
    fullname: "",
    phone: "",
    vehicleType: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
  });

  const [files, setFiles] = useState({
    govtId: null,
    profilePicture: null,
    drivingLicense: null,
    vehicleRegistration: null,
  });

  const selectedVehicle = VEHICLE_TYPES.find(
    (v) => v.value === form.vehicleType,
  );
  const needsDocs = selectedVehicle?.needsDocs ?? false;

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setFile = (k, v) => setFiles((p) => ({ ...p, [k]: v }));

  /* ── Per-step validation ── */
  const validateStep = () => {
    setError("");
    if (step === 0) {
      if (!form.fullname.trim())
        return (setError("Full name is required"), false);
      if (!/^[6-9]\d{9}$/.test(form.phone))
        return (setError("Enter a valid 10-digit Indian mobile number"), false);
    }
    if (step === 1) {
      if (!form.vehicleType)
        return (setError("Please select a vehicle type"), false);
    }
    if (step === 2) {
      if (!form.bankName.trim())
        return (setError("Bank name is required"), false);
      if (!form.accountNumber.trim())
        return (setError("Account number is required"), false);
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.toUpperCase()))
        return (setError("Enter a valid IFSC code (e.g. HDFC0001234)"), false);
    }
    if (step === 3) {
      if (!files.govtId) return (setError("Government ID is required"), false);
      if (!files.profilePicture)
        return (setError("Profile picture is required"), false);
      if (needsDocs && !files.drivingLicense)
        return (
          setError("Driving license is required for this vehicle type"),
          false
        );
      if (needsDocs && !files.vehicleRegistration)
        return (
          setError("Vehicle registration is required for this vehicle type"),
          false
        );
    }
    return true;
  };

  const next = () => {
    if (validateStep()) setStep((s) => s + 1);
  };
  const back = () => {
    setError("");
    setStep((s) => s - 1);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("fullname", form.fullname.trim());
      fd.append("phone", form.phone.trim());
      fd.append("vehicleType", form.vehicleType);
      fd.append(
        "bankDetails",
        JSON.stringify({
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          ifscCode: form.ifscCode.trim().toUpperCase(),
          ...(form.upiId.trim() ? { upiId: form.upiId.trim() } : {}),
        }),
      );
      if (files.govtId) fd.append("govtId", files.govtId);
      if (files.profilePicture)
        fd.append("profilePicture", files.profilePicture);
      if (files.drivingLicense)
        fd.append("drivingLicense", files.drivingLicense);
      if (files.vehicleRegistration)
        fd.append("vehicleRegistration", files.vehicleRegistration);

      await api.post("/delivery-persons/apply", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Submission failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading guard ── */
  if (checkingStatus) {
    return (
      <div className="da-page">
        <header className="da-header">
          <Link to="/" className="da-logo">
            🍦 FrozenDelights
          </Link>
          <span className="da-header-tag">Delivery Partner Application</span>
        </header>
        <div className="da-success-wrap">
          <div className="da-success-card">
            <span className="da-spinner" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="da-page">
        <header className="da-header">
          <Link to="/" className="da-logo">
            🍦 FrozenDelights
          </Link>
          <span className="da-header-tag">Delivery Partner Application</span>
        </header>
        <div className="da-success-wrap">
          <div className="da-success-card">
            <div className="da-success-icon">🎉</div>
            <h2 className="da-success-title">Application Submitted!</h2>
            <p className="da-success-msg">
              Your application is under review. We'll notify you once it's
              approved — usually within 24–48 hours.
            </p>
            <button
              className="da-btn da-btn--primary"
              onClick={() => navigate("/")}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="da-page">
      {/* ── Header ── */}
      <header className="da-header">
        <Link to="/" className="da-logo">
          🍦 FrozenDelights
        </Link>
        <span className="da-header-tag">Delivery Partner Application</span>
      </header>

      <div className="da-container">
        {/* ── Aside ── */}
        <aside className="da-aside">
          <div className="da-aside-inner">
            <div className="da-aside-hero">
              <span className="da-aside-emoji">🛵</span>
              <h1 className="da-aside-title">
                Deliver Joy,
                <br />
                <em>Earn Daily</em>
              </h1>
              <p className="da-aside-sub">
                Join our growing team of delivery partners and get paid every
                evening.
              </p>
            </div>
            <ul className="da-perks">
              {[
                ["💰", "Daily payouts", "Get paid every evening"],
                ["⏰", "Flexible hours", "Work whenever you want"],
                ["📍", "Local routes", "Deliver near your home"],
                ["🏅", "Performance bonus", "Earn more with great ratings"],
              ].map(([icon, title, desc]) => (
                <li key={title} className="da-perk">
                  <span className="da-perk-icon">{icon}</span>
                  <div>
                    <strong>{title}</strong>
                    <span>{desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ── Main form ── */}
        <main className="da-main">
          {/* Stepper */}
          <div className="da-stepper">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`da-step${i < step ? " da-step--done" : i === step ? " da-step--active" : ""}`}
              >
                <div className="da-step-dot">
                  {i < step ? (
                    <span className="da-step-check">✓</span>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span className="da-step-label">{s}</span>
                {i < STEPS.length - 1 && <div className="da-step-line" />}
              </div>
            ))}
          </div>

          <div className="da-form-card">
            {error && <div className="da-error">{error}</div>}

            {/* ── Step 0: Personal ── */}
            {step === 0 && (
              <div className="da-step-body">
                <h2 className="da-step-title">Personal Details</h2>
                <p className="da-step-desc">Tell us a bit about yourself.</p>
                <div className="da-field-group">
                  <label className="da-label">
                    Full Name <span className="da-req">*</span>
                  </label>
                  <input
                    className="da-input"
                    type="text"
                    placeholder="e.g. Ravi Sharma"
                    value={form.fullname}
                    onChange={(e) => setField("fullname", e.target.value)}
                  />
                </div>
                <div className="da-field-group">
                  <label className="da-label">
                    Mobile Number <span className="da-req">*</span>
                  </label>
                  <div className="da-input-prefix-wrap">
                    <span className="da-input-prefix">+91</span>
                    <input
                      className="da-input da-input--prefixed"
                      type="tel"
                      placeholder="9876543210"
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) =>
                        setField("phone", e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 1: Vehicle ── */}
            {step === 1 && (
              <div className="da-step-body">
                <h2 className="da-step-title">Vehicle Type</h2>
                <p className="da-step-desc">
                  Select the vehicle you'll use for deliveries.
                </p>
                <div className="da-vehicle-grid">
                  {VEHICLE_TYPES.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      className={`da-vehicle-card${form.vehicleType === v.value ? " da-vehicle-card--active" : ""}`}
                      onClick={() => setField("vehicleType", v.value)}
                    >
                      <span className="da-vehicle-icon">{v.icon}</span>
                      <span className="da-vehicle-label">{v.label}</span>
                      {v.needsDocs && (
                        <span className="da-vehicle-docs-tag">Docs needed</span>
                      )}
                    </button>
                  ))}
                </div>
                {needsDocs && (
                  <div className="da-info-box">
                    ℹ️ Driving license & vehicle registration are required for{" "}
                    {selectedVehicle?.label}.
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Bank ── */}
            {step === 2 && (
              <div className="da-step-body">
                <h2 className="da-step-title">Bank Details</h2>
                <p className="da-step-desc">
                  Your earnings will be transferred to this account daily.
                </p>
                <div className="da-field-group">
                  <label className="da-label">
                    Bank Name <span className="da-req">*</span>
                  </label>
                  <input
                    className="da-input"
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={form.bankName}
                    onChange={(e) => setField("bankName", e.target.value)}
                  />
                </div>
                <div className="da-field-group">
                  <label className="da-label">
                    Account Number <span className="da-req">*</span>
                  </label>
                  <input
                    className="da-input"
                    type="text"
                    placeholder="Enter your account number"
                    value={form.accountNumber}
                    onChange={(e) =>
                      setField(
                        "accountNumber",
                        e.target.value.replace(/\D/g, ""),
                      )
                    }
                  />
                </div>
                <div className="da-field-group">
                  <label className="da-label">
                    IFSC Code <span className="da-req">*</span>
                  </label>
                  <input
                    className="da-input"
                    type="text"
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                    value={form.ifscCode}
                    onChange={(e) =>
                      setField("ifscCode", e.target.value.toUpperCase())
                    }
                  />
                </div>
                <div className="da-field-group">
                  <label className="da-label">
                    UPI ID <span className="da-optional">(optional)</span>
                  </label>
                  <input
                    className="da-input"
                    type="text"
                    placeholder="e.g. ravi@upi"
                    value={form.upiId}
                    onChange={(e) => setField("upiId", e.target.value)}
                  />
                </div>
                <div className="da-secure-note">
                  🔒 Your bank details are encrypted and stored securely.
                </div>
              </div>
            )}

            {/* ── Step 3: Documents ── */}
            {step === 3 && (
              <div className="da-step-body">
                <h2 className="da-step-title">Upload Documents</h2>
                <p className="da-step-desc">
                  Please upload clear photos or scans. JPG, PNG, or PDF
                  accepted.
                </p>
                <div className="da-files-grid">
                  <FileUploadBox
                    label="Profile Picture"
                    name="profilePicture"
                    accept="image/*"
                    file={files.profilePicture}
                    onChange={setFile}
                    required
                    hint="Clear face photo"
                  />
                  <FileUploadBox
                    label="Government ID"
                    name="govtId"
                    accept="image/*,.pdf"
                    file={files.govtId}
                    onChange={setFile}
                    required
                    hint="Aadhaar / PAN / Voter ID"
                  />
                  {needsDocs && (
                    <>
                      <FileUploadBox
                        label="Driving License"
                        name="drivingLicense"
                        accept="image/*,.pdf"
                        file={files.drivingLicense}
                        onChange={setFile}
                        required
                        hint="Valid driving license"
                      />
                      <FileUploadBox
                        label="Vehicle Registration"
                        name="vehicleRegistration"
                        accept="image/*,.pdf"
                        file={files.vehicleRegistration}
                        onChange={setFile}
                        required
                        hint="RC book / registration cert"
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 4: Review ── */}
            {step === 4 && (
              <div className="da-step-body">
                <h2 className="da-step-title">Review & Submit</h2>
                <p className="da-step-desc">
                  Double-check everything before submitting your application.
                </p>
                <div className="da-review-grid">
                  <div className="da-review-section">
                    <h4 className="da-review-section-title">Personal</h4>
                    <div className="da-review-row">
                      <span>Name</span>
                      <strong>{form.fullname}</strong>
                    </div>
                    <div className="da-review-row">
                      <span>Phone</span>
                      <strong>+91 {form.phone}</strong>
                    </div>
                  </div>

                  <div className="da-review-section">
                    <h4 className="da-review-section-title">Vehicle</h4>
                    <div className="da-review-row">
                      <span>Type</span>
                      <strong>
                        {selectedVehicle?.icon} {selectedVehicle?.label}
                      </strong>
                    </div>
                  </div>

                  <div className="da-review-section">
                    <h4 className="da-review-section-title">Bank</h4>
                    <div className="da-review-row">
                      <span>Bank</span>
                      <strong>{form.bankName}</strong>
                    </div>
                    <div className="da-review-row">
                      <span>Account</span>
                      <strong>
                        {"•".repeat(Math.max(0, form.accountNumber.length - 4))}
                        {form.accountNumber.slice(-4)}
                      </strong>
                    </div>
                    <div className="da-review-row">
                      <span>IFSC</span>
                      <strong>{form.ifscCode}</strong>
                    </div>
                    {form.upiId && (
                      <div className="da-review-row">
                        <span>UPI</span>
                        <strong>{form.upiId}</strong>
                      </div>
                    )}
                  </div>

                  <div className="da-review-section">
                    <h4 className="da-review-section-title">Documents</h4>
                    {[
                      ["Profile Picture", files.profilePicture],
                      ["Govt ID", files.govtId],
                      ...(needsDocs
                        ? [
                            ["Driving License", files.drivingLicense],
                            ["Vehicle Registration", files.vehicleRegistration],
                          ]
                        : []),
                    ].map(([label, file]) => (
                      <div className="da-review-row" key={label}>
                        <span>{label}</span>
                        <strong
                          className={
                            file ? "da-review-ok" : "da-review-missing"
                          }
                        >
                          {file ? `✓ ${file.name}` : "Missing"}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="da-terms">
                  By submitting, you agree to our delivery partner terms and
                  confirm all information provided is accurate.
                </p>
              </div>
            )}

            {/* ── Nav buttons ── */}
            <div className="da-nav-row">
              {step > 0 && (
                <button
                  className="da-btn da-btn--ghost"
                  onClick={back}
                  disabled={submitting}
                >
                  ← Back
                </button>
              )}
              <div style={{ flex: 1 }} />
              {step < STEPS.length - 1 ? (
                <button className="da-btn da-btn--primary" onClick={next}>
                  Continue →
                </button>
              ) : (
                <button
                  className="da-btn da-btn--submit"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="da-spinner" /> Submitting…
                    </>
                  ) : (
                    "Submit Application 🚀"
                  )}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DeliveryApply;
