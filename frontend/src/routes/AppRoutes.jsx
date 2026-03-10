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
import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/delivery/login" element={<DeliveryLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/customer/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/addresses"
          element={
            <ProtectedRoute>
              <Addresses />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
