import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import TrackLibrary from "./pages/TrackLibrary";
import Rankings from "./pages/Rankings";
import AdminUsers from "./pages/AdminUsers";
import AdminImportUsers from "./pages/AdminImportUsers";
import AdminRewards from "./pages/AdminRewards";
import AdminBrand from "./pages/AdminBrand";
import AdminCosts from "./pages/AdminCosts";
import MasterCompanies from "./pages/MasterCompanies";
import MasterOverview from "./pages/MasterOverview";
import MasterUsers from "./pages/MasterUsers";
import Profile from "./pages/Profile";
import OrgChart from "./pages/OrgChart";
import PersonProfile from "./pages/PersonProfile";
import { AuthProvider } from "@/lib/auth";
import { CompanyProvider } from "@/lib/company";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <CompanyProvider>
          <BrowserRouter>
            <AppShell>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />

                {/* Master (plataforma) */}
                <Route
                  path="/master/overview"
                  element={
                    <RequireAuth roles={["MASTERADMIN"]}>
                      <MasterOverview />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/master/companies"
                  element={
                    <RequireAuth roles={["MASTERADMIN"]}>
                      <MasterCompanies />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/master/users"
                  element={
                    <RequireAuth roles={["MASTERADMIN"]}>
                      <MasterUsers />
                    </RequireAuth>
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
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

                <Route
                  path="/people/:userId"
                  element={
                    <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                      <PersonProfile />
                    </RequireAuth>
                  }
                />

                {/* Compat: rota antiga */}
                <Route path="/library" element={<Navigate to="/tracks" replace />} />

                <Route
                  path="/tracks"
                  element={
                    <RequireAuth roles={["ADMIN", "COLABORADOR"]}>
                      <TrackLibrary />
                    </RequireAuth>
                  }
                />

                <Route
                  path="/rankings"
                  element={
                    <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                      <Rankings />
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

                {/* Admin (empresa) */}
                <Route
                  path="/admin/users"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <AdminUsers />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/users/import"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <AdminImportUsers />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/rewards"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <AdminRewards />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/costs"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <AdminCosts />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/brand"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <AdminBrand />
                    </RequireAuth>
                  }
                />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppShell>
          </BrowserRouter>
        </CompanyProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;