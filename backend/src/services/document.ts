import { PDFDocument, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getSupabase } from '../utils/supabase';

import sarabunFontData from '../templates/Sarabun-Regular.ttf';

// ---------- helpers ----------

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
}

function pronouns(prefix: string): { subj: string; obj: string; poss: string } {
  const p = prefix?.toLowerCase() ?? '';
  if (p.includes('mrs') || p.includes('ms')) return { subj: 'she', obj: 'her', poss: 'her' };
  return { subj: 'he', obj: 'him', poss: 'his' };
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawParagraph(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  maxWidth: number,
  lineSpacing = 1.55,
): number {
  const lh = size * lineSpacing;
  for (const line of wrapText(text, font, size, maxWidth)) {
    page.drawText(line, { x, y, size, font, color: rgb(0, 0, 0) });
    y -= lh;
  }
  return y;
}

async function buildPDF(paragraphs: Array<string | null>): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(sarabunFontData as ArrayBuffer);

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
    } else {
      y = drawParagraph(page, para, mx, y, fs, font, maxWidth);
      y -= gap;
    }
  }

  return pdfDoc.save();
}

// ---------- per-doc builders ----------

function buildSalaryCertParagraphs(data: Record<string, string>): Array<string | null> {
  const p = pronouns(data.prefix ?? '');

  const hasSalary = !!data.salary;
  const hasSvc = !!data.svc_monthly;

  // Salary breakdown line
  let incomeStatement = '';
  if (hasSalary && hasSvc) {
    incomeStatement = `${p.poss.charAt(0).toUpperCase() + p.poss.slice(1)} current monthly remuneration consists of a base salary of THB ${data.salary} and a service charge of THB ${data.svc_monthly} (as of ${data.svc_period}), totalling THB ${data.total_income} per month.`;
  } else if (hasSalary) {
    incomeStatement = `${p.poss.charAt(0).toUpperCase() + p.poss.slice(1)} current monthly base salary is THB ${data.salary}.`;
  }

  return [
    data.date_now,
    null,
    'To Whom It May Concern',
    null,
    `This is to certify that ${data.prefix} ${data.first_name} ${data.last_name} has been employed by TCC Hotel Asset Management Company Limited as the company managing Bangkok Marriott Marquis Queen's Park since ${data.employment_date} to present in the position of ${data.position} in the ${data.department} Department.`,
    null,
    ...(incomeStatement ? [incomeStatement, null] : []),
    `During ${p.poss} stay, any assistance extended to ${p.obj} would be greatly appreciated. Should you require any further information, please feel free to contact me.`,
    null,
    'Sincerely yours,',
    null,
    null,
    null,
    'Preechayaporn Poungponprom',
    'Assistant Director of Human Resources',
    "Bangkok Marriott Marquis Queen's Park",
  ];
}

function buildEmpCertParagraphs(data: Record<string, string>): Array<string | null> {
  const p = pronouns(data.prefix ?? '');
  return [
    data.date_now,
    null,
    'To Whom It May Concern',
    null,
    `This is to certify that ${data.prefix}. ${data.first_name} ${data.last_name} has been employed by Bangkok Marriott Marquis Queen's Park since ${data.employment_date} to ${data.last_working_date} in the position of ${data.position} in the ${data.department} Department.`,
    null,
    `${data.prefix} ${data.last_name} resigned on ${p.poss} own accord and we wish every success in ${p.poss} future endeavor. We wish to express our appreciation for ${p.poss} contribution during the employment with us and our best wishes are accompanying ${p.obj} for the future career.`,
    null,
    'Sincerely yours,',
    null,
    null,
    null,
    'Preechayaporn Poungponprom',
    'Assistant Director of Human Resources',
    "Bangkok Marriott Marquis Queen's Park",
  ];
}

function buildVisaParagraphs(data: Record<string, string>): Array<string | null> {
  const p = pronouns(data.prefix ?? '');
  return [
    data.date_now,
    null,
    'To Whom It May Concern',
    null,
    `This is to certify that ${data.prefix}. ${data.first_name} ${data.last_name} has been employed by TCC Hotel Asset Management Company Limited as the company managing Bangkok Marriott Marquis Queen's Park since July 1, 2022 to present in the position of ${data.position} in the ${data.department} Department. ${p.poss.charAt(0).toUpperCase() + p.poss.slice(1)} current salary is THB ${data.salary} and service charge as of ${data.svc_monthly} is THB ${data.total_svc}.`,
    null,
    `${data.prefix}. ${data.first_name} ${data.last_name} has entitled to take the vacation for traveling to ${data.country} on ${data.departure_date} to ${data.last_travel_date} and ${data.prefix} will arrive to Thailand on ${data.arrival_date}. After that, ${data.prefix} will continue ${p.poss} duty on ${data.first_date_on_duty_date}.`,
    null,
    'I hereby certify that the above mentioned are true and correct. Should you require any further information, please feel free to contact me.',
    null,
    'Sincerely yours,',
    null,
    null,
    null,
    'Preechayaporn Poungponprom',
    'Assistant Director of Human Resources',
    "Bangkok Marriott Marquis Queen's Park",
  ];
}

// ---------- data builders (unchanged logic) ----------

function resolvePrefix(employee: any, tf: Record<string, string> | null): string {
  if (tf?.prefix) return tf.prefix;
  const raw = employee.prefix ?? '';
  return raw.replace(/_/g, '.');
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatServiceChargePeriod(sc: any): string {
  if (!sc) return '';
  return `${MONTH_NAMES[(sc.month ?? 1) - 1]} ${sc.year}`;
}

async function buildSalaryCertData(employee: any, serviceCharge: any, tf: Record<string, string> | null): Promise<Record<string, string>> {
  const baseSalary = Number(employee.salary ?? 0);
  const svcAmount = Number(serviceCharge?.amount ?? 0);
  return {
    date_now: formatDate(new Date()),
    prefix: resolvePrefix(employee, tf),
    first_name: employee.first_name ?? '',
    last_name: employee.last_name ?? '',
    employment_date: tf?.employment_date ? formatDate(new Date(tf.employment_date)) : formatDate(employee.employment_date),
    position: employee.position ?? '',
    department: employee.department ?? '',
    salary: baseSalary ? baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '',
    svc_monthly: svcAmount ? svcAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '',
    svc_period: formatServiceChargePeriod(serviceCharge),
    total_income: (baseSalary + svcAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }),
  };
}

async function buildEmpCertData(employee: any, tf: Record<string, string> | null): Promise<Record<string, string>> {
  return {
    date_now: formatDate(new Date()),
    prefix: resolvePrefix(employee, tf),
    first_name: employee.first_name ?? '',
    last_name: employee.last_name ?? '',
    employment_date: tf?.employment_date ? formatDate(new Date(tf.employment_date)) : formatDate(employee.employment_date),
    last_working_date: tf?.last_working_date ? formatDate(new Date(tf.last_working_date)) : formatDate(employee.resignation_date),
    position: employee.position ?? '',
    department: employee.department ?? '',
  };
}

async function buildVisaData(employee: any, serviceCharge: any, request: any): Promise<Record<string, string>> {
  const baseSalary = Number(employee.salary ?? 0);
  const svcAmount = Number(serviceCharge?.amount ?? 0);
  return {
    date_now: formatDate(request.created_at),
    prefix: employee.prefix?.replace(/_/g, '.') ?? '',
    first_name: employee.first_name ?? '',
    last_name: employee.last_name ?? '',
    position: employee.position ?? '',
    department: employee.department ?? '',
    salary: baseSalary ? baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '',
    svc_monthly: svcAmount ? svcAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '',
    total_svc: (baseSalary + svcAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    country: request.country_prefer_travel ?? '',
    departure_date: formatDate(request.departure_date),
    last_travel_date: formatDate(request.last_travel_date),
    arrival_date: formatDate(request.arrival_date),
    first_date_on_duty_date: formatDate(request.on_duty_date),
  };
}

// ---------- main entry points ----------

export async function generateDocument(requestId: string, env: any): Promise<void> {
  const supabase = getSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: request, error: reqError } = await supabase
    .from('DocumentRequest')
    .select('*, Employee(*)')
    .eq('id', requestId)
    .maybeSingle();

  if (reqError || !request) throw new Error(`Request not found: ${requestId}`);

  const employee = Array.isArray(request.Employee) ? request.Employee[0] : request.Employee;
  if (!employee) throw new Error(`Employee not found for request: ${requestId}`);

  const supportedTypes = ['salary_cert', 'emp_cert', 'visa_letter'];
  if (!supportedTypes.includes(request.doc_type)) {
    await supabase.from('DocumentRequest').update({
      status: 'COMPLETED',
      updated_at: new Date().toISOString(),
    }).eq('id', requestId);
    return;
  }

  // Fetch most recent service charge for this employee (latest year+month first)
  let serviceCharge = null;
  if (request.doc_type === 'salary_cert' || request.doc_type === 'visa_letter') {
    const { data: sc } = await supabase
      .from('ServiceCharge')
      .select('*')
      .eq('employee_id', employee.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle();
    serviceCharge = sc;
  }

  const tf = (request.template_fields as Record<string, string> | null) ?? null;
  let paragraphs: Array<string | null>;

  if (request.doc_type === 'salary_cert') {
    const data = await buildSalaryCertData(employee, serviceCharge, tf);
    paragraphs = buildSalaryCertParagraphs(data);
  } else if (request.doc_type === 'emp_cert') {
    const data = await buildEmpCertData(employee, tf);
    paragraphs = buildEmpCertParagraphs(data);
  } else {
    const data = await buildVisaData(employee, serviceCharge, request);
    paragraphs = buildVisaParagraphs(data);
  }

  const pdfBytes = await buildPDF(paragraphs);
  const fileName = `${requestId}.pdf`;

  await supabase.storage.createBucket('documents', { public: false }).catch(() => {});
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: signedData } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileName, 60 * 60 * 24 * 3);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 3);

  await supabase.from('DocumentRequest').update({
    status: 'COMPLETED',
    file_url: signedData?.signedUrl ?? null,
    expires_at: expiresAt.toISOString(),
    service_charge_id: serviceCharge?.id ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', requestId);
}

export async function triggerDocumentGeneration(requestId: string, env: any): Promise<void> {
  const supabase = getSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  try {
    await generateDocument(requestId, env);
  } catch (err) {
    console.error('[DocGen] Failed:', err);
    await supabase.from('DocumentRequest')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
      .eq('id', requestId);
  }
}
