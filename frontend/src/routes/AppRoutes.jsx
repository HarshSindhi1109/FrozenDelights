import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "../pages/Auth/Register";
import Login from "../pages/Auth/Login";
import VerifyEmail from "../pages/Auth/VerifyEmail";
import LandingPage from "../pages/Home/LandingPage";
import DeliveryLogin from "../pages/Auth/DeliveryLogin";
import AdminLogin from "../pages/Auth/AdminLogin";
import HomePage from "../pages/customer/HomePage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/landing-page" element={<LandingPage />} />
        <Route path="/delivery/login" element={<DeliveryLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route path="/customer/home" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
