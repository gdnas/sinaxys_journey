import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ChangePassword from "./pages/ChangePassword";
import ForgotPassword from "./pages/ForgotPassword";
import AppDashboard from "./pages/AppDashboard";
import AppHome from "./pages/AppHome";
import TrackPlayer from "./pages/TrackPlayer";
import AppCertificates from "./pages/AppCertificates";
import CertificateView from "./pages/CertificateView";
import TrackLibrary from "./pages/TrackLibrary";
import TrackDetail from "./pages/TrackDetail";
import AdminUsers from "./pages/AdminUsers";
import AdminUserCard from "./pages/AdminUserCard";
import AdminDepartments from "./pages/AdminDepartments";
import AdminBrand from "./pages/AdminBrand";
import AdminModules from "./pages/AdminModules";
import AdminOrgChart from "./pages/AdminOrgChart";
import AdminCosts from "./pages/AdminCosts";
import AdminImportUsers from "./pages/AdminImportUsers";
import AdminTracks from "./pages/AdminTracks";
import AdminRewards from "./pages/AdminRewards";
import AdminEmailTemplates from "./pages/AdminEmailTemplates";
import Rankings from "./pages/Rankings";
import MasterCompanies from "./pages/MasterCompanies";
import MasterOverview from "./pages/MasterOverview";
import MasterUsers from "./pages/MasterUsers";
import Profile from "./pages/Profile";
import HeadTracksRedirect from "./pages/HeadTracksRedirect";
import HeadTrackEdit from "./pages/HeadTrackEdit";
import HeadUsers from "./pages/HeadUsers";
import HeadCosts from "./pages/HeadCosts";
import OrgChart from "./pages/OrgChart";
import OkrHome from "./pages/OkrHome";
import OkrToday from "./pages/OkrToday";
import OkrFundamentals from "./pages/OkrFundamentals";
import OkrMap from "./pages/OkrMap";
import OkrCycles from "./pages/OkrCycles";
import OkrQuarter from "./pages/OkrQuarter";
import OkrYear from "./pages/OkrYear";
import OkrLongTerm from "./pages/OkrLongTerm";
import OkrAssistant from "./pages/OkrAssistant";
import OkrObjectiveDetail from "./pages/OkrObjectiveDetail";
import OkrDeliverableDetail from "./pages/OkrDeliverableDetail";
import PdiPerformance from "./pages/PdiPerformance";
import VacationRequests from "./pages/VacationRequests";
import VacationApprovals from "./pages/VacationApprovals";
import SupabaseStatus from "./pages/SupabaseStatus";
import CollaboratorHome from "./pages/CollaboratorHome";
import HeadHome from "./pages/HeadHome";
import HeadPerformanceDashboard from "./pages/HeadPerformanceDashboard";
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
import TrailVideos from "./pages/TrailVideos";
import Integrations from "./pages/Integrations";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import TestRunner from "./pages/TestRunner";
import TrackEdit from "./pages/TrackEdit";
import KnowledgeHome from "./pages/KnowledgeHome";
import KnowledgeSpace from "./pages/KnowledgeSpace";
import KnowledgePage from "./pages/KnowledgePage";
import KnowledgeNewSpace from "./pages/KnowledgeNewSpace";
import KnowledgeNewPage from "./pages/KnowledgeNewPage";
import NotificationsPage from "./pages/NotificationsPage";
import Announcements from "./pages/Announcements";
import AnnouncementDetail from "./pages/AnnouncementDetail";
import Settings from "./pages/Settings";
import ProjetosHome from "./pages/ProjetosHome";
import ProjetosDashboard from "./pages/ProjetosDashboard";
import ProjetosLista from "./pages/ProjetosLista";
import ProjetosTarefas from "./pages/ProjetosTarefas";
import ProjetoDetail from "./pages/ProjetoDetail";
import ProjetoEdit from "./pages/ProjetoEdit";
import ProjetosTasks from "./pages/ProjetosTasks";
import TaskCreate from "./pages/TaskCreate";
import TaskEdit from "./pages/TaskEdit";
import ProjetosKanban from "./pages/ProjetosKanban";

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
                  <Route
                    path="/settings"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <Settings />
                      </RequireAuth>
                    }
                  />
                  <Route path="/" element={<Index />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/como-funciona" element={<HowItWorks />} />
                  <Route path="/demo" element={<Demo />} />
                  <Route path="/privacidade" element={<PrivacyPolicy />} />
                  <Route path="/termos" element={<TermsOfService />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot" element={<ForgotPassword />} />
                  <Route path="/supabase" element={<SupabaseStatus />} />
                  <Route
                    path="/test-runner"
                    element={
                      <RequireAuth roles={["MASTERADMIN"]}>
                        <TestRunner />
                      </RequireAuth>
                    }
                  />

                  {/* Dashboard / Jornada */}
                  <Route
                    path="/app"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <AppHome />
                      </RequireAuth>
                    }
                  />

                  {/* Backwards-compat */}
                  <Route
                    path="/dashboard"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <Navigate to="/app" replace />
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/app/tracks/:assignmentId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <TrackPlayer />
                      </RequireAuth>
                    }
                  />

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

                  {/* Indisponibilidade */}
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

                  {/* OKRs */}
                  <Route
                    path="/okr"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrHome />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  {/* Novas abas */}
                  <Route
                    path="/okr/quarter"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrQuarter />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/okr/year"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrYear />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/okr/long-term"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrLongTerm />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  {/* Rotas atuais (EN) */}
                  <Route
                    path="/okr/today"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrToday />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/fundamentals"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrFundamentals />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/map"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrMap />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/cycles"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <Navigate to="/okr/quarter" replace />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/objectives/:objectiveId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrObjectiveDetail />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/deliverables/:deliverableId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrDeliverableDetail />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/assistant"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrAssistant />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  {/* Backwards-compat (PT-BR) */}
                  <Route
                    path="/okr/hoje"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrToday />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/fundamentos"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrFundamentals />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/mapa"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrMap />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/ciclos"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <Navigate to="/okr/quarter" replace />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/objetivos/:objectiveId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrObjectiveDetail />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/entregaveis/:deliverableId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrDeliverableDetail />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/okr/assistente"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="OKR">
                          <OkrAssistant />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  {/* Trilhas */}
                  <Route
                    path="/track/:trackId"
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
                    path="/app/certificates/:certificateId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <CertificateView />
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
                    path="/videos"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="TRACKS">
                          <TrailVideos />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/integrations"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <Integrations />
                      </RequireAuth>
                    }
                  />

                  {/* Knowledge Base */}
                  <Route
                    path="/knowledge"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="KNOWLEDGE">
                          <KnowledgeHome />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/knowledge/new-space"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD"]}>
                        <RequireCompanyModule moduleKey="KNOWLEDGE">
                          <KnowledgeNewSpace />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/knowledge/space/:spaceId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="KNOWLEDGE">
                          <KnowledgeSpace />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/knowledge/space/:spaceId/new-page"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="KNOWLEDGE">
                          <KnowledgeNewPage />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/knowledge/page/:pageId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="KNOWLEDGE">
                          <KnowledgePage />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  {/* Gestão de Projetos */}
                  <Route
                    path="/app/projetos"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="PROJECTS">
                          <ProjetosHome />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/app/projetos/dashboard"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="PROJECTS">
                          <ProjetosDashboard />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/app/projetos/lista"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="PROJECTS">
                          <ProjetosLista />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/app/projetos/tarefas"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="PROJECTS">
                          <ProjetosTarefas />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/app/projetos/:projectId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="PROJECTS">
                          <ProjetoDetail />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/app/projetos/:projectId/editar"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="PROJECTS">
                          <ProjetoEdit />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/app/projetos/:projectId/tarefas"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="PROJECTS">
                          <ProjetosTasks />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/app/projetos/:projectId/kanban"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="PROJECTS">
                          <ProjetosKanban />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/app/projetos/:projectId/tarefas/criar"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="PROJECTS">
                          <TaskCreate />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/app/projetos/:projectId/tarefas/:taskId/editar"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="PROJECTS">
                          <TaskEdit />
                        </RequireCompanyModule>
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

                  <Route
                    path="/notifications"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <NotificationsPage />
                      </RequireAuth>
                    }
                  />

                  {/* Comunicação Interna */}
                  <Route
                    path="/announcements"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="INTERNAL_COMMUNICATION">
                          <Announcements />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/announcements/:id"
                    element={
                      <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
                        <RequireCompanyModule moduleKey="INTERNAL_COMMUNICATION">
                          <AnnouncementDetail />
                        </RequireCompanyModule>
                      </RequireAuth>
                    }
                  />

                  {/* Admin */}
                  <Route
                    path="/admin/users"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD"]}>
                        <AdminUsers />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/users/:userId"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD"]}>
                        <AdminUserCard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/departments"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD"]}>
                        <AdminDepartments />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/brand"
                    element={
                      <RequireAuth roles={["ADMIN", "MASTERADMIN"]}>
                        <AdminBrand />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/modules"
                    element={
                      <RequireAuth roles={["ADMIN", "MASTERADMIN"]}>
                        <AdminModules />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/email"
                    element={
                      <RequireAuth roles={["ADMIN", "MASTERADMIN"]}>
                        <AdminEmailTemplates />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/org"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD"]}>
                        <AdminOrgChart />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/costs"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD"]}>
                        <AdminCosts />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/import"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD"]}>
                        <AdminImportUsers />
                      </RequireAuth>
                    }
                  />

                  {/* Backwards-compat */}
                  <Route
                    path="/admin/import-users"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD"]}>
                        <Navigate to="/admin/import" replace />
                      </RequireAuth>
                    }
                  />

                  <Route
                    path="/admin/tracks"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD"]}>
                        <AdminTracks />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/tracks/:trackId/edit"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD"]}>
                        <HeadTrackEdit />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/tracks/:trackId/edit"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <TrackEdit />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/rewards"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD"]}>
                        <AdminRewards />
                      </RequireAuth>
                    }
                  />

                  {/* Head */}
                  <Route
                    path="/head/tracks"
                    element={
                      <RequireAuth roles={["HEAD"]}>
                        <HeadTracksRedirect />
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

                  {/* PDI */}
                  <Route
                    path="/pdi-performance"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <PdiPerformance />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/pdi"
                    element={
                      <RequireAuth roles={["ADMIN", "HEAD", "COLABORADOR"]}>
                        <Navigate to="/pdi-performance" replace />
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