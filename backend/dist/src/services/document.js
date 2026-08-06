"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDocument = generateDocument;
exports.triggerDocumentGeneration = triggerDocumentGeneration;
const pdf_lib_1 = require("pdf-lib");
const fontkit_1 = __importDefault(require("@pdf-lib/fontkit"));
const supabase_1 = require("../utils/supabase");
const Sarabun_Regular_ttf_1 = __importDefault(require("../templates/Sarabun-Regular.ttf"));
// ---------- helpers ----------
function formatDate(date) {
    if (!date)
        return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "2-digit",
    });
}
function pronouns(prefix) {
    var _a;
    const p = (_a = prefix === null || prefix === void 0 ? void 0 : prefix.toLowerCase()) !== null && _a !== void 0 ? _a : "";
    if (p.includes("mrs") || p.includes("ms"))
        return { subj: "she", obj: "her", poss: "her" };
    return { subj: "he", obj: "him", poss: "his" };
}
function wrapText(text, font, size, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (line && font.widthOfTextAtSize(test, size) > maxWidth) {
            lines.push(line);
            line = word;
        }
        else {
            line = test;
        }
    }
    if (line)
        lines.push(line);
    return lines;
}
function drawParagraph(page, text, x, y, size, font, maxWidth, lineSpacing = 1.55, center = false, pageWidth = 595.28) {
    const lh = size * lineSpacing;
    for (const line of wrapText(text, font, size, maxWidth)) {
        const drawX = center
            ? (pageWidth - font.widthOfTextAtSize(line, size)) / 2
            : x;
        page.drawText(line, { x: drawX, y, size, font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
        y -= lh;
    }
    return y;
}
function buildPDF(paragraphs) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const pdfDoc = yield pdf_lib_1.PDFDocument.create();
        pdfDoc.registerFontkit(fontkit_1.default);
        const font = yield pdfDoc.embedFont(Sarabun_Regular_ttf_1.default);
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();
        const mx = 72;
        const maxWidth = width - mx * 2;
        const fs = 11;
        const gap = fs * 0.9;
        let y = height - 72;
        for (const para of paragraphs) {
            if (!para) {
                y -= fs * 1.4;
            }
            else {
                const size = (_a = para.size) !== null && _a !== void 0 ? _a : fs;
                const lineGap = size * 0.9;
                y = drawParagraph(page, para.text, mx, y, size, font, maxWidth, 1.55, (_b = para.center) !== null && _b !== void 0 ? _b : false, width);
                y -= lineGap;
            }
        }
        return pdfDoc.save();
    });
}
// ---------- per-doc builders ----------
function buildSalaryCertParagraphs(data) {
    var _a;
    const p = pronouns((_a = data.prefix) !== null && _a !== void 0 ? _a : "");
    const hasSalary = !!data.salary;
    const hasSvc = !!data.svc_monthly;
    // Salary breakdown line
    let incomeStatement = "";
    if (hasSalary && hasSvc) {
        incomeStatement = `${p.poss.charAt(0).toUpperCase() + p.poss.slice(1)} current monthly remuneration consists of a base salary of THB ${data.salary} and a service charge of THB ${data.svc_monthly} (as of ${data.svc_period}), totalling THB ${data.total_income} per month.`;
    }
    else if (hasSalary) {
        incomeStatement = `${p.poss.charAt(0).toUpperCase() + p.poss.slice(1)} current monthly base salary is THB ${data.salary}.`;
    }
    return [
        { text: "SALARY CERTIFICATE", size: 15, center: true },
        null,
        { text: data.date_now },
        null,
        { text: "To Whom It May Concern" },
        null,
        {
            text: `This is to certify that ${data.prefix} ${data.first_name} ${data.last_name} has been employed by TCC Hotel Asset Management Company Limited as the company managing Bangkok Marriott Marquis Queen's Park since ${data.employment_date} to present in the position of ${data.position} in the ${data.department} Department.`,
        },
        null,
        ...(incomeStatement ? [{ text: incomeStatement }, null] : []),
        {
            text: `During ${p.poss} stay, any assistance extended to ${p.obj} would be greatly appreciated. Should you require any further information, please feel free to contact me.`,
        },
        null,
        { text: "Sincerely yours," },
        null,
        null,
        null,
        { text: "Preechayaporn Poungponprom" },
        { text: "Assistant Director of Human Resources" },
        { text: "Bangkok Marriott Marquis Queen's Park" },
    ];
}
function buildEmpCertParagraphs(data) {
    var _a;
    const p = pronouns((_a = data.prefix) !== null && _a !== void 0 ? _a : "");
    return [
        { text: "EMPLOYMENT CERTIFICATE", size: 15, center: true },
        null,
        { text: data.date_now },
        null,
        { text: "To Whom It May Concern" },
        null,
        {
            text: `This is to certify that ${data.prefix} ${data.first_name} ${data.last_name} has been employed by Bangkok Marriott Marquis Queen's Park since ${data.employment_date} to ${data.last_working_date} in the position of ${data.position} in the ${data.department} Department.`,
        },
        null,
        {
            text: `${data.prefix} ${data.last_name} resigned on ${p.poss} own accord and we wish every success in ${p.poss} future endeavor. We wish to express our appreciation for ${p.poss} contribution during the employment with us and our best wishes are accompanying ${p.obj} for the future career.`,
        },
        null,
        { text: "Sincerely yours," },
        null,
        null,
        null,
        { text: "Preechayaporn Poungponprom" },
        { text: "Assistant Director of Human Resources" },
        { text: "Bangkok Marriott Marquis Queen's Park" },
    ];
}
function buildVisaParagraphs(data) {
    var _a;
    const p = pronouns((_a = data.prefix) !== null && _a !== void 0 ? _a : "");
    return [
        { text: "VISA APPLICATION LETTER", size: 15, center: true },
        null,
        { text: data.date_now },
        null,
        { text: "To Whom It May Concern" },
        null,
        {
            text: `This is to certify that ${data.prefix} ${data.first_name} ${data.last_name} has been employed by TCC Hotel Asset Management Company Limited as the company managing Bangkok Marriott Marquis Queen's Park since July 1, 2022 to present in the position of ${data.position} in the ${data.department} Department. ${p.poss.charAt(0).toUpperCase() + p.poss.slice(1)} current salary is THB ${data.salary} and service charge as of ${data.svc_period} is THB ${data.svc_monthly}.`,
        },
        null,
        {
            text: `${data.prefix} ${data.first_name} ${data.last_name} has entitled to take the vacation for traveling to ${data.country} on ${data.departure_date} to ${data.last_travel_date} and ${data.prefix} will arrive to Thailand on ${data.arrival_date}. After that, ${data.prefix} will continue ${p.poss} duty on ${data.first_date_on_duty_date}.`,
        },
        null,
        {
            text: "I hereby certify that the above mentioned are true and correct. Should you require any further information, please feel free to contact me.",
        },
        null,
        { text: "Sincerely yours," },
        null,
        null,
        null,
        { text: "Preechayaporn Poungponprom" },
        { text: "Assistant Director of Human Resources" },
        { text: "Bangkok Marriott Marquis Queen's Park" },
    ];
}
// ---------- data builders (unchanged logic) ----------
function resolvePrefix(employee, tf) {
    var _a;
    if (tf === null || tf === void 0 ? void 0 : tf.prefix)
        return tf.prefix;
    const raw = (_a = employee.prefix) !== null && _a !== void 0 ? _a : "";
    return raw.replace(/_/g, ".");
}
const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
function formatServiceChargePeriod(sc) {
    var _a;
    if (!sc)
        return "";
    return `${MONTH_NAMES[((_a = sc.month) !== null && _a !== void 0 ? _a : 1) - 1]} ${sc.year}`;
}
function buildSalaryCertData(employee, serviceCharge, tf) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        const baseSalary = Number((_a = employee.salary) !== null && _a !== void 0 ? _a : 0);
        const svcAmount = Number((_b = serviceCharge === null || serviceCharge === void 0 ? void 0 : serviceCharge.amount) !== null && _b !== void 0 ? _b : 0);
        return {
            date_now: formatDate(new Date()),
            prefix: resolvePrefix(employee, tf),
            first_name: (_c = employee.first_name) !== null && _c !== void 0 ? _c : "",
            last_name: (_d = employee.last_name) !== null && _d !== void 0 ? _d : "",
            employment_date: (tf === null || tf === void 0 ? void 0 : tf.employment_date)
                ? formatDate(new Date(tf.employment_date))
                : formatDate(employee.employment_date),
            position: (_e = employee.position) !== null && _e !== void 0 ? _e : "",
            department: (_f = employee.department) !== null && _f !== void 0 ? _f : "",
            salary: baseSalary
                ? baseSalary.toLocaleString("en-US", { minimumFractionDigits: 2 })
                : "",
            svc_monthly: svcAmount
                ? svcAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })
                : "",
            svc_period: formatServiceChargePeriod(serviceCharge),
            total_income: (baseSalary + svcAmount).toLocaleString("en-US", {
                minimumFractionDigits: 2,
            }),
        };
    });
}
function buildEmpCertData(employee, tf) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        return {
            date_now: formatDate(new Date()),
            prefix: resolvePrefix(employee, tf),
            first_name: (_a = employee.first_name) !== null && _a !== void 0 ? _a : "",
            last_name: (_b = employee.last_name) !== null && _b !== void 0 ? _b : "",
            employment_date: (tf === null || tf === void 0 ? void 0 : tf.employment_date)
                ? formatDate(new Date(tf.employment_date))
                : formatDate(employee.employment_date),
            last_working_date: (tf === null || tf === void 0 ? void 0 : tf.last_working_date)
                ? formatDate(new Date(tf.last_working_date))
                : formatDate(employee.resignation_date),
            position: (_c = employee.position) !== null && _c !== void 0 ? _c : "",
            department: (_d = employee.department) !== null && _d !== void 0 ? _d : "",
        };
    });
}
function buildVisaData(employee, serviceCharge, request) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const baseSalary = Number((_a = employee.salary) !== null && _a !== void 0 ? _a : 0);
        const svcAmount = Number((_b = serviceCharge === null || serviceCharge === void 0 ? void 0 : serviceCharge.amount) !== null && _b !== void 0 ? _b : 0);
        return {
            date_now: formatDate(request.created_at),
            prefix: (_d = (_c = employee.prefix) === null || _c === void 0 ? void 0 : _c.replace(/_/g, ".")) !== null && _d !== void 0 ? _d : "",
            first_name: (_e = employee.first_name) !== null && _e !== void 0 ? _e : "",
            last_name: (_f = employee.last_name) !== null && _f !== void 0 ? _f : "",
            position: (_g = employee.position) !== null && _g !== void 0 ? _g : "",
            department: (_h = employee.department) !== null && _h !== void 0 ? _h : "",
            salary: baseSalary
                ? baseSalary.toLocaleString("en-US", { minimumFractionDigits: 2 })
                : "",
            svc_monthly: svcAmount
                ? svcAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })
                : "",
            svc_period: formatServiceChargePeriod(serviceCharge),
            total_svc: (baseSalary + svcAmount).toLocaleString("en-US", {
                minimumFractionDigits: 2,
            }),
            country: (_j = request.country_prefer_travel) !== null && _j !== void 0 ? _j : "",
            departure_date: formatDate(request.departure_date),
            last_travel_date: formatDate(request.last_travel_date),
            arrival_date: formatDate(request.arrival_date),
            first_date_on_duty_date: formatDate(request.on_duty_date),
        };
    });
}
// ---------- main entry points ----------
function generateDocument(requestId, env) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const supabase = (0, supabase_1.getSupabase)(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: request, error: reqError } = yield supabase
            .from("DocumentRequest")
            .select("*, Employee(*)")
            .eq("id", requestId)
            .maybeSingle();
        if (reqError || !request)
            throw new Error(`Request not found: ${requestId}`);
        const employee = Array.isArray(request.Employee)
            ? request.Employee[0]
            : request.Employee;
        if (!employee)
            throw new Error(`Employee not found for request: ${requestId}`);
        const supportedTypes = ["salary_cert", "emp_cert", "visa_letter"];
        if (!supportedTypes.includes(request.doc_type)) {
            yield supabase
                .from("DocumentRequest")
                .update({
                status: "WAITING_FOR_PICKUP",
                updated_at: new Date().toISOString(),
            })
                .eq("id", requestId);
            return;
        }
        // Fetch most recent service charge for this employee (latest year+month first)
        let serviceCharge = null;
        if (request.doc_type === "salary_cert" ||
            request.doc_type === "visa_letter") {
            const { data: sc } = yield supabase
                .from("ServiceCharge")
                .select("*")
                .eq("employee_id", employee.id)
                .order("year", { ascending: false })
                .order("month", { ascending: false })
                .limit(1)
                .maybeSingle();
            serviceCharge = sc;
        }
        const tf = (_a = request.template_fields) !== null && _a !== void 0 ? _a : null;
        let paragraphs;
        if (request.doc_type === "salary_cert") {
            const data = yield buildSalaryCertData(employee, serviceCharge, tf);
            paragraphs = buildSalaryCertParagraphs(data);
        }
        else if (request.doc_type === "emp_cert") {
            const data = yield buildEmpCertData(employee, tf);
            paragraphs = buildEmpCertParagraphs(data);
        }
        else {
            const data = yield buildVisaData(employee, serviceCharge, request);
            paragraphs = buildVisaParagraphs(data);
        }
        const pdfBytes = yield buildPDF(paragraphs);
        const fileName = `${requestId}.pdf`;
        yield supabase.storage
            .createBucket("documents", { public: false })
            .catch(() => { });
        const { error: uploadError } = yield supabase.storage
            .from("documents")
            .upload(fileName, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
        });
        if (uploadError)
            throw new Error(`Upload failed: ${uploadError.message}`);
        const { data: signedData } = yield supabase.storage
            .from("documents")
            .createSignedUrl(fileName, 60 * 60 * 24 * 3);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 3);
        yield supabase
            .from("DocumentRequest")
            .update({
            status: "WAITING_FOR_PICKUP",
            file_url: (_b = signedData === null || signedData === void 0 ? void 0 : signedData.signedUrl) !== null && _b !== void 0 ? _b : null,
            expires_at: expiresAt.toISOString(),
            service_charge_id: (_c = serviceCharge === null || serviceCharge === void 0 ? void 0 : serviceCharge.id) !== null && _c !== void 0 ? _c : null,
            updated_at: new Date().toISOString(),
        })
            .eq("id", requestId);
    });
}
function triggerDocumentGeneration(requestId, env) {
    return __awaiter(this, void 0, void 0, function* () {
        const supabase = (0, supabase_1.getSupabase)(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        try {
            yield generateDocument(requestId, env);
        }
        catch (err) {
            console.error("[DocGen] Failed:", err);
            yield supabase
                .from("DocumentRequest")
                .update({ status: "PENDING", updated_at: new Date().toISOString() })
                .eq("id", requestId);
        }
    });
}
