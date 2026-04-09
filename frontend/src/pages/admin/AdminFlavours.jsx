import { useState, useEffect, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../services/api";
import "./Admin.css";

const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url.replace(/\\/g, "/")}` : null);
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
const toInputDate = (iso) =>
  iso ? new Date(iso).toISOString().split("T")[0] : "";

/* ── Modal ── */
const FlavourModal = ({ flavour, categories, onClose, onSaved }) => {
  const isEdit = !!flavour;
  const [form, setForm] = useState({
    name: flavour?.name || "",
    categoryId: flavour?.categoryId?._id || flavour?.categoryId || "",
    isSeasonal: flavour?.isSeasonal || false,
    availableFrom: toInputDate(flavour?.availableFrom),
    availableTo: toInputDate(flavour?.availableTo),
    isActive: flavour?.isActive ?? true,
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(imgSrc(flavour?.imageUrl) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.categoryId) {
      setError("Name and category are required.");
      return;
    }
    if (!isEdit && !image) {
      setError("Flavour image is required.");
      return;
    }
    if (form.isSeasonal && (!form.availableFrom || !form.availableTo)) {
      setError("Seasonal flavour requires date range.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("categoryId", form.categoryId);
      fd.append("isSeasonal", form.isSeasonal);
      if (form.isSeasonal) {
        fd.append("availableFrom", form.availableFrom);
        fd.append("availableTo", form.availableTo);
      }
      if (isEdit) fd.append("isActive", form.isActive);
      if (image) fd.append("flavourImage", image);
      if (isEdit) {
        await api.put(`/flavours/${flavour._id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/flavours", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ap-modal-strip" />
        <div className="ap-modal-inner">
          <div className="ap-modal-title">
            {isEdit ? "Edit Flavour" : "Create Flavour"}
          </div>
          <div className="ap-modal-sub">
            {isEdit ? `Updating "${flavour.name}"` : "Add a new flavour"}
          </div>
          {error && <div className="ap-error-box">{error}</div>}

          <div className="ap-field">
            <label className="ap-label">Flavour Name</label>
            <input
              className="ap-input"
              placeholder="e.g. Mango Tango"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="ap-field">
            <label className="ap-label">Category</label>
            <select
              className="ap-input"
              value={form.categoryId}
              onChange={(e) =>
                setForm((f) => ({ ...f, categoryId: e.target.value }))
              }
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ap-field">
            <label className="ap-label">
              Flavour Image {isEdit ? "(leave empty to keep existing)" : ""}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ color: "var(--a-text2)", fontSize: "0.83rem" }}
            />
            {preview && (
              <img
                src={preview}
                alt=""
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 10,
                  marginTop: 8,
                  border: "1px solid var(--a-border)",
                }}
              />
            )}
          </div>

          <div
            className="ap-field"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <label className="ap-toggle">
              <input
                type="checkbox"
                checked={form.isSeasonal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isSeasonal: e.target.checked }))
                }
              />
              <span className="ap-toggle-slider" />
            </label>
            <label className="ap-label" style={{ marginBottom: 0 }}>
              Seasonal Flavour
            </label>
          </div>

          {form.isSeasonal && (
            <div className="ap-grid-2">
              <div className="ap-field">
                <label className="ap-label">Available From</label>
                <input
                  className="ap-input"
                  type="date"
                  value={form.availableFrom}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, availableFrom: e.target.value }))
                  }
                />
              </div>
              <div className="ap-field">
                <label className="ap-label">Available To</label>
                <input
                  className="ap-input"
                  type="date"
                  value={form.availableTo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, availableTo: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          {isEdit && (
            <div
              className="ap-field"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginBottom: 0,
              }}
            >
              <label className="ap-toggle">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                />
                <span className="ap-toggle-slider" />
              </label>
              <label className="ap-label" style={{ marginBottom: 0 }}>
                Active
              </label>
            </div>
          )}
        </div>
        <div className="ap-modal-footer">
          <button
            className="ap-btn ap-btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="ap-btn ap-btn--primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="ap-spin" /> Saving…
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirm = ({ flavour, onClose, onDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/flavours/${flavour._id}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete.");
      setLoading(false);
    }
  };
  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      <div
        className="ap-modal"
        style={{ maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ap-modal-strip" />
        <div className="ap-modal-inner">
          <div className="ap-confirm-icon">🗑️</div>
          <div className="ap-modal-title">Delete Flavour?</div>
          <div className="ap-modal-sub">
            "{flavour.name}" will be permanently deleted.
          </div>
          {error && <div className="ap-error-box">{error}</div>}
        </div>
        <div className="ap-modal-footer">
          <button
            className="ap-btn ap-btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="ap-btn ap-btn--danger"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="ap-spin" /> Deleting…
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const AdminFlavours = () => {
  const [flavours, setFlavours] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api
      .get("/categories?limit=100&showInactive=true")
      .then((r) => setCategories(r.data.data || []))
      .catch(() => {});
  }, []);

  const fetchFlavours = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 12,
        isActive: "false",
      });
      if (search.trim()) params.set("search", search.trim());
      if (catFilter) params.set("categoryId", catFilter);
      // pass no isActive to get all (backend defaults to true, we override by not filtering)
      // eslint-disable-next-line no-unused-vars
      const res = await api.get(
        `/flavours?page=${page}&limit=12${catFilter ? `&categoryId=${catFilter}` : ""}${search.trim() ? `&search=${search.trim()}` : ""}&isActive=`,
      );
      // Actually fetch both active and inactive: use showInactive pattern
      const res2 = await api.get(
        `/flavours?page=${page}&limit=12${catFilter ? `&categoryId=${catFilter}` : ""}${search.trim() ? `&search=${search.trim()}` : ""}`,
      );
      setFlavours(res2.data.data || []);
      setPages(res2.data.pages || 1);
      setTotal(res2.data.total || 0);
    } catch {
      showToast("Failed to load flavours", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, catFilter]);

  useEffect(() => {
    fetchFlavours();
  }, [fetchFlavours]);

  const handleSaved = (msg = "Saved!") => {
    setModal(null);
    showToast(msg);
    fetchFlavours();
  };

  return (
    <AdminLayout pageTitle="Flavours" breadcrumb="CATALOG / FLAVOURS">
      {toast && (
        <div className={`ap-toast ap-toast--${toast.type}`}>{toast.msg}</div>
      )}
      {modal === "create" && (
        <FlavourModal
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => handleSaved("Flavour created!")}
        />
      )}
      {modal?.edit && (
        <FlavourModal
          flavour={modal.edit}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => handleSaved("Flavour updated!")}
        />
      )}
      {modal?.delete && (
        <DeleteConfirm
          flavour={modal.delete}
          onClose={() => setModal(null)}
          onDeleted={() => handleSaved("Flavour deleted.")}
        />
      )}

      <div className="ap-page-hd">
        <div className="ap-page-hd-left">
          <h1>Flavours</h1>
          <p>{total} flavours</p>
        </div>
        <button
          className="ap-btn ap-btn--primary"
          onClick={() => setModal("create")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Flavour
        </button>
      </div>

      <div className="ap-card">
        <div className="ap-card-body" style={{ paddingBottom: 0 }}>
          <div className="ap-filters">
            <div className="ap-search-wrap">
              <div className="ap-search-icon">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                className="ap-search"
                placeholder="Search flavour…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="ap-select"
              value={catFilter}
              onChange={(e) => {
                setCatFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="ap-center">
            <div className="ap-spin" />
            <span>Loading…</span>
          </div>
        ) : flavours.length === 0 ? (
          <div className="ap-center">
            <div className="ap-empty-icon">🍓</div>
            <span>No flavours found</span>
          </div>
        ) : (
          <div
            className="ap-table-wrap"
            style={{ border: "none", borderTop: "1px solid var(--a-border2)" }}
          >
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Seasonal</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {flavours.map((f) => (
                  <tr key={f._id}>
                    <td>
                      <div className="ap-thumb">
                        {imgSrc(f.imageUrl) ? (
                          <img
                            src={imgSrc(f.imageUrl)}
                            alt=""
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        ) : (
                          "🍓"
                        )}
                      </div>
                    </td>
                    <td className="ap-td-strong">{f.name}</td>
                    <td>
                      <span className="ap-badge ap-badge--indigo">
                        {f.categoryId?.name || "—"}
                      </span>
                    </td>
                    <td>
                      {f.isSeasonal ? (
                        <span className="ap-badge ap-badge--orange">
                          🍂 {fmtDate(f.availableFrom)} –{" "}
                          {fmtDate(f.availableTo)}
                        </span>
                      ) : (
                        <span className="ap-badge ap-badge--gray">No</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`ap-badge ap-badge--${f.isActive ? "green" : "gray"}`}
                      >
                        {f.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem" }}>
                      {fmtDate(f.createdAt)}
                    </td>
                    <td>
                      <div className="ap-row-actions">
                        <button
                          className="ap-btn ap-btn--ghost ap-btn--sm"
                          onClick={() => setModal({ edit: f })}
                        >
                          Edit
                        </button>
                        <button
                          className="ap-btn ap-btn--danger ap-btn--sm"
                          onClick={() => setModal({ delete: f })}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="ap-pagination">
            <span className="ap-pagination-info">
              PAGE {page} / {pages} · {total} FLAVOURS
            </span>
            <div className="ap-pagination-btns">
              <button
                className="ap-page-btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <button
                className="ap-page-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pages}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFlavours;
