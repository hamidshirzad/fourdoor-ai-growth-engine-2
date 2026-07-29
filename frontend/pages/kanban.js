import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import LeadKanbanBoard from '../components/LeadKanbanBoard';
import CsvImportModal from '../components/CsvImportModal';
import { useAuthStore, useLeadsStore } from '../lib/store';
import { toast } from '../lib/toastStore';
import { Kanban, LayoutList, Plus, Upload, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function KanbanPage() {
  const { token } = useAuthStore();
  const { leads, getLeads, isLoading } = useLeadsStore();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [archivedLeadIds, setArchivedLeadIds] = useState([]);

  useEffect(() => {
    if (token) getLeads(token);
  }, [token, getLeads]);

  const handleClearResolved = () => {
    // Identify resolved (converted) or stale/low score leads to archive
    const resolvedIds = leads
      .filter((l) => l.status === 'converted' || l.status === 'booked' || (l.score && l.score < 30))
      .map((l) => l.id);

    if (resolvedIds.length === 0) {
      toast.info('No Resolved Leads', 'There are no converted or stale leads to clear at this moment.');
      return;
    }

    setArchivedLeadIds((prev) => [...prev, ...resolvedIds]);
    toast.success('Pipeline Cleaned', `Archived ${resolvedIds.length} resolved and stale leads from the Kanban board.`);
  };

  const activeLeads = leads.filter((l) => !archivedLeadIds.includes(l.id));

  return (
    <ProtectedRoute>
      <AppShell
        title="Lead Pipeline Kanban"
        subtitle="Manage and track generated leads through every stage from New to Converted."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearResolved}
              className="flex items-center gap-2 rounded border border-white/10 bg-[#141416] px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition"
              title="Filter out and archive resolved and stale leads"
            >
              <Trash2 size={14} />
              <span>Clear Resolved</span>
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 rounded border border-orange-500/30 bg-orange-500/10 px-3.5 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition"
            >
              <Upload size={14} />
              <span>Import CSV</span>
            </button>
            <Link
              href="/leads"
              className="flex items-center gap-2 rounded border border-white/10 bg-[#141416] px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/5 transition"
            >
              <LayoutList size={14} />
              <span>List View</span>
            </Link>
            <Link
              href="/leads"
              className="flex items-center gap-2 rounded bg-orange-500 px-3.5 py-2 text-xs font-semibold text-neutral-950 hover:bg-orange-400 transition"
            >
              <Plus size={14} />
              <span>Capture Lead</span>
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          <LeadKanbanBoard leads={activeLeads} token={token} onLeadUpdated={() => getLeads(token)} />
        </div>

        <CsvImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          token={token}
          onSuccess={() => getLeads(token)}
        />
      </AppShell>
    </ProtectedRoute>
  );
}
