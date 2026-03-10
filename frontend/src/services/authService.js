import api from "./api";

export const logoutUser = async () => {
  try {
    const res = await api.post("/auth/logout");
    return res.data;
  } catch (error) {
    throw error.response?.data?.message || error.message || "Logout failed";
  }
};
