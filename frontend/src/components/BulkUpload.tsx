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
    <div className="bg-brand-surface rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Upload className="h-6 w-6 text-brand-red" />
        <h2 className="text-xl font-semibold text-white">Bulk Employee Onboarding</h2>
      </div>
      
      <p className="text-stone-400 text-sm">
        Upload a CSV file with headers: <code className="text-brand-red">emp_id, first_name, last_name, email, thai_id, department, position</code>
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
