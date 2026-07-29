import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import SystemActivityLogs from '../components/SystemActivityLogs';

export default function ActivityPage() {
  return (
    <ProtectedRoute>
      <AppShell
        title="Recent System Activity Logs"
        subtitle="Real-time transparency into automated actions, background agent executions, and system events stored in Firestore."
      >
        <SystemActivityLogs />
      </AppShell>
    </ProtectedRoute>
  );
}
