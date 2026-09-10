import { Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { DirectoryPage } from "./pages/DirectoryPage";
import { OpportunitySearchPage } from "./pages/OpportunitySearchPage";
import { OrganizationDetailPage } from "./pages/OrganizationDetailPage";
import { MemberSignupPage } from "./pages/member/SignupPage";
import { MemberLoginPage } from "./pages/member/LoginPage";
import { NonprofitSignupPage } from "./pages/nonprofit/SignupPage";
import { NonprofitLoginPage } from "./pages/nonprofit/LoginPage";
import { RaceDirectorSignupPage } from "./pages/raceDirector/SignupPage";
import { RaceDirectorLoginPage } from "./pages/raceDirector/LoginPage";
import { PlatformAdminLoginPage } from "./pages/platformAdmin/LoginPage";
import { MemberDashboard } from "./pages/dashboard/MemberDashboard";
import { OrgDashboard } from "./pages/dashboard/OrgDashboard";
import { RaceDirectorDashboard } from "./pages/dashboard/RaceDirectorDashboard";
import { PlatformAdminDashboard } from "./pages/dashboard/PlatformAdminDashboard";
import { OrgProfileEditPage } from "./pages/dashboard/OrgProfileEditPage";
import { OpportunitiesListPage } from "./pages/dashboard/OpportunitiesListPage";
import { OpportunityFormPage } from "./pages/dashboard/OpportunityFormPage";
import { OpportunitySignupsPage } from "./pages/dashboard/OpportunitySignupsPage";
import { HoursListPage } from "./pages/dashboard/HoursListPage";
import { CampaignsListPage } from "./pages/dashboard/CampaignsListPage";
import { CampaignFormPage } from "./pages/dashboard/CampaignFormPage";
import { BadgesListPage } from "./pages/dashboard/BadgesListPage";
import { BadgeFormPage } from "./pages/dashboard/BadgeFormPage";
import { IntegrationsPage } from "./pages/dashboard/IntegrationsPage";
import { SwagPage } from "./pages/dashboard/SwagPage";
import { TeamPage } from "./pages/dashboard/TeamPage";
import { ReportsPage } from "./pages/dashboard/ReportsPage";
import { AcceptInvitePage } from "./pages/team/AcceptInvitePage";
import { TermsPage } from "./pages/legal/TermsPage";
import { PrivacyPage } from "./pages/legal/PrivacyPage";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/opportunities" element={<OpportunitySearchPage />} />
        <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
        <Route path="/signup/member" element={<MemberSignupPage />} />
        <Route path="/login/member" element={<MemberLoginPage />} />
        <Route path="/signup/nonprofit" element={<NonprofitSignupPage />} />
        <Route path="/login/nonprofit" element={<NonprofitLoginPage />} />
        <Route path="/signup/race-director" element={<RaceDirectorSignupPage />} />
        <Route path="/login/race-director" element={<RaceDirectorLoginPage />} />
        <Route path="/login/platform-admin" element={<PlatformAdminLoginPage />} />
        <Route path="/join-org/:token" element={<AcceptInvitePage />} />
        <Route
          path="/dashboard/member"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <MemberDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <OrgDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/race-director"
          element={
            <ProtectedRoute allowedRoles={["race_director"]} redirectTo="/login/race-director">
              <RaceDirectorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/platform-admin"
          element={
            <ProtectedRoute allowedRoles={["platform_admin"]} redirectTo="/login/platform-admin">
              <PlatformAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/profile"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <OrgProfileEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/opportunities"
          element={
            <ProtectedRoute allowedRoles={["org_admin", "race_director"]} redirectTo="/login/nonprofit">
              <OpportunitiesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/opportunities/new"
          element={
            <ProtectedRoute allowedRoles={["org_admin", "race_director"]} redirectTo="/login/nonprofit">
              <OpportunityFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/opportunities/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["org_admin", "race_director"]} redirectTo="/login/nonprofit">
              <OpportunityFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/opportunities/:id/signups"
          element={
            <ProtectedRoute allowedRoles={["org_admin", "race_director"]} redirectTo="/login/nonprofit">
              <OpportunitySignupsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/hours"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <HoursListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/campaigns"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <CampaignsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/campaigns/new"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <CampaignFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/campaigns/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <CampaignFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/badges"
          element={
            <ProtectedRoute allowedRoles={["org_admin", "race_director"]} redirectTo="/login/nonprofit">
              <BadgesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/badges/new"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <BadgeFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/badges/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <BadgeFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/integrations"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <IntegrationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/swag"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <SwagPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/team"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <TeamPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/org/reports"
          element={
            <ProtectedRoute allowedRoles={["org_admin"]} redirectTo="/login/nonprofit">
              <ReportsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      </div>
      <Footer />
    </div>
  );
}
