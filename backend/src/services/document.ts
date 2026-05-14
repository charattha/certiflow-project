import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { getSupabase } from '../utils/supabase';

import salaryTemplate from '../templates/salary_cert.docx';
import empCertTemplate from '../templates/emp_cert.docx';
import visaTemplate from '../templates/visa_letter.docx';

const TEMPLATES: Record<string, ArrayBuffer> = {
  salary_cert: salaryTemplate,
  emp_cert: empCertTemplate,
  visa_letter: visaTemplate,
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
}

// Custom parser: normalizes keys like "date_now / mmmm-dd-yyyy" → "date_now"
// and "employment date/..." → "employment_date", fixes "daparture" typo
function makeParser(data: Record<string, string>) {
  return function (tag: string) {
    const normalized = tag
      .split('/')[0]
      .trim()
      .replace(/\s+/g, '_')
      .replace(/daparture/g, 'departure')
      .toLowerCase();

    return {
      get(_scope: any) {
        return data[normalized] ?? data[tag] ?? '';
      },
    };
  };
}

function fillTemplate(template: ArrayBuffer, data: Record<string, string>): Buffer {
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    parser: makeParser(data),
  });
  doc.render();
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function resolvePrefix(employee: any, tf: Record<string, string> | null): string {
  if (tf?.prefix) return tf.prefix;
  return employee.prefix?.replace('_', '.') ?? '';
}

async function buildSalaryCertData(employee: any, serviceCharge: any, tf: Record<string, string> | null): Promise<Record<string, string>> {
  return {
    date_now: formatDate(new Date()),
    prefix: resolvePrefix(employee, tf),
    first_name: employee.first_name ?? '',
    last_name: employee.last_name ?? '',
    employment_date: tf?.employment_date ? formatDate(new Date(tf.employment_date)) : formatDate(employee.employment_date),
    position: employee.position ?? '',
    department: employee.department ?? '',
    salary: employee.salary ? Number(employee.salary).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '',
    svc_monthly: serviceCharge ? Number(serviceCharge.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '',
    total_svc: (Number(employee.salary ?? 0) + Number(serviceCharge?.amount ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2 }),
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
  const prefix = employee.prefix?.replace('_', '.') ?? '';
  return {
    date_now: formatDate(request.created_at),
    prefix,
    first_name: employee.first_name ?? '',
    last_name: employee.last_name ?? '',
    position: employee.position ?? '',
    department: employee.department ?? '',
    salary: employee.salary ? Number(employee.salary).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '',
    svc_monthly: serviceCharge ? Number(serviceCharge.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '',
    total_svc: (Number(employee.salary ?? 0) + Number(serviceCharge?.amount ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    country: request.country_prefer_travel ?? '',
    departure_date: formatDate(request.departure_date),
    last_travel_date: formatDate(request.last_travel_date),
    arrival_date: formatDate(request.arrival_date),
    first_date_on_duty_date: formatDate(request.on_duty_date),
  };
}

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

  const template = TEMPLATES[request.doc_type];
  if (!template) {
    await supabase.from('DocumentRequest')
      .update({ status: 'COMPLETED', updatedAt: new Date().toISOString() })
      .eq('id', requestId);
    return;
  }

  // Fetch service charge for current month if needed
  let serviceCharge = null;
  if (request.doc_type === 'salary_cert' || request.doc_type === 'visa_letter') {
    const now = new Date();
    const { data: sc } = await supabase
      .from('ServiceCharge')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .maybeSingle();
    serviceCharge = sc;
  }

  // Build template data
  const tf = (request.template_fields as Record<string, string> | null) ?? null;
  let data: Record<string, string>;
  if (request.doc_type === 'salary_cert') {
    data = await buildSalaryCertData(employee, serviceCharge, tf);
  } else if (request.doc_type === 'emp_cert') {
    data = await buildEmpCertData(employee, tf);
  } else if (request.doc_type === 'visa_letter') {
    data = await buildVisaData(employee, serviceCharge, request);
  } else {
    throw new Error(`No template for doc_type: ${request.doc_type}`);
  }

  // Generate document
  const docBuffer = fillTemplate(template, data);
  const fileName = `${requestId}.docx`;

  // Ensure bucket exists and upload
  await supabase.storage.createBucket('documents', { public: false }).catch(() => {});
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, docBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Create signed URL valid for 3 days
  const { data: signedData } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileName, 60 * 60 * 24 * 3);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 3);

  await supabase.from('DocumentRequest').update({
    status: 'COMPLETED',
    file_url: signedData?.signedUrl ?? null,
    expires_at: expiresAt.toISOString(),
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
