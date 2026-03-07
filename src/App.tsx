import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ChangePassword from "@/pages/ChangePassword";
import AppDashboard from "@/pages/AppDashboard";
import AppHome from "@/pages/AppHome";
import CollaboratorHome from "@/pages/CollaboratorHome";
import HeadHome from "@/pages/HeadHome";
import AdminHome from "@/pages/AdminHome";
import AdminUsers from "@/pages/AdminUsers";
import HeadUsers from "@/pages/HeadUsers";
import MasterUsers from "@/pages/MasterUsers";
import AdminTracks from "@/pages/AdminTracks";
import HeadTracks from "@/pages/HeadTracks";
import TrackDetail from "@/pages/TrackDetail";
import Integrations from "@/pages/Integrations";

const App = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <Router>
      <AppShell>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot" element={<ForgotPassword />} />

          {/* Accept both /change-password and legacy /password (used by guards) */}
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/password" element={<ChangePassword />} />

          {/* Authenticated routes */}
          <Route path="/dashboard" element={<AppHome />} />
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/:userId" element={<AdminUsers />} />
          <Route path="/head" element={<HeadHome />} />
          <Route path="/head/users" element={<HeadUsers />} />
          <Route path="/master/users" element={<MasterUsers />} />
          <Route path="/admin/tracks" element={<AdminTracks />} />
          <Route path="/head/tracks" element={<HeadTracks />} />
          <Route path="/track/:trackId" element={<TrackDetail />} />
          <Route path="/integrations" element={<Integrations />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AppShell>
    </Router>
  );
};

export default App;