import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from '../hooks/useWorkspace';
import { LoadingState } from '../components/ui';
import { AuthGate } from '../features/auth/AuthGate';
import { DashboardPage } from '../features/analytics/DashboardPage';
import { AlertsPage } from '../features/alerts/AlertsPage';
import { FeedbackPage } from '../features/grievances/FeedbackPage';
import { PayPage } from '../features/pay/PayPage';
import { SafetyPage } from '../features/safety/SafetyPage';
import { ShiftsPage } from '../features/shifts/ShiftsPage';
import { SkillsPage } from '../features/skills/SkillsPage';
import { TeamPage } from '../features/organizations/TeamPage';
import { WorkspaceShell } from './WorkspaceShell';

function AppRoutes() {
  const workspace = useWorkspace();
  if (workspace.mode === 'firebase' && workspace.loading) return <LoadingState />;
  if (workspace.mode === 'firebase' && (!workspace.user || !workspace.memberships.length)) return <AuthGate />;
  return <Routes><Route element={<WorkspaceShell />}>
    <Route index element={<DashboardPage />} />
    <Route path="shifts" element={<ShiftsPage />} />
    <Route path="pay" element={<PayPage />} />
    <Route path="safety" element={<SafetyPage />} />
    <Route path="feedback" element={<FeedbackPage />} />
    <Route path="skills" element={<SkillsPage />} />
    <Route path="team" element={<TeamPage />} />
    <Route path="alerts" element={<AlertsPage />} />
    <Route path="*" element={<DashboardPage />} />
  </Route></Routes>;
}

export function App() {
  return <WorkspaceProvider><BrowserRouter><AppRoutes /></BrowserRouter></WorkspaceProvider>;
}
