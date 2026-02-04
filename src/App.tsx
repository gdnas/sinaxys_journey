import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AppDashboard from "./pages/AppDashboard";
import TrackPlayer from "./pages/TrackPlayer";
import AppCertificates from "./pages/AppCertificates";
import CertificateView from "./pages/CertificateView";
import HeadDashboard from "./pages/HeadDashboard";
import HeadTracks from "./pages/HeadTracks";
import HeadTrackEdit from "./pages/HeadTrackEdit";
import HeadCollaboratorDetail from "./pages/HeadCollaboratorDetail";
import AdminUsers from "./pages/AdminUsers";
import Profile from "./pages/Profile";
import OrgChart from "./pages/OrgChart";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />

              <Route
                path="/profile"
                element={
                  <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                    <Profile />
                  </RequireAuth>
                }
              />

              <Route
                path="/org"
                element={
                  <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                    <OrgChart />
                  </RequireAuth>
                }
              />

              {/* Colaborador */}
              <Route
                path="/app"
                element={
                  <RequireAuth roles={["COLABORADOR"]}>
                    <AppDashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/app/tracks/:assignmentId"
                element={
                  <RequireAuth roles={["COLABORADOR"]}>
                    <TrackPlayer />
                  </RequireAuth>
                }
              />
              <Route
                path="/app/certificates"
                element={
                  <RequireAuth roles={["COLABORADOR"]}>
                    <AppCertificates />
                  </RequireAuth>
                }
              />
              <Route
                path="/app/certificates/:certificateId"
                element={
                  <RequireAuth roles={["COLABORADOR"]}>
                    <CertificateView />
                  </RequireAuth>
                }
              />

              {/* Head */}
              <Route
                path="/head"
                element={
                  <RequireAuth roles={["HEAD"]}>
                    <HeadDashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/head/collaborators/:userId"
                element={
                  <RequireAuth roles={["HEAD"]}>
                    <HeadCollaboratorDetail />
                  </RequireAuth>
                }
              />
              <Route
                path="/head/tracks"
                element={
                  <RequireAuth roles={["HEAD"]}>
                    <HeadTracks />
                  </RequireAuth>
                }
              />
              <Route
                path="/head/tracks/:trackId/edit"
                element={
                  <RequireAuth roles={["HEAD"]}>
                    <HeadTrackEdit />
                  </RequireAuth>
                }
              />

              {/* Admin */}
              <Route
                path="/admin/users"
                element={
                  <RequireAuth roles={["ADMIN"]}>
                    <AdminUsers />
                  </RequireAuth>
                }
              />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;