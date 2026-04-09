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

/* ── Create / Edit Modal ── */
const CategoryModal = ({ category, onClose, onSaved }) => {
  const isEdit = !!category;
  const [form, setForm] = useState({
    name: category?.name || "",
    description: category?.description || "",
    isActive: category?.isActive ?? true,
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(imgSrc(category?.imageUrl) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      setError("Name and description are required.");
      return;
    }
    if (!isEdit && !image) {
      setError("Category image is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("isActive", form.isActive);
      if (image) fd.append("categoryImage", image);
      if (isEdit) {
        await api.put(`/categories/${category._id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/categories", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save category.");
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
            {isEdit ? "Edit Category" : "Create Category"}
          </div>
          <div className="ap-modal-sub">
            {isEdit
              ? `Updating "${category.name}"`
              : "Add a new ice cream category"}
          </div>

          {error && <div className="ap-error-box">{error}</div>}

          <div className="ap-field">
            <label className="ap-label">Category Name</label>
            <input
              className="ap-input"
              placeholder="e.g. Fruit"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="ap-field">
            <label className="ap-label">Description</label>
            <textarea
              className="ap-input ap-textarea"
              placeholder="Short description…"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className="ap-field">
            <label className="ap-label">
              Category Image {isEdit ? "(leave empty to keep existing)" : ""}
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
              <label className="ap-label" style={{ marginBottom: 0 }}>
                Active
              </label>
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

/* ── Delete Confirm ── */
const DeleteConfirm = ({ category, onClose, onDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/categories/${category._id}`);
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
          <div className="ap-modal-title">Delete Category?</div>
          <div className="ap-modal-sub">
            "{category.name}" will be permanently deleted.
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
const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAll, setShowAll] = useState(true);
  const [modal, setModal] = useState(null); // null | "create" | { edit: cat } | { delete: cat }
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 12,
        showInactive: showAll,
      });
      const res = await api.get(`/categories?${params}`);
      setCategories(res.data.data || []);
      setPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch {
      showToast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  }, [page, showAll]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSaved = (msg = "Saved successfully") => {
    setModal(null);
    showToast(msg);
    fetchCategories();
  };

  return (
    <AdminLayout pageTitle="Categories" breadcrumb="CATALOG / CATEGORIES">
      {toast && (
        <div className={`ap-toast ap-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {modal === "create" && (
        <CategoryModal
          onClose={() => setModal(null)}
          onSaved={() => handleSaved("Category created!")}
        />
      )}
      {modal?.edit && (
        <CategoryModal
          category={modal.edit}
          onClose={() => setModal(null)}
          onSaved={() => handleSaved("Category updated!")}
        />
      )}
      {modal?.delete && (
        <DeleteConfirm
          category={modal.delete}
          onClose={() => setModal(null)}
          onDeleted={() => handleSaved("Category deleted.")}
        />
      )}

      <div className="ap-page-hd">
        <div className="ap-page-hd-left">
          <h1>Categories</h1>
          <p>{total} categories</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontSize: "0.82rem",
              color: "var(--a-text2)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => {
                setShowAll(e.target.checked);
                setPage(1);
              }}
            />
            Show inactive
          </label>
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
            New Category
          </button>
        </div>
      </div>

      <div className="ap-card">
        {loading ? (
          <div className="ap-center">
            <div className="ap-spin" />
            <span>Loading…</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="ap-center">
            <div className="ap-empty-icon">🗂️</div>
            <span>No categories yet</span>
          </div>
        ) : (
          <div className="ap-table-wrap" style={{ border: "none" }}>
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat._id}>
                    <td>
                      <div className="ap-thumb">
                        {imgSrc(cat.imageUrl) ? (
                          <img
                            src={imgSrc(cat.imageUrl)}
                            alt=""
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        ) : (
                          "🗂️"
                        )}
                      </div>
                    </td>
                    <td className="ap-td-strong">{cat.name}</td>
                    <td
                      style={{
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "0.8rem",
                      }}
                    >
                      {cat.description}
                    </td>
                    <td>
                      <span
                        className={`ap-badge ap-badge--${cat.isActive ? "green" : "gray"}`}
                      >
                        {cat.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem" }}>
                      {fmtDate(cat.createdAt)}
                    </td>
                    <td>
                      <div className="ap-row-actions">
                        <button
                          className="ap-btn ap-btn--ghost ap-btn--sm"
                          onClick={() => setModal({ edit: cat })}
                        >
                          Edit
                        </button>
                        <button
                          className="ap-btn ap-btn--danger ap-btn--sm"
                          onClick={() => setModal({ delete: cat })}
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
              PAGE {page} / {pages} · {total} CATEGORIES
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

export default AdminCategories;
