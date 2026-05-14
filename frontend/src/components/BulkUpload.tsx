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
    <div className="bg-brand-surface rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Upload className="h-6 w-6 text-brand-red" />
        <h2 className="text-xl font-semibold text-white">Bulk Employee Onboarding</h2>
      </div>
      
      <p className="text-stone-400 text-sm">
        Upload a CSV file with headers:
      <br />
      <code className="text-brand-red text-xs leading-relaxed">
        emp_id, email, first_name, last_name, prefix, gender, thai_id, passport_no,
        department, position, salary, employment_date, resignation_date
      </code>
      <br />
      <span className="text-stone-500 text-xs">prefix: Mr. / Ms. / Mrs. &nbsp;|&nbsp; gender: Male / Female &nbsp;|&nbsp; dates: YYYY-MM-DD</span>
      </p>

      <div className="relative border-2 border-dashed border-white/10 rounded-lg p-8 flex flex-col items-center justify-center hover:border-brand-red/50 transition-colors group cursor-pointer">
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <FileText className={`h-10 w-10 mb-2 transition-colors ${file ? 'text-brand-red' : 'text-stone-500 group-hover:text-stone-400'}`} />
        <p className="text-stone-300 font-medium">
          {file ? file.name : 'Click or drag CSV file to upload'}
        </p>
      </div>

      {status && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{status.message}</span>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="w-full bg-brand-red text-white py-3 rounded-lg font-semibold shadow-lg hover:bg-[#8A0524] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isUploading ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
        ) : (
          <><Upload className="h-5 w-5" /> Import Employees</>
        )}
      </button>
    </div>
  );
}
