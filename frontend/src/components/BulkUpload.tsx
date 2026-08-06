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
    const ALIAS: Record<string, string> = {
      employeeid: 'emp_id', employee_id: 'emp_id',
      firstname: 'first_name', lastname: 'last_name',
      thaiid: 'thai_id', passportno: 'passport_no', passport_number: 'passport_no',
      employmentdate: 'employment_date', start_date: 'employment_date', hire_date: 'employment_date',
      resignationdate: 'resignation_date', end_date: 'resignation_date',
    };

    return lines.slice(1).map(line => {
      // Handle quoted fields (values containing commas)
      const values: string[] = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      values.push(cur.trim());

      const obj: any = {};
      headers.forEach((header, i) => {
        const key = ALIAS[header] ?? header;
        obj[key] = values[i] ?? '';
      });
      return obj;
    });
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

      const { message, results } = response.data;
      const failures = results?.filter((r: any) => r.status === 'error') ?? [];
      const detail = failures.length > 0 ? ` (${failures.map((r: any) => `${r.email}: ${r.error}`).join('; ')})` : '';
      setStatus({ type: 'success', message: message + detail });
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
    <div className="bg-sheet shadow-sheet border border-rule rounded-xl p-6 space-y-4 font-data">
      <div>
        <h2 className="font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft border-b border-rule-strong pb-2 mb-1 flex items-center gap-2">
          <Upload className="h-3.5 w-3.5 text-red" /> Bulk Employee Onboarding
        </h2>
      </div>

      <p className="text-ink-soft text-sm">
        Upload a CSV file with headers:
        <br />
        <code className="text-red text-xs leading-relaxed">
          emp_id, email, first_name, last_name, prefix, gender, thai_id, passport_no,
          department, position, salary, employment_date, resignation_date
        </code>
        <br />
        <span className="text-ink-soft/70 text-xs">prefix: Mr. / Ms. / Mrs. &nbsp;|&nbsp; gender: Male / Female &nbsp;|&nbsp; dates: YYYY-MM-DD</span>
      </p>

      <div className="relative border border-dashed border-rule p-8 flex flex-col items-center justify-center hover:border-red transition-colors group cursor-pointer">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <FileText className={`h-8 w-8 mb-2 transition-colors ${file ? 'text-red' : 'text-ink-soft/50 group-hover:text-ink-soft'}`} />
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
        className="w-full bg-red text-sheet py-3 font-semibold text-xs uppercase tracking-[0.08em] hover:bg-[#6E1224] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
