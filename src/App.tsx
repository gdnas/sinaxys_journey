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
import SupabaseStatus from "./pages/SupabaseStatus";
import { AuthProvider } from "@/lib/auth";
import { CompanyProvider } from "@/lib/company";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { ThemeProvider } from "@/components/ThemeProvider";
import Pricing from "./pages/Pricing";
import HowItWorks from "./pages/HowItWorks";
import Demo from "./pages/Demo";
import Person from "./pages/Person";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <CompanyProvider>
            <BrowserRouter>
              <AppShell>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/como-funciona" element={<HowItWorks />} />
                  <Route path="/demo" element={<Demo />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/supabase" element={<SupabaseStatus />} />

                  {/* Empresa */}
                  <Route
                    path="/org"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="ORG">
                          <OrgChart />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/people/:userId"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="ORG">
                          <Person />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

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
                        <RequireCompanyModule moduleKey="PDI_PERFORMANCE">
                          <PdiPerformance />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  {/* OKRs */}
                  <Route
                    path="/okr"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrHome />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/okr/hoje"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrToday />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/okr/fundamentos"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrFundamentals />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/okr/mapa"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrMap />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/okr/ciclos"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrCycles />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/okr/assistente"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrAssistant />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/okr/objetivo/:objectiveId"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrObjectiveDetail />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  {/* Alias (plural) used by several links */}
                  <Route
                    path="/okr/objetivos/:objectiveId"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrObjectiveDetail />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  {/* Admin */}
                  <Route
                    path="/admin/users"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN"]}>
                        <AdminUsers />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/users/:userId"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN"]}>
                        <AdminUserCard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/departments"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN"]}>
                        <AdminDepartments />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/brand"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN"]}>
                        <AdminBrand />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/orgchart"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN"]}>
                        <AdminOrgChart />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/costs"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN"]}>
                        <AdminCosts />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/import-users"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN"]}>
                        <AdminImportUsers />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/tracks"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN"]}>
                        <AdminTracks />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/rewards"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN"]}>
                        <AdminRewards />
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
                    path="/head/tracks/:trackId"
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

                  {/* Colaborador */}
                  <Route
                    path="/app"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <AppDashboard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/app/tracks/:trackId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <TrackDetail />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/app/player/:trackId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <TrackPlayer />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/app/certificates"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <AppCertificates />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/certificate/:certificateId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <CertificateView />
                      </RequireAuth>
                    }
                  />
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

                  <Route
                    path="/rankings"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="POINTS">
                          <Rankings />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  {/* Master */}
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

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppShell>
            </BrowserRouter>
          </CompanyProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;