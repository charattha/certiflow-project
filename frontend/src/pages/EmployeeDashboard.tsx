import React, { useState, useEffect } from "react";
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Briefcase, Receipt, FileBadge, Plane,
  Clock, CheckCircle, Download, X, Loader2, ChevronDown,
} from "lucide-react";

const t = {
  TH: {
    bannerTitle: "บริการขอเอกสารออนไลน์ (Self-Service)",
    bannerDesc: "ระบบจัดการคำขอใบรับรองเงินเดือนและเอกสารส่วนบุคคล ดำเนินการอัตโนมัติ เอกสารจะถูกส่งตรงถึงอีเมลบริษัทของคุณ",
    processing: "กำลังดำเนินการเอกสาร",
    btnRequest: "กดขอเอกสาร",
    historyTitle: "ประวัติการขอเอกสารล่าสุด",
    thReqId: "รหัสคำขอ",
    thDate: "วันที่",
    thDocType: "ประเภทเอกสาร",
    thStatus: "สถานะ",
    thDownload: "ดาวน์โหลด",
    modalTitle: "รายละเอียดคำขอ",
    labelLanguage: "ภาษา",
    labelReason: "เหตุผล",
    labelVisaInfo: "ข้อมูลวีซ่า",
    autoFilled: "* ข้อมูลจะถูกดึงจากโปรไฟล์ของคุณโดยอัตโนมัติ",
    btnCancel: "ยกเลิก",
    btnConfirm: "ยืนยัน",
  },
  EN: {
    bannerTitle: "Online Document Request (Self-Service)",
    bannerDesc: "Automated processing — all data is fetched from your profile. Documents are generated instantly.",
    processing: "Processing",
    btnRequest: "Request Document",
    historyTitle: "Recent Requests",
    thReqId: "Request ID",
    thDate: "Date",
    thDocType: "Document Type",
    thStatus: "Status",
    thDownload: "Download",
    modalTitle: "Request Details",
    labelLanguage: "Language",
    labelReason: "Reason",
    labelVisaInfo: "Visa Information",
    autoFilled: "* All details are auto-filled from your profile",
    btnCancel: "Cancel",
    btnConfirm: "Confirm",
  },
};

const docsData: any = {
  salary_cert:  { name: { TH: "ใบรับรองเงินเดือน",               EN: "Salary Certificate" },       icon: FileText  },
  payslip_copy: { name: { TH: "สลิปเงินเดือนย้อนหลัง",            EN: "Payslip Reprint" },           icon: Receipt   },
  tax_50:       { name: { TH: "หนังสือรับรองการหักภาษี (ทวิ 50)",  EN: "Withholding Tax Cert." },     icon: FileBadge },
  emp_cert:     { name: { TH: "หนังสือรับรองการทำงาน",             EN: "Employment Certificate" },    icon: Briefcase },
  visa_letter:  { name: { TH: "หนังสือรับรองเพื่อขอวีซ่า",         EN: "Visa Application Letter" },  icon: Plane     },
};

const documentCategories = [
  { title: { TH: "หมวดรายได้และภาษี", EN: "Income & Tax" },  docIds: ["salary_cert", "payslip_copy", "tax_50"] },
  { title: { TH: "หมวดการจ้างงาน",    EN: "Employment" },     docIds: ["emp_cert", "visa_letter"] },
];

// ─────────────────────────────────────────────
// Template Fields (user-input, per doc type)
// ─────────────────────────────────────────────
interface FieldDef {
  key: string;
  label: string;
  labelTH: string;
  type: 'text' | 'date' | 'select' | 'number';
  required: boolean;
  options?: { value: string; label: string }[];
}

const TEMPLATE_FIELDS: Record<string, FieldDef[]> = {
  salary_cert: [],
  emp_cert: [],
  visa_letter: [], payslip_copy: [], tax_50: [],
};

interface VisaFields {
  country_prefer_travel: string;
  departure_date: string;
  last_travel_date: string;
  arrival_date: string;
  on_duty_date: string;
}

export default function EmployeeDashboard() {
  const { token } = useAuth();
  const [appLang, setAppLang] = useState("EN");
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reasonId, setReasonId] = useState("financial");
  const [docLanguage, setDocLanguage] = useState("TH");
  const [templateFields, setTemplateFields] = useState<Record<string, string>>({});
  const [visaFields, setVisaFields] = useState<VisaFields>({
    country_prefer_travel: '',
    departure_date: '',
    last_travel_date: '',
    arrival_date: '',
    on_duty_date: '',
  });

  const text = t[appLang as 'TH' | 'EN'];
  const isVisa = selectedDocId === 'visa_letter';
  const activeFields = selectedDocId ? (TEMPLATE_FIELDS[selectedDocId] ?? []) : [];

  useEffect(() => { fetchRequests(); }, [token]);
  useEffect(() => {
    setVisaFields({ country_prefer_travel: '', departure_date: '', last_travel_date: '', arrival_date: '', on_duty_date: '' });
    setTemplateFields({});
  }, [selectedDocId]);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/employee/requests', { headers: { Authorization: `Bearer ${token}` } });
      setHistory(res.data);
    } catch (e) {
      console.error('Error fetching requests', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/api/employee/requests', {
        doc_type: selectedDocId,
        doc_lang: docLanguage,
        reason: reasonId,
        ...(activeFields.length > 0 ? { template_fields: templateFields } : {}),
        ...(isVisa ? visaFields : {}),
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchRequests();
      setIsModalOpen(false);
      setSelectedDocId(null);
    } catch (e) {
      console.error('Failed to submit request', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = history.filter((h) => h.status === "PENDING").length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8 font-sans">

      {/* Banner */}
      <div className="bg-gradient-to-r from-brand-red to-[#8A0524] rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-brand-red/20">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-semibold mb-2 text-white">{text.bannerTitle}</h1>
          <p className="text-white/80 font-light max-w-2xl text-sm md:text-base">{text.bannerDesc}</p>
          {pendingCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white py-2 px-4 rounded-lg text-sm font-medium border border-white/20 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {text.processing} {pendingCount} files
            </div>
          )}
        </div>
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl" />
      </div>

      {/* Document Categories */}
      <div className="space-y-8">
        {documentCategories.map((category, idx) => (
          <div key={idx} className="space-y-4">
            <h2 className="text-xl font-medium text-white border-b border-white/10 pb-2">
              {category.title[appLang as 'TH' | 'EN']}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.docIds.map((docId) => {
                const doc = docsData[docId];
                const Icon = doc.icon;
                return (
                  <div key={docId} className="bg-brand-surface rounded-xl border border-white/10 shadow-lg p-6 hover:-translate-y-1 hover:shadow-2xl transition-all flex flex-col h-full group">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-black/20 border border-white/5 group-hover:bg-brand-red/10 group-hover:border-brand-red/20 transition-colors">
                        <Icon className="h-6 w-6 text-brand-red" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{doc.name[appLang as 'TH' | 'EN']}</h3>
                        <p className="text-xs text-stone-500 mt-1">
                          {(TEMPLATE_FIELDS[docId]?.length ?? 0) > 0
                            ? `${TEMPLATE_FIELDS[docId].length} field${TEMPLATE_FIELDS[docId].length > 1 ? 's' : ''} required`
                            : docId === 'visa_letter' ? 'Requires travel details' : 'Auto-filled from profile'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto pt-4">
                      <button
                        onClick={() => { setSelectedDocId(docId); setIsModalOpen(true); }}
                        className="w-full py-2.5 px-4 bg-white/5 hover:bg-brand-red hover:text-white border border-transparent hover:border-brand-red font-medium rounded-lg transition-all text-stone-300"
                      >
                        {text.btnRequest}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="bg-brand-surface rounded-xl shadow-2xl border border-white/10 overflow-hidden">
        <div className="p-4 md:p-5 border-b border-white/10 bg-[#211E1F] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-lg font-medium text-white">{text.historyTitle}</h2>
          <div className="flex gap-2 w-full md:w-auto bg-black/20 p-1 rounded-lg border border-white/5">
            <button onClick={() => setAppLang('TH')} className={`flex-1 md:flex-none px-4 py-1.5 font-medium text-sm rounded-md transition-all ${appLang === 'TH' ? 'bg-white/10 text-white border border-white/10' : 'text-stone-400 hover:text-stone-300'}`}>TH</button>
            <button onClick={() => setAppLang('EN')} className={`flex-1 md:flex-none px-4 py-1.5 font-medium text-sm rounded-md transition-all ${appLang === 'EN' ? 'bg-white/10 text-white border border-white/10' : 'text-stone-400 hover:text-stone-300'}`}>EN</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#211E1F] text-stone-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">{text.thReqId}</th>
                <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">{text.thDate}</th>
                <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">{text.thDocType}</th>
                <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">{text.thStatus}</th>
                <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs text-right">{text.thDownload}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-medium bg-brand-surface text-stone-200">
              {isLoading && <tr><td colSpan={5} className="p-4 text-center text-brand-red">Loading...</td></tr>}
              {!isLoading && history.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-stone-500">No documents requested yet.</td></tr>}
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-stone-400 font-mono text-xs">{item.request_id}</td>
                  <td className="px-6 py-4 text-stone-400">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className="text-white">{docsData[item.doc_type]?.name[appLang as 'TH' | 'EN'] || item.doc_type}</span>
                    <span className="ml-2 px-2 py-0.5 border border-brand-red/30 rounded-md bg-brand-red/20 text-brand-red text-xs font-medium">{item.doc_lang}</span>
                  </td>
                  <td className="px-6 py-4">
                    {item.status === "PENDING" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Clock className="h-3.5 w-3.5" /> In Queue
                      </span>
                    ) : item.status === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="h-3.5 w-3.5" /> Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        <X className="h-3.5 w-3.5" /> Rejected
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.status === "COMPLETED" && item.file_url ? (
                      <a href={item.file_url} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white border border-white/5 rounded-lg font-medium hover:bg-white/20 transition-all" download>
                        <Download className="h-4 w-4" /> DOCX
                      </a>
                    ) : (
                      <span className="text-stone-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setSelectedDocId(null); }} />
          <div className="relative bg-brand-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden z-10 border border-white/10 max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-[#211E1F] flex-shrink-0">
              <h3 className="font-semibold text-xl text-white">{text.modalTitle}</h3>
              <button onClick={() => { setIsModalOpen(false); setSelectedDocId(null); }} className="text-stone-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              <form id="doc-request-form" onSubmit={handleSubmitRequest} className="p-6 space-y-5">

                {/* Doc type preview */}
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex gap-4 items-center">
                  <div className="p-3 bg-brand-red/10 border border-brand-red/20 rounded-lg text-brand-red flex-shrink-0">
                    {React.createElement(docsData[selectedDocId].icon, { className: "h-6 w-6" })}
                  </div>
                  <div>
                    <p className="font-medium text-white text-lg">{docsData[selectedDocId].name[appLang as 'TH' | 'EN']}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{text.autoFilled}</p>
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-stone-300 tracking-wide uppercase mb-2">{text.labelLanguage}</label>
                  <div className="flex gap-4">
                    {['TH', 'EN'].map((lang) => (
                      <label key={lang} className="flex-1 cursor-pointer">
                        <input type="radio" name="lang" value={lang} checked={docLanguage === lang} onChange={(e) => setDocLanguage(e.target.value)} className="peer sr-only" />
                        <div className="px-4 py-3 border border-white/10 rounded-xl peer-checked:border-brand-red peer-checked:bg-brand-red/10 peer-checked:text-brand-red font-medium text-center transition-all bg-black/20 text-stone-400">{lang}</div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-stone-300 tracking-wide uppercase mb-2">{text.labelReason}</label>
                  <div className="relative">
                    <select value={reasonId} onChange={(e) => setReasonId(e.target.value)} className="w-full border border-white/10 rounded-lg px-4 py-3 font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand-red appearance-none bg-black/20">
                      <option value="financial">Financial / Loan</option>
                      <option value="visa">Visa Application</option>
                      <option value="education">Education</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  </div>
                </div>

                {/* Template fields (prefix, employment dates) */}
                {activeFields.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">
                        {appLang === 'TH' ? 'ข้อมูลสำหรับเอกสาร' : 'Document Information'}
                      </span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                    {activeFields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-stone-300 mb-1.5">
                          {appLang === 'TH' ? field.labelTH : field.label}
                          {field.required && <span className="text-brand-red ml-1">*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <div className="relative">
                            <select
                              value={templateFields[field.key] || ''}
                              onChange={(e) => setTemplateFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                              required={field.required}
                              className="w-full border border-white/10 rounded-lg px-4 py-3 font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand-red appearance-none bg-black/20"
                            >
                              <option value="" disabled>Select…</option>
                              {field.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                          </div>
                        ) : (
                          <input
                            type={field.type}
                            value={templateFields[field.key] || ''}
                            onChange={(e) => setTemplateFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                            required={field.required}
                            className="w-full border border-white/10 rounded-lg px-4 py-3 font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand-red bg-black/20 [color-scheme:dark]"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Visa-only fields */}
                {isVisa && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">{text.labelVisaInfo}</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    {[
                      { key: 'country_prefer_travel', label: 'Destination Country', labelTH: 'ประเทศปลายทาง', type: 'text' },
                      { key: 'departure_date',        label: 'Departure Date',      labelTH: 'วันเดินทางออก',    type: 'date' },
                      { key: 'last_travel_date',      label: 'Return Date',         labelTH: 'วันเดินทางกลับ',   type: 'date' },
                      { key: 'arrival_date',          label: 'Arrival Date',        labelTH: 'วันที่เดินทางถึง', type: 'date' },
                      { key: 'on_duty_date',          label: 'First Day Back on Duty', labelTH: 'วันแรกที่กลับมาทำงาน', type: 'date' },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-stone-300 mb-1.5">
                          {appLang === 'TH' ? field.labelTH : field.label}
                          <span className="text-brand-red ml-1">*</span>
                        </label>
                        <input
                          type={field.type}
                          value={visaFields[field.key as keyof VisaFields]}
                          onChange={(e) => setVisaFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                          required
                          className="w-full border border-white/10 rounded-lg px-4 py-3 font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand-red bg-black/20 [color-scheme:dark]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex flex-row items-center justify-center gap-4 flex-shrink-0 border-t border-white/10 bg-[#211E1F]">
              <button type="button" onClick={() => { setIsModalOpen(false); setSelectedDocId(null); }} className="w-40 py-3 text-center bg-white/5 border border-white/10 text-stone-300 hover:bg-white/10 rounded-lg font-medium transition-all">{text.btnCancel}</button>
              <button type="submit" form="doc-request-form" disabled={isSubmitting} className="w-40 py-3 text-center bg-brand-red text-white hover:bg-[#8A0524] rounded-lg font-medium flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(160,7,43,0.3)] transition-all active:scale-[0.98]">
                {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> …</> : text.btnConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
