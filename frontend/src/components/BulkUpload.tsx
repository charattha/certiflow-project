import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function BulkUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        // Map common CSV headers to backend expected keys
        let key = header;
        if (header === 'emp_id' || header === 'employeeid') key = 'emp_id';
        if (header === 'first_name' || header === 'firstname') key = 'first_name';
        if (header === 'last_name' || header === 'lastname') key = 'last_name';
        if (header === 'thai_id' || header === 'thaiid') key = 'thai_id';
        
        obj[key] = values[index];
      });
      return obj;
    });
    return data;
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setStatus(null);

    try {
      const text = await file.text();
      const employees = parseCSV(text);

      if (employees.length === 0) {
        throw new Error('No valid data found in CSV');
      }

      const response = await api.post('/api/admin/employees/bulk', employees, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStatus({ type: 'success', message: response.data.message });
      setFile(null);
      if (onUploadComplete) onUploadComplete();
    } catch (error: any) {
      console.error('Bulk upload failed', error);
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.error || error.message || 'Upload failed' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-sheet shadow-sheet border border-rule p-6 space-y-4 font-data">
      <div>
        <h2 className="font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft border-b border-rule-strong pb-2 mb-1 flex items-center gap-2">
          <Upload className="h-3.5 w-3.5 text-brass" /> Bulk Employee Onboarding
        </h2>
      </div>

      <p className="text-ink-soft text-sm">
        Upload a CSV file with headers: <code className="text-brass">emp_id, first_name, last_name, email, thai_id, department, position</code>
      </p>

      <div className="relative border border-dashed border-rule p-8 flex flex-col items-center justify-center hover:border-brass transition-colors group cursor-pointer">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <FileText className={`h-8 w-8 mb-2 transition-colors ${file ? 'text-brass' : 'text-ink-soft/50 group-hover:text-ink-soft'}`} />
        <p className="text-ink-soft font-medium text-sm text-center">
          {file ? file.name : 'Click or drag CSV file to upload'}
        </p>
      </div>

      {status && (
        <div className={`p-4 flex items-center gap-3 border ${status.type === 'success' ? 'bg-status-approved/5 text-status-approved border-status-approved/30' : 'bg-status-rejected/5 text-status-rejected border-status-rejected/30'}`}>
          {status.type === 'success' ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          <span className="text-sm font-medium">{status.message}</span>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="w-full bg-brass text-sheet py-3 font-semibold text-xs uppercase tracking-[0.08em] hover:bg-[#6B560E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isUploading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
        ) : (
          <><Upload className="h-4 w-4" /> Import Employees</>
        )}
      </button>
    </div>
  );
}
