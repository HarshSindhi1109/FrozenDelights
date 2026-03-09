import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

const getCSRFToken = () => {
  const match = document.cookie.match(/(^| )csrfToken=([^;]+)/);
  return match ? match[2] : null;
};

api.interceptors.request.use((config) => {
  const csrfToken = getCSRFToken();

  if (csrfToken) {
    config.headers["x-csrf-token"] = csrfToken;
  }

  return config;
});

export default api;
