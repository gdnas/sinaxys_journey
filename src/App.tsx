import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import AppDashboard from "./pages/AppDashboard";
import TrackPlayer from "./pages/TrackPlayer";
import AppCertificates from "./pages/AppCertificates";
import CertificateView from "./pages/CertificateView";
import TrackLibrary from "./pages/TrackLibrary";
import TrackDetail from "./pages/TrackDetail";
import AdminUsers from "./pages/AdminUsers";
import AdminUserCard from "./pages/AdminUserCard";
import AdminDepartments from "./pages/AdminDepartments";
import AdminBrand from "./pages/AdminBrand";
import AdminOrgChart from "./pages/AdminOrgChart";
import AdminCosts from "./pages/AdminCosts";
import AdminImportUsers from "./pages/AdminImportUsers";
import AdminTracks from "./pages/AdminTracks";
import AdminRewards from "./pages/AdminRewards";
import Rankings from "./pages/Rankings";
import MasterCompanies from "./pages/MasterCompanies";
import MasterOverview from "./pages/MasterOverview";
import MasterUsers from "./pages/MasterUsers";
import Profile from "./pages/Profile";
import HeadTracks from "./pages/HeadTracks";
import HeadTrackEdit from "./pages/HeadTrackEdit";
import HeadUsers from "./pages/HeadUsers";
import HeadCosts from "./pages/HeadCosts";
import OrgChart from "./pages/OrgChart";
import OkrHome from "./pages/OkrHome";
import OkrToday from "./pages/OkrToday";
import OkrFundamentals from "./pages/OkrFundamentals";
import OkrMap from "./pages/OkrMap";
import OkrCycles from "./pages/OkrCycles";
import OkrAssistant from "./pages/OkrAssistant";
import OkrObjectiveDetail from "./pages/OkrObjectiveDetail";
import PdiPerformance from "./pages/PdiPerformance";
import VacationRequests from "./pages/VacationRequests";
import VacationApprovals from "./pages/VacationApprovals";
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
                <Route
                  path="/password"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                      <ChangePassword />
                    </RequireAuth>
                  }
                />

                {/* Férias */}
                <Route
                  path="/vacation"
                  element={
                    <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                      <VacationRequests />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/vacation/approvals"
                  element={
                    <RequireAuth roles={["ADMIN", "HEAD"]}>
                      <VacationApprovals />
                    </RequireAuth>
                  }
                />

                {/* PDI & Performance */}
                <Route
                  path="/pdi-performance"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                      <PdiPerformance />
                    </RequireAuth>
                  }
                />

                {/* OKRs */}
                <Route
                  path="/okr"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                      <OkrHome />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/okr/hoje"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                      <OkrToday />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/okr/fundamentos"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                      <OkrFundamentals />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/okr/mapa"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                      <OkrMap />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/okr/ciclos"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                      <OkrCycles />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/okr/assistente"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                      <OkrAssistant />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/okr/objetivos/:objectiveId"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                      <OkrObjectiveDetail />
                    </RequireAuth>
                  }
                />

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
                  path="/rankings"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                      <Rankings />
                    </RequireAuth>
                  }
                />

                {/* Organograma (visível para todos dentro da empresa) */}
                <Route
                  path="/org"
                  element={
                    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                      <OrgChart />
                    </RequireAuth>
                  }
                />

                {/* Compat: rota antiga */}
                <Route path="/library" element={<Navigate to="/tracks" replace />} />

                <Route
                  path="/tracks"
                  element={
                    <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                      <TrackLibrary />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/tracks/:trackId"
                  element={
                    <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                      <TrackDetail />
                    </RequireAuth>
                  }
                />

                {/* Jornada */}
                <Route
                  path="/app"
                  element={
                    <RequireAuth roles={["COLABORADOR", "HEAD", "ADMIN"]}>
                      <AppDashboard />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/tracks/:assignmentId"
                  element={
                    <RequireAuth roles={["COLABORADOR", "HEAD", "ADMIN"]}>
                      <TrackPlayer />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/certificates"
                  element={
                    <RequireAuth roles={["COLABORADOR", "HEAD", "ADMIN"]}>
                      <AppCertificates />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/certificates/:certificateId"
                  element={
                    <RequireAuth roles={["COLABORADOR", "HEAD", "ADMIN"]}>
                      <CertificateView />
                    </RequireAuth>
                  }
                />

                {/* Head */}
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
                <Route
                  path="/head/users"
                  element={
                    <RequireAuth roles={["HEAD"]}>
                      <HeadUsers />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/head/costs"
                  element={
                    <RequireAuth roles={["HEAD"]}>
                      <HeadCosts />
                    </RequireAuth>
                  }
                />

                {/* Admin (empresa) */}
                <Route
                  path="/admin/users"
                  element={
                    <RequireAuth roles={["ADMIN", "MASTERADMIN"]}>
                      <AdminUsers />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/users/:userId"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <AdminUserCard />
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
                  path="/admin/import"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <AdminImportUsers />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/org"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <AdminOrgChart />
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
                  path="/admin/tracks"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <AdminTracks />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/tracks/:trackId/edit"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <HeadTrackEdit />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/departments"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <AdminDepartments />
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