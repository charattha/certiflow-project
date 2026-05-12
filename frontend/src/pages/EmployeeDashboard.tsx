import React, { useState, useEffect } from "react";
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Briefcase,
  Receipt,
  FileBadge,
  Plane,
  Clock,
  CheckCircle,
  Download,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";

// ─────────────────────────────────────────────
// Translations
// ─────────────────────────────────────────────
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
    thReason: "เหตุผล",
    thStatus: "สถานะ",
    thDownload: "ดาวน์โหลด",
    autoFilled: "* กรอกอัตโนมัติจากโปรไฟล์ของคุณ",
    modalTitle: "รายละเอียดคำขอ",
    labelLanguage: "ภาษา",
    labelReason: "เหตุผล",
    labelDocInfo: "ข้อมูลสำหรับเอกสาร",
    btnCancel: "ยกเลิก",
    btnConfirm: "ยืนยัน",
  },
  EN: {
    bannerTitle: "Online Document Request (Self-Service)",
    bannerDesc: "Automated processing for salary certificates and personal employment documents.",
    processing: "Processing",
    btnRequest: "Request Document",
    historyTitle: "Recent Requests",
    thReqId: "Request ID",
    thDate: "Date",
    thDocType: "Document Type",
    thReason: "Reason",
    thStatus: "Status",
    thDownload: "Download",
    autoFilled: "* Auto-filled from your profile",
    modalTitle: "Request Details",
    labelLanguage: "Language",
    labelReason: "Reason",
    labelDocInfo: "Document Information",
    btnCancel: "Cancel",
    btnConfirm: "Confirm",
  },
};

// ─────────────────────────────────────────────
// Document Type Metadata
// ─────────────────────────────────────────────
const docsData: any = {
  salary_cert: { name: { TH: "ใบรับรองเงินเดือน", EN: "Salary Certificate" }, icon: FileText },
  payslip_copy: { name: { TH: "สลิปเงินเดือนย้อนหลัง", EN: "Payslip Reprint" }, icon: Receipt },
  tax_50: { name: { TH: "หนังสือรับรองการหักภาษี (ทวิ 50)", EN: "Withholding Tax Cert." }, icon: FileBadge },
  emp_cert: { name: { TH: "หนังสือรับรองการทำงาน", EN: "Employment Certificate" }, icon: Briefcase },
  visa_letter: { name: { TH: "หนังสือรับรองเพื่อขอวีซ่า", EN: "Visa Application Letter" }, icon: Plane },
};

const documentCategories = [
  { title: { TH: "หมวดรายได้และภาษี", EN: "Income & Tax" }, docIds: ["salary_cert", "payslip_copy", "tax_50"] },
  { title: { TH: "หมวดการจ้างงาน", EN: "Employment" }, docIds: ["emp_cert", "visa_letter"] },
];

// ─────────────────────────────────────────────
// Template Field Definitions (mirrors backend/src/utils/templateFields.ts)
// These are the ONLY fields shown to the user — auto-filled fields are excluded.
// ─────────────────────────────────────────────
interface FieldDef {
  key: string;
  label: string;
  labelTH: string;
  type: "text" | "date" | "select" | "number";
  required: boolean;
  options?: { value: string; label: string }[];
}

const PREFIX_FIELD: FieldDef = {
  key: "prefix",
  label: "Title / Prefix",
  labelTH: "คำนำหน้า",
  type: "select",
  required: true,
  options: [
    { value: "Mr.", label: "Mr." },
    { value: "Ms.", label: "Ms." },
    { value: "Mrs.", label: "Mrs." },
  ],
};

const TEMPLATE_FIELDS: Record<string, FieldDef[]> = {
  salary_cert: [
    PREFIX_FIELD,
    { key: "employment_date", label: "Employment Start Date", labelTH: "วันที่เริ่มงาน", type: "date", required: true },
  ],
  emp_cert: [
    PREFIX_FIELD,
    { key: "employment_date", label: "Employment Start Date", labelTH: "วันที่เริ่มงาน", type: "date", required: true },
    { key: "last_working_date", label: "Last Working Date", labelTH: "วันสิ้นสุดการทำงาน", type: "date", required: true },
  ],
  visa_letter: [
    PREFIX_FIELD,
    { key: "salary", label: "Monthly Salary (THB)", labelTH: "เงินเดือน (บาท)", type: "number", required: true },
    { key: "svc_monthly", label: "Monthly Service Charge (THB)", labelTH: "ค่าบริการรายเดือน (บาท)", type: "number", required: true },
    { key: "total_svc", label: "Total Income (THB)", labelTH: "รายได้รวม (บาท)", type: "number", required: true },
    { key: "country", label: "Destination Country", labelTH: "ประเทศปลายทาง", type: "text", required: true },
    { key: "daparture_date", label: "Departure Date", labelTH: "วันเดินทางออก", type: "date", required: true },
    { key: "last_travel_date", label: "Return Date", labelTH: "วันเดินทางกลับ", type: "date", required: true },
    { key: "arrival_date", label: "Arrival Date", labelTH: "วันที่เดินทางถึง", type: "date", required: true },
    { key: "first_date_on_duty_date", label: "First Day Back on Duty", labelTH: "วันแรกที่กลับมาทำงาน", type: "date", required: true },
  ],
  payslip_copy: [],
  tax_50: [],
};

// ─────────────────────────────────────────────
// Auto-filled field badges (shown for info)
// ─────────────────────────────────────────────
const AUTO_FILL_LABELS = ["Date", "First Name", "Last Name", "Position", "Department"];

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function EmployeeDashboard() {
  const { token } = useAuth();
  const [appLang, setAppLang] = useState("EN");
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reasonId, setReasonId] = useState("financial");
  const [docLanguage, setDocLanguage] = useState("TH");

  // Dynamic template field values
  const [templateFields, setTemplateFields] = useState<Record<string, string>>({});

  const text = t[appLang as 'TH' | 'EN'];

  useEffect(() => {
    fetchRequests();
  }, [token]);

  // Reset template fields when a new doc type is selected
  useEffect(() => {
    setTemplateFields({});
  }, [selectedDocId]);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/employee/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch (e) {
      console.error('Error fetching requests', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (docId: string) => {
    setSelectedDocId(docId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDocId(null);
  };

  const handleFieldChange = (key: string, value: string) => {
    setTemplateFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post('/api/employee/requests', {
        docType: selectedDocId,
        docLang: docLanguage,
        reason: reasonId,
        templateFields,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
      handleCloseModal();
    } catch (e) {
      console.error('Failed to submit request', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = history.filter((h) => h.status === "PENDING").length;
  const activeFields = selectedDocId ? (TEMPLATE_FIELDS[selectedDocId] || []) : [];
  const hasExtraFields = activeFields.length > 0;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8 font-sans">
      
      {/* Modern Luxury Banner */}
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
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
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
                const fieldCount = TEMPLATE_FIELDS[docId]?.length || 0;
                return (
                  <div key={docId} className="bg-brand-surface rounded-xl border border-white/10 shadow-lg p-6 hover:-translate-y-1 hover:shadow-2xl transition-all flex flex-col h-full group">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-black/20 border border-white/5 group-hover:bg-brand-red/10 group-hover:border-brand-red/20 transition-colors">
                        <Icon className="h-6 w-6 text-brand-red" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{doc.name[appLang as 'TH' | 'EN']}</h3>
                        {fieldCount > 0 && (
                          <p className="text-xs text-stone-500 mt-1">
                            {fieldCount} field{fieldCount > 1 ? 's' : ''} required
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto pt-4">
                      <button
                        onClick={() => handleOpenModal(docId)}
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
        <div className="p-4 md:p-5 border-b border-white/10 bg-[#211E1F] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
          <h2 className="text-lg font-medium text-white">{text.historyTitle}</h2>
          <div className="flex gap-2 w-full md:w-auto bg-black/20 p-1 rounded-lg border border-white/5">
            <button onClick={() => setAppLang('TH')} className={`flex-1 md:flex-none px-4 py-1.5 font-medium text-sm rounded-md transition-all ${appLang === 'TH' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-stone-400 hover:text-stone-300'}`}>TH</button>
            <button onClick={() => setAppLang('EN')} className={`flex-1 md:flex-none px-4 py-1.5 font-medium text-sm rounded-md transition-all ${appLang === 'EN' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-stone-400 hover:text-stone-300'}`}>EN</button>
          </div>
        </div>
        <div className="p-0 overflow-x-auto">
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
                  <td className="px-6 py-4 text-stone-400 font-mono text-xs">{item.requestId}</td>
                  <td className="px-6 py-4 text-stone-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className="text-white">{docsData[item.docType]?.name[appLang as 'TH' | 'EN'] || item.docType}</span>
                    <span className="ml-2 px-2 py-0.5 border border-brand-red/30 rounded-md bg-brand-red/20 text-brand-red text-xs font-medium">{item.docLang}</span>
                  </td>
                  <td className="px-6 py-4">
                    {item.status === "PENDING" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Clock className="h-3.5 w-3.5" /> In Queue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="h-3.5 w-3.5" /> Completed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.status === "COMPLETED" && item.fileUrl ? (
                      <a
                        href={`/api/employee${item.fileUrl}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white border border-white/5 rounded-lg font-medium hover:bg-white/20 hover:shadow-md transition-all"
                        download
                      >
                        <Download className="h-4 w-4" /> DOCX
                      </a>
                    ) : (
                      <span className="text-stone-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Request Modal ── */}
      {isModalOpen && selectedDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-brand-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden z-10 animate-in fade-in zoom-in-95 border border-white/10 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-[#211E1F] flex-shrink-0">
              <h3 className="font-semibold text-xl text-white">{text.modalTitle}</h3>
              <button onClick={handleCloseModal} className="text-stone-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Body — scrollable */}
            <div className="overflow-y-auto flex-1">
              <form id="doc-request-form" onSubmit={handleSubmitRequest} className="p-6 space-y-5">
                
                {/* Document type preview */}
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 shadow-sm flex gap-4 items-center">
                  <div className="p-3 bg-brand-red/10 border border-brand-red/20 rounded-lg text-brand-red flex-shrink-0">
                    {React.createElement(docsData[selectedDocId].icon, { className: "h-6 w-6" })}
                  </div>
                  <div>
                    <p className="font-medium text-white text-lg">{docsData[selectedDocId].name[appLang as 'TH' | 'EN']}</p>
                    {hasExtraFields && (
                      <p className="text-xs text-stone-500 mt-0.5">{text.autoFilled}</p>
                    )}
                  </div>
                </div>

                {/* Language Selector */}
                <div>
                  <label className="block text-sm font-medium text-stone-300 tracking-wide uppercase mb-2">{text.labelLanguage}</label>
                  <div className="flex gap-4">
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="lang" value="TH" checked={docLanguage === "TH"} onChange={(e) => setDocLanguage(e.target.value)} className="peer sr-only" />
                      <div className="px-4 py-3 border border-white/10 rounded-xl peer-checked:border-brand-red peer-checked:bg-brand-red/10 peer-checked:text-brand-red font-medium text-center transition-all bg-black/20 text-stone-400 shadow-sm">TH</div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="lang" value="EN" checked={docLanguage === "EN"} onChange={(e) => setDocLanguage(e.target.value)} className="peer sr-only" />
                      <div className="px-4 py-3 border border-white/10 rounded-xl peer-checked:border-brand-red peer-checked:bg-brand-red/10 peer-checked:text-brand-red font-medium text-center transition-all bg-black/20 text-stone-400 shadow-sm">EN</div>
                    </label>
                  </div>
                </div>

                {/* Reason Selector */}
                <div>
                  <label className="block text-sm font-medium text-stone-300 tracking-wide uppercase mb-2">{text.labelReason}</label>
                  <div className="relative">
                    <select
                      value={reasonId}
                      onChange={(e) => setReasonId(e.target.value)}
                      className="w-full border border-white/10 rounded-lg px-4 py-3 font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand-red shadow-sm appearance-none bg-black/20"
                    >
                      <option value="financial">Financial / Loan</option>
                      <option value="visa">Visa Application</option>
                      <option value="education">Education</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  </div>
                </div>

                {/* ── Dynamic Template Fields ── */}
                {hasExtraFields && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/10"></div>
                      <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">{text.labelDocInfo}</span>
                      <div className="h-px flex-1 bg-white/10"></div>
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
                              id={`field-${field.key}`}
                              value={templateFields[field.key] || ''}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              required={field.required}
                              className="w-full border border-white/10 rounded-lg px-4 py-3 font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand-red shadow-sm appearance-none bg-black/20"
                            >
                              <option value="" disabled>Select…</option>
                              {field.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                          </div>
                        ) : field.type === 'date' ? (
                          <input
                            id={`field-${field.key}`}
                            type="date"
                            value={templateFields[field.key] || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            required={field.required}
                            className="w-full border border-white/10 rounded-lg px-4 py-3 font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand-red shadow-sm bg-black/20 [color-scheme:dark]"
                          />
                        ) : (
                          <input
                            id={`field-${field.key}`}
                            type={field.type}
                            value={templateFields[field.key] || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            required={field.required}
                            placeholder={appLang === 'TH' ? field.labelTH : field.label}
                            className="w-full border border-white/10 rounded-lg px-4 py-3 font-medium text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-red shadow-sm bg-black/20"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-0 flex gap-4 flex-shrink-0 border-t border-white/10 bg-[#211E1F]">
              <button type="button" onClick={handleCloseModal} className="flex-1 py-3 px-4 bg-white/5 border border-white/10 text-stone-300 hover:bg-white/10 rounded-lg font-medium shadow-sm transition-all">{text.btnCancel}</button>
              <button
                type="submit"
                form="doc-request-form"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-brand-red text-white hover:bg-[#8A0524] rounded-lg font-medium flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(160,7,43,0.3)] hover:shadow-[0_0_25px_rgba(160,7,43,0.5)] transition-all active:scale-[0.98]"
              >
                {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> …</> : text.btnConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
