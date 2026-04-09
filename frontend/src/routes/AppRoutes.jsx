import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminOrders from "../pages/admin/AdminOrders";
import AdminCategories from "../pages/admin/AdminCategories";
import AdminFlavours from "../pages/admin/AdminFlavours";
import AdminIceCreams from "../pages/admin/AdminIceCreams";
import AdminDeliveryPersons from "../pages/admin/AdminDeliveryPersons";
import AdminPayouts from "../pages/admin/AdminPayouts";
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
import PublicRoute from "./PublicRoute";
import Cart from "../pages/customer/Cart";
import Checkout from "../pages/customer/Checkout";
import Orders from "../pages/customer/Orders";
import AdminProfile from "../pages/admin/AdminProfile";
import DeliveryDashboard from "../pages/delivery/DeliveryDashboard";
import ActiveOrder from "../pages/delivery/ActiveOrder";
import EarningsPage from "../pages/delivery/EarningsPage";
import PayoutsPage from "../pages/delivery/PayoutsPage";
import ProfilePage from "../pages/delivery/ProfilePage";
import Reviews from "../pages/customer/Reviews";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/delivery/login" element={<DeliveryLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ── Customer ── */}
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
        <Route
          path="/customer/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/orders/:id"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/reviews"
          element={
            <ProtectedRoute>
              <Reviews />
            </ProtectedRoute>
          }
        />

        {/* ── Delivery ── */}
        <Route
          path="/delivery/dashboard"
          element={
            <ProtectedRoute role="delivery_man">
              <DeliveryDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/order/:id"
          element={
            <ProtectedRoute role="delivery_man">
              <ActiveOrder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/earnings"
          element={
            <ProtectedRoute role="delivery_man">
              <EarningsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/payouts"
          element={
            <ProtectedRoute role="delivery_man">
              <PayoutsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/profile"
          element={
            <ProtectedRoute role="delivery_man">
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* ── Admin ── */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute role="admin">
              <AdminOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute role="admin">
              <AdminCategories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/flavours"
          element={
            <ProtectedRoute role="admin">
              <AdminFlavours />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ice-creams"
          element={
            <ProtectedRoute role="admin">
              <AdminIceCreams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/delivery-persons"
          element={
            <ProtectedRoute role="admin">
              <AdminDeliveryPersons />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payouts"
          element={
            <ProtectedRoute role="admin">
              <AdminPayouts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute role="admin">
              <AdminProfile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
