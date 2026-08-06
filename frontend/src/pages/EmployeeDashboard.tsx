import React, { useState, useEffect } from "react";
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Briefcase,
  Receipt,
  FileBadge,
  Plane,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────
// Translations
// ─────────────────────────────────────────────
const t = {
  TH: {
    bannerTitle: "บริการขอเอกสารออนไลน์ (Self-Service)",
    bannerDesc: "ส่งคำขอออนไลน์ ทีม HR จะจัดเตรียมเอกสารตัวจริงให้คุณมารับที่แผนก HR",
    inQueue: "อยู่ในคิว",
    readyForPickup: "พร้อมรับเอกสาร",
    btnRequest: "กดขอเอกสาร",
    historyTitle: "ประวัติการขอเอกสารล่าสุด",
    thReqId: "รหัสคำขอ",
    thDate: "วันที่",
    thDocType: "ประเภทเอกสาร",
    thReason: "เหตุผล",
    thStatus: "สถานะ",
    thPickup: "การรับเอกสาร",
    pickedUp: "รับเอกสารแล้ว",
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
    bannerDesc: "Submit your request online and HR will prepare the physical document for you to collect.",
    inQueue: "In Queue",
    readyForPickup: "Ready for Pickup",
    btnRequest: "Request Document",
    historyTitle: "Recent Requests",
    thReqId: "Request ID",
    thDate: "Date",
    thDocType: "Document Type",
    thReason: "Reason",
    thStatus: "Status",
    thPickup: "Pickup",
    pickedUp: "Picked Up",
    autoFilled: "* Auto-filled from your profile",
    modalTitle: "Request Details",
    labelLanguage: "Language",
    labelReason: "Reason",
    labelDocInfo: "Document Information",
    btnCancel: "Cancel",
    btnConfirm: "Confirm",
  },
};

const reasonLabels: Record<string, { TH: string; EN: string }> = {
  financial: { TH: "การเงิน / สินเชื่อ", EN: "Financial / Loan" },
  visa: { TH: "ขอวีซ่า", EN: "Visa Application" },
  education: { TH: "การศึกษา", EN: "Education" },
  other: { TH: "อื่นๆ", EN: "Other" },
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
  // Salary cert and employment cert need no extra fields beyond the reason — just request them.
  salary_cert: [],
  emp_cert: [],
  visa_letter: [
    PREFIX_FIELD,
    { key: "total_svc", label: "Total Income (THB)", labelTH: "รายได้รวม (บาท)", type: "number", required: true },
    { key: "country", label: "Destination Country", labelTH: "ประเทศปลายทาง", type: "text", required: true },
    { key: "daparture_date", label: "Departure Date", labelTH: "วันเดินทางออก", type: "date", required: true },
    { key: "last_travel_date", label: "Return Date", labelTH: "วันเดินทางกลับ", type: "date", required: true },
  ],
  payslip_copy: [],
  tax_50: [],
};

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
  const waitingCount = history.filter((h) => h.status === "WAITING_FOR_PICKUP").length;
  const activeFields = selectedDocId ? (TEMPLATE_FIELDS[selectedDocId] || []) : [];
  const hasExtraFields = activeFields.length > 0;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 font-data text-ink">

      {/* Page title + language rail */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-ledger text-[clamp(1.6rem,3vw,2.2rem)] font-medium text-ink leading-tight">
            {text.bannerTitle}
          </h1>
          <p className="text-ink-soft text-sm max-w-2xl mt-1">{text.bannerDesc}</p>
        </div>
        <div className="flex gap-6 border-b border-rule">
          {(['TH', 'EN'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setAppLang(lang)}
              className={`relative pb-2 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                appLang === lang ? 'text-ink' : 'text-ink-soft/60 hover:text-ink-soft'
              }`}
            >
              {lang}
              {appLang === lang && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-red" />}
            </button>
          ))}
        </div>
      </div>

      {/* Balance strip — 2x2 block below ~720px, single row above */}
      <div className="bg-sheet shadow-sheet border border-rule rounded-xl grid grid-cols-2">
        <div className="px-6 py-4 border-r border-rule">
          <p className="font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">{text.inQueue}</p>
          <p className="font-ledger text-[clamp(1.9rem,4vw,2.6rem)] font-semibold text-ink leading-none mt-1.5 flex items-center gap-2">
            {pendingCount}
            {pendingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-status-pending inline-block" />}
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">{text.readyForPickup}</p>
          <p className="font-ledger text-[clamp(1.9rem,4vw,2.6rem)] font-semibold text-ink leading-none mt-1.5 flex items-center gap-2">
            {waitingCount}
            {waitingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-status-interview inline-block" />}
          </p>
        </div>
      </div>

      {/* Document Categories — one Sheet, ruled rows, not cards */}
      <div className="bg-sheet shadow-sheet border border-rule rounded-xl divide-y divide-rule">
        {documentCategories.map((category, idx) => (
          <div key={idx}>
            <div className="px-6 pt-5 pb-2">
              <h2 className="font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft border-b border-rule-strong pb-2">
                {category.title[appLang as 'TH' | 'EN']}
              </h2>
            </div>
            <div className="divide-y divide-rule">
              {category.docIds.map((docId) => {
                const doc = docsData[docId];
                const Icon = doc.icon;
                const fieldCount = TEMPLATE_FIELDS[docId]?.length || 0;
                return (
                  <button
                    key={docId}
                    onClick={() => handleOpenModal(docId)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-sheet-alt transition-colors text-left group"
                  >
                    <Icon className="h-5 w-5 text-red flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-ledger font-semibold text-ink">{doc.name[appLang as 'TH' | 'EN']}</p>
                      {fieldCount > 0 && (
                        <p className="text-xs text-ink-soft mt-0.5">
                          {fieldCount} field{fieldCount > 1 ? 's' : ''} required
                        </p>
                      )}
                    </div>
                    <span className="hidden sm:inline text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-red opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
                      {text.btnRequest}
                    </span>
                    <ChevronRight className="h-4 w-4 text-ink-soft/50 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* History Register */}
      <div>
        <h2 className="font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft border-b-2 border-rule-strong pb-2 mb-0">
          {text.historyTitle}
        </h2>
        <div className="bg-sheet shadow-sheet border border-rule rounded-xl overflow-hidden">

          {/* Desktop/tablet: Register table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="border-b-2 border-rule-strong">
                <tr>
                  <th className="w-10 px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft text-right">#</th>
                  <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">{text.thReqId}</th>
                  <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">{text.thDate}</th>
                  <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">{text.thDocType}</th>
                  <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">{text.thStatus}</th>
                  <th className="px-4 py-3 font-ledger text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft text-right">{text.thPickup}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={6} className="p-8 text-center text-ink-soft">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td></tr>
                )}
                {!isLoading && history.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-ink-soft">No documents requested yet.</td></tr>
                )}
                {history.map((item, i) => (
                  <tr key={item.id} className={`border-b border-rule ${i % 2 === 1 ? 'bg-sheet-alt' : ''}`}>
                    <td className="px-4 py-3 text-ink-soft text-right text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-ink-soft font-medium text-xs">{item.requestId}</td>
                    <td className="px-4 py-3 text-ink-soft">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="font-ledger text-ink">{docsData[item.docType]?.name[appLang as 'TH' | 'EN'] || item.docType}</span>
                      <span className="ml-2 px-1.5 py-0.5 border border-rule text-ink-soft text-[10px] font-semibold uppercase tracking-[0.05em]">{item.docLang}</span>
                    </td>
                    <td className="px-4 py-3">
                      {item.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-pending" />
                          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-status-pending">{text.inQueue}</span>
                        </span>
                      )}
                      {item.status === "WAITING_FOR_PICKUP" && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-interview" />
                          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-status-interview">{text.readyForPickup}</span>
                        </span>
                      )}
                      {item.status === "DONE" && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-approved" />
                          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-status-approved">{text.pickedUp}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.status === "WAITING_FOR_PICKUP" ? (
                        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-red">
                          {appLang === 'TH' ? 'รับที่แผนก HR' : 'Collect at HR desk'}
                        </span>
                      ) : (
                        <span className="text-ink-soft/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden">
            {isLoading && (
              <div className="p-8 text-center text-ink-soft"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
            )}
            {!isLoading && history.length === 0 && (
              <div className="p-8 text-center text-ink-soft">No documents requested yet.</div>
            )}
            {history.map((item, i) => (
              <div key={item.id} className={`px-4 py-3.5 border-b border-rule space-y-1.5 ${i % 2 === 1 ? 'bg-sheet-alt' : ''}`}>
                <div className="flex justify-between items-start gap-3">
                  <span className="font-ledger font-semibold text-ink">{docsData[item.docType]?.name[appLang as 'TH' | 'EN'] || item.docType}</span>
                  <span className="text-ink-soft text-xs flex-shrink-0">{item.requestId}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-ink-soft">
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  <span className="px-1.5 py-0.5 border border-rule text-[10px] font-semibold uppercase tracking-[0.05em]">{item.docLang}</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  {item.status === "PENDING" && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-pending" />
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-status-pending">{text.inQueue}</span>
                    </span>
                  )}
                  {item.status === "WAITING_FOR_PICKUP" && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-interview" />
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-status-interview">{text.readyForPickup}</span>
                    </span>
                  )}
                  {item.status === "DONE" && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-approved" />
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-status-approved">{text.pickedUp}</span>
                    </span>
                  )}
                  {item.status === "WAITING_FOR_PICKUP" ? (
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-red">
                      {appLang === 'TH' ? 'รับที่แผนก HR' : 'Collect at HR desk'}
                    </span>
                  ) : (
                    <span className="text-ink-soft/40 text-xs">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Request Modal ── */}
      {isModalOpen && selectedDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-sheet shadow-overlay rounded-xl w-full max-w-lg z-10 max-h-[90vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-rule flex-shrink-0">
              <h3 className="font-ledger text-[1.125rem] font-semibold text-ink">{text.modalTitle}</h3>
              <button onClick={handleCloseModal} className="text-ink-soft hover:text-ink transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body — scrollable */}
            <div className="overflow-y-auto flex-1">
              <form id="doc-request-form" onSubmit={handleSubmitRequest} className="p-6 space-y-5">

                {/* Document type preview */}
                <div className="flex gap-4 items-center pb-5 border-b border-rule">
                  <div className="p-3 border border-rule text-red flex-shrink-0">
                    {React.createElement(docsData[selectedDocId].icon, { className: "h-5 w-5" })}
                  </div>
                  <div>
                    <p className="font-ledger font-semibold text-ink text-lg">{docsData[selectedDocId].name[appLang as 'TH' | 'EN']}</p>
                    {hasExtraFields && (
                      <p className="text-xs text-ink-soft mt-0.5">{text.autoFilled}</p>
                    )}
                  </div>
                </div>

                {/* Language Selector */}
                <div>
                  <label className="block text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em] mb-2">{text.labelLanguage}</label>
                  <div className="flex gap-3">
                    {(['TH', 'EN'] as const).map((lang) => (
                      <label key={lang} className="flex-1 cursor-pointer">
                        <input type="radio" name="lang" value={lang} checked={docLanguage === lang} onChange={(e) => setDocLanguage(e.target.value)} className="peer sr-only" />
                        <div className="px-4 py-2.5 border border-rule peer-checked:border-red peer-checked:bg-red/5 peer-checked:text-red font-semibold text-xs uppercase tracking-[0.08em] text-center transition-colors text-ink-soft">{lang}</div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Reason Selector */}
                <div>
                  <label className="block text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em] mb-2">{text.labelReason}</label>
                  <div className="relative">
                    <select
                      value={reasonId}
                      onChange={(e) => setReasonId(e.target.value)}
                      className="w-full border border-rule rounded-lg px-4 py-3 font-medium text-ink focus:outline-none focus:border-red focus:shadow-[inset_0_-2px_0_0_#C41230] appearance-none bg-sheet"
                    >
                      {Object.entries(reasonLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label[appLang as 'TH' | 'EN']}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
                  </div>
                </div>

                {/* ── Dynamic Template Fields ── */}
                {hasExtraFields && (
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-rule"></div>
                      <span className="text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em]">{text.labelDocInfo}</span>
                      <div className="h-px flex-1 bg-rule"></div>
                    </div>

                    {activeFields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-[0.6875rem] font-semibold text-ink-soft uppercase tracking-[0.08em] mb-1.5">
                          {appLang === 'TH' ? field.labelTH : field.label}
                          {field.required && <span className="text-status-rejected ml-1">*</span>}
                        </label>

                        {field.type === 'select' ? (
                          <div className="relative">
                            <select
                              id={`field-${field.key}`}
                              value={templateFields[field.key] || ''}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              required={field.required}
                              className="w-full border border-rule rounded-lg px-4 py-3 font-medium text-ink focus:outline-none focus:border-red focus:shadow-[inset_0_-2px_0_0_#C41230] appearance-none bg-sheet"
                            >
                              <option value="" disabled>Select…</option>
                              {field.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
                          </div>
                        ) : field.type === 'date' ? (
                          <input
                            id={`field-${field.key}`}
                            type="date"
                            value={templateFields[field.key] || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            required={field.required}
                            className="w-full border border-rule rounded-lg px-4 py-3 font-medium text-ink focus:outline-none focus:border-red focus:shadow-[inset_0_-2px_0_0_#C41230] bg-sheet"
                          />
                        ) : (
                          <input
                            id={`field-${field.key}`}
                            type={field.type}
                            value={templateFields[field.key] || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            required={field.required}
                            placeholder={appLang === 'TH' ? field.labelTH : field.label}
                            className="w-full border border-rule rounded-lg px-4 py-3 font-medium text-ink placeholder-ink-soft/40 focus:outline-none focus:border-red focus:shadow-[inset_0_-2px_0_0_#C41230] bg-sheet"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 flex gap-3 flex-shrink-0 border-t border-rule">
              <button type="button" onClick={handleCloseModal} className="flex-1 py-3 px-4 border border-rule text-ink-soft hover:text-ink hover:border-rule-strong font-semibold text-xs uppercase tracking-[0.08em] transition-colors">{text.btnCancel}</button>
              <button
                type="submit"
                form="doc-request-form"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-red text-sheet hover:bg-[#6E1224] font-semibold text-xs uppercase tracking-[0.08em] flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
              >
                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> …</> : text.btnConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
