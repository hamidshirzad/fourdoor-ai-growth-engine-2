import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLeadsStore } from '../lib/store';
import { toast } from '../lib/toastStore';

export default function CsvImportModal({ isOpen, onClose, token, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);
  const { bulkUploadLeads } = useLeadsStore();

  if (!isOpen) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadResult(null);
    try {
      const res = await bulkUploadLeads(file, token);
      if (res.success) {
        setUploadResult({ success: true, count: res.count });
        toast.success('CSV Import Successful', `Imported ${res.count} leads into pipeline.`);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(res.error || 'Upload failed');
      }
    } catch (err) {
      setUploadResult({ success: false, error: err.message });
      toast.error('Import Failed', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = 'name,email,company,message\nSarah Jenkins,sarah@acme.com,Acme Corp,Interested in AI growth engine automation\nDavid Ross,david@nexus.io,Nexus AI,Looking to scale outbound sales pipeline';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'leads_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141416] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-orange-500" size={20} />
            <h3 className="font-semibold text-neutral-50 text-base">Import Leads from CSV</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-neutral-200 transition"
            aria-label="Close CSV import"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-[#111113] p-8 text-center cursor-pointer transition hover:border-orange-500/50 hover:bg-orange-500/[0.02]"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv"
              className="hidden"
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 mb-3 group-hover:scale-110 transition">
              <Upload size={22} />
            </div>
            {file ? (
              <div>
                <p className="font-medium text-neutral-100 text-sm">{file.name}</p>
                <p className="mt-1 text-xs text-neutral-400">{(file.size / 1024).toFixed(1)} KB — Ready to import</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-neutral-200">Drag and drop your CSV file here, or <span className="text-orange-500 underline">browse</span></p>
                <p className="mt-1 text-xs text-neutral-400">Supports headers: name, email, company, message</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#111113] p-3 text-xs">
            <span className="text-neutral-400">Need a formatting template?</span>
            <button
              onClick={downloadSampleCsv}
              className="flex items-center gap-1.5 font-medium text-orange-400 hover:text-orange-300 transition"
            >
              <Download size={13} />
              <span>Download Sample CSV</span>
            </button>
          </div>

          {uploadResult && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
              uploadResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {uploadResult.success ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
              <span>{uploadResult.success ? `Successfully imported ${uploadResult.count} leads into the pipeline!` : uploadResult.error}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            onClick={onClose}
            className="rounded border border-white/10 bg-[#111113] px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="rounded bg-orange-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-orange-400 disabled:opacity-50 transition flex items-center gap-2"
          >
            {isUploading ? 'Importing & Scoring...' : 'Upload & Initialize'}
          </button>
        </div>
      </div>
    </div>
  );
}
