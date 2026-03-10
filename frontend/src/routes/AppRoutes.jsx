import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "../pages/Auth/Register";
import Login from "../pages/Auth/Login";
import VerifyEmail from "../pages/Auth/VerifyEmail";
import LandingPage from "../pages/Home/LandingPage";
import DeliveryLogin from "../pages/Auth/DeliveryLogin";
import AdminLogin from "../pages/Auth/AdminLogin";
import HomePage from "../pages/customer/HomePage";
import Profile from "../pages/customer/Profile";
import Addresses from "../pages/customer/Addresses";

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
        <Route path="/customer/profile" element={<Profile />} />
        <Route path="/customer/addresses" element={<Addresses />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
