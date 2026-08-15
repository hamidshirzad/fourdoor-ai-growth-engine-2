import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import SystemActivityLogs from '../components/SystemActivityLogs';

export default function ActivityPage() {
  return (
    <ProtectedRoute>
      <AppShell
        title="Recent System Activity Logs"
        subtitle="Transparency into automated actions, background agent executions, and system events, refreshed every 15 seconds."
      >
        <SystemActivityLogs />
      </AppShell>
    </ProtectedRoute>
  );
}
