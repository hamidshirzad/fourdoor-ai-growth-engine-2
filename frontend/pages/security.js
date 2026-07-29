import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import SecurityScanner from '../components/SecurityScanner';
import { useAuthStore, useSecurityStore } from '../lib/store';
import { toast } from '../lib/toastStore';

export default function SecurityPage() {
  const { token } = useAuthStore();
  const { scans, currentScan, getScans, getScanById, scanContent, isLoading: isScanning } = useSecurityStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  
  // Quick manual scanner input
  const [customText, setCustomText] = useState('');
  const [scanType, setScanType] = useState('content');

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      getScans(50, 0, token).finally(() => setIsLoading(false));
    }
  }, [token, getScans]);

  const handleScanSelect = async (scanId) => {
    setSelectedScanId(scanId);
    await getScanById(scanId, token);
  };

  const handleRunScan = async () => {
    if (!customText.trim()) return;
    const res = await scanContent(customText, scanType, null, null, token);
    if (res?.success) {
      setCustomText('');
      await getScans(50, 0, token);
    }
  };

  const runDemoPassedScan = async () => {
    await scanContent("We generated a high-converting LinkedIn post highlighting B2B SaaS efficiency.", "content", null, null, token);
    await getScans(50, 0, token);
  };

  const runDemoWarningScan = async () => {
    await scanContent("AWS_SECRET_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE api_key_secret='sk_live_992123'", "code", null, null, token);
    await getScans(50, 0, token);
  };

  const filteredScans = filterSeverity === 'all'
    ? scans
    : scans.filter(scan => {
        if (filterSeverity === 'failed') return !scan.passed;
        if (filterSeverity === 'critical') return (scan.severity_count?.critical || scan.severityCount?.critical || 0) > 0;
        if (filterSeverity === 'high') return (scan.severity_count?.high || scan.severityCount?.high || 0) > 0;
        return true;
      });

  return (
    <ProtectedRoute>
      <AppShell
        title="Security Audit"
        subtitle="View all security scans, perform real-time vulnerability checks, and manage system alerts."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={runDemoPassedScan}
              className="focus-ring rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
            >
              ✓ Test Clean Scan Toast
            </button>
            <button
              onClick={runDemoWarningScan}
              className="focus-ring rounded border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
            >
              ⚠️ Test Alert Scan Toast
            </button>
          </div>
        }
      >
        {/* Quick Scan Input Bar */}
        <div className="mb-6 rounded border border-white/10 bg-[#141416] p-5">
          <h3 className="font-semibold text-neutral-50 mb-2">Run On-Demand Security Scan</h3>
          <p className="text-xs text-neutral-400 mb-4">Paste marketing content, AI code, or API responses below to test for hardcoded credentials, secret leaks, or vulnerabilities.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={scanType}
              onChange={(e) => setScanType(e.target.value)}
              className="rounded border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-neutral-200"
            >
              <option value="content">Content Asset</option>
              <option value="code">Code snippet</option>
              <option value="dependency">Dependency manifest</option>
            </select>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. paste content or secret token to scan..."
              className="flex-1 rounded border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm focus-ring"
            />
            <button
              onClick={handleRunScan}
              disabled={isScanning || !customText.trim()}
              className="rounded bg-orange-500 px-5 py-2 text-sm font-semibold text-neutral-950 hover:bg-orange-400 disabled:opacity-50"
            >
              {isScanning ? 'Scanning...' : 'Run Scan'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Scans List */}
          <div className="lg:col-span-1">
            <div className="rounded border border-white/10 bg-[#141416]">
              <div className="border-b border-white/10 px-4 py-3">
                <h3 className="font-semibold text-neutral-50">Recent Scans</h3>
                <div className="mt-3 space-y-2">
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="w-full rounded border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-neutral-200"
                  >
                    <option value="all">All Scans</option>
                    <option value="failed">With Issues</option>
                    <option value="critical">Critical Only</option>
                    <option value="high">High Only</option>
                  </select>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-neutral-400">Loading scans...</div>
                ) : filteredScans.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-neutral-400">No scans found</div>
                ) : (
                  filteredScans.map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => handleScanSelect(scan.id)}
                      className={`w-full border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                        selectedScanId === scan.id ? 'bg-orange-500/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-400">
                            {new Date(scan.created_at).toLocaleDateString()}
                          </p>
                          <p className="mt-1 text-sm font-medium text-neutral-50 truncate">
                            {scan.scan_type === 'content' ? '📝 Content' : scan.scan_type === 'code' ? '💻 Code' : '📦 Dependency'}
                          </p>
                          <p className="text-xs text-neutral-400 truncate line-clamp-2">
                            {scan.scanned_content?.substring(0, 50)}...
                          </p>
                        </div>
                        <div className={`whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${
                          scan.passed
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {scan.passed ? '✓ Passed' : '⚠ Alert'}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Scan Details */}
          <div className="lg:col-span-2">
            {selectedScanId && currentScan ? (
              <div className="space-y-4">
                <div className="rounded border border-white/10 bg-[#141416] p-5">
                  <h3 className="font-semibold text-neutral-50">Scan Details</h3>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-400">Type</p>
                      <p className="mt-1 font-medium text-neutral-50">
                        {currentScan.scan_type === 'content' ? 'Content' : currentScan.scan_type === 'code' ? 'Code' : 'Dependency'}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-400">Scanned At</p>
                      <p className="mt-1 font-medium text-neutral-50">
                        {new Date(currentScan.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <SecurityScanner scan={currentScan} />

                {currentScan.scanned_content && (
                  <div className="rounded border border-white/10 bg-[#141416] p-5">
                    <h4 className="font-semibold text-neutral-50">Scanned Content</h4>
                    <p className="mt-3 rounded bg-[#111113] p-3 text-sm text-neutral-300 font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                      {currentScan.scanned_content}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded border border-white/10 bg-[#141416] p-12 text-center">
                <p className="text-neutral-400">Select a scan above or run a new scan to view findings.</p>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
