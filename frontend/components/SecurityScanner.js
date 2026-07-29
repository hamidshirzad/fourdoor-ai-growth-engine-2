export default function SecurityScanner({ scan }) {
  if (!scan) return null;

  if (scan.skipped) {
    return (
      <div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-4">
        <p className="text-sm text-yellow-400">
          <strong>Security Scan Skipped:</strong> {scan.reason}
        </p>
      </div>
    );
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/30';
      case 'high':
        return 'bg-orange-500/10 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/10 border-blue-500/30';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/15 text-red-400';
      case 'high':
        return 'bg-orange-500/15 text-orange-400';
      case 'medium':
        return 'bg-yellow-500/15 text-yellow-400';
      case 'low':
        return 'bg-blue-500/15 text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 rounded border border-white/10 bg-[#141416] p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-neutral-50">Security Scan Results</h3>
        <div className={`rounded px-3 py-1 text-sm font-medium ${scan.passed ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
          {scan.passed ? '✓ Passed' : '⚠ Issues Found'}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="rounded bg-[#111113] p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{scan.severityCount.critical || 0}</p>
          <p className="text-xs text-neutral-400">Critical</p>
        </div>
        <div className="rounded bg-[#111113] p-3 text-center">
          <p className="text-2xl font-bold text-orange-400">{scan.severityCount.high || 0}</p>
          <p className="text-xs text-neutral-400">High</p>
        </div>
        <div className="rounded bg-[#111113] p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{scan.severityCount.medium || 0}</p>
          <p className="text-xs text-neutral-400">Medium</p>
        </div>
        <div className="rounded bg-[#111113] p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{scan.severityCount.low || 0}</p>
          <p className="text-xs text-neutral-400">Low</p>
        </div>
      </div>

      {scan.secretsFound > 0 && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">
            <strong>{scan.secretsFound} secret(s)</strong> detected in content
          </p>
        </div>
      )}

      {scan.vulnerabilities && scan.vulnerabilities.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-300">Vulnerabilities Found:</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {scan.vulnerabilities.map((vuln, idx) => (
              <div key={idx} className={`rounded border p-3 ${getSeverityColor(vuln.severity)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${getSeverityBadgeColor(vuln.severity)}`}>
                        {vuln.severity.toUpperCase()}
                      </span>
                      {vuln.type && (
                        <span className="text-xs font-medium text-neutral-400">
                          {vuln.type}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-neutral-50">
                      {vuln.title || vuln.message || 'Vulnerability'}
                    </p>
                    {vuln.description && (
                      <p className="mt-1 text-xs text-neutral-300">{vuln.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!scan.vulnerabilities || scan.vulnerabilities.length === 0) && scan.passed && (
        <p className="text-sm text-green-400">No vulnerabilities or secrets detected.</p>
      )}
    </div>
  );
}
