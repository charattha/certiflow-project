/**
 * templateFields.ts
 * Defines the placeholder fields for each document template and which
 * fields need to be collected from the user vs. auto-filled from the DB.
 */

export interface FieldDefinition {
  key: string;          // Matches the {key} in the .docx template
  label: string;        // Human-readable label shown in the UI
  labelTH: string;      // Thai label
  type: 'text' | 'date' | 'select' | 'number';
  options?: { value: string; label: string }[]; // For 'select' type
  required: boolean;
  autoFilled?: boolean; // If true, value is pulled from employee profile — not shown in UI
}

// Fields that are auto-filled for ALL templates from the Employee DB record
const AUTO_FIELDS: FieldDefinition[] = [
  { key: 'date_now', label: 'Document Date', labelTH: 'วันที่', type: 'text', required: true, autoFilled: true },
  { key: 'first_name', label: 'First Name', labelTH: 'ชื่อ', type: 'text', required: true, autoFilled: true },
  { key: 'last_name', label: 'Last Name', labelTH: 'นามสกุล', type: 'text', required: true, autoFilled: true },
  { key: 'position', label: 'Position', labelTH: 'ตำแหน่ง', type: 'text', required: true, autoFilled: true },
  { key: 'department', label: 'Department', labelTH: 'แผนก', type: 'text', required: true, autoFilled: true },
];

// Prefix select is shared across all templates but user-input
const PREFIX_FIELD: FieldDefinition = {
  key: 'prefix',
  label: 'Title / Prefix',
  labelTH: 'คำนำหน้า',
  type: 'select',
  required: true,
  options: [
    { value: 'Mr.', label: 'Mr.' },
    { value: 'Ms.', label: 'Ms.' },
    { value: 'Mrs.', label: 'Mrs.' },
  ],
};

// Per-docType user-required fields (excluding auto-filled ones)
export const TEMPLATE_FIELD_DEFINITIONS: Record<string, FieldDefinition[]> = {
  salary_cert: [
    PREFIX_FIELD,
    {
      key: 'employment_date',
      label: 'Employment Start Date',
      labelTH: 'วันที่เริ่มงาน',
      type: 'date',
      required: true,
    },
  ],
  emp_cert: [
    PREFIX_FIELD,
    {
      key: 'employment_date',
      label: 'Employment Start Date',
      labelTH: 'วันที่เริ่มงาน',
      type: 'date',
      required: true,
    },
    {
      key: 'last_working_date',
      label: 'Last Working Date',
      labelTH: 'วันสิ้นสุดการทำงาน',
      type: 'date',
      required: true,
    },
  ],
  visa_letter: [
    PREFIX_FIELD,
    {
      key: 'salary',
      label: 'Monthly Salary (THB)',
      labelTH: 'เงินเดือน (บาท)',
      type: 'number',
      required: true,
    },
    {
      key: 'svc_monthly',
      label: 'Monthly Service Charge (THB)',
      labelTH: 'ค่าบริการรายเดือน (บาท)',
      type: 'number',
      required: true,
    },
    {
      key: 'total_svc',
      label: 'Total Income (THB)',
      labelTH: 'รายได้รวม (บาท)',
      type: 'number',
      required: true,
    },
    {
      key: 'country',
      label: 'Destination Country',
      labelTH: 'ประเทศปลายทาง',
      type: 'text',
      required: true,
    },
    {
      key: 'daparture_date',  // Note: intentional typo matching the template
      label: 'Departure Date',
      labelTH: 'วันเดินทางออก',
      type: 'date',
      required: true,
    },
    {
      key: 'last_travel_date',
      label: 'Return Date',
      labelTH: 'วันเดินทางกลับ',
      type: 'date',
      required: true,
    },
    {
      key: 'arrival_date',
      label: 'Arrival Date',
      labelTH: 'วันที่เดินทางถึง',
      type: 'date',
      required: true,
    },
    {
      key: 'first_date_on_duty_date',
      label: 'First Day on Duty',
      labelTH: 'วันแรกที่กลับมาทำงาน',
      type: 'date',
      required: true,
    },
  ],
  // payslip_copy and tax_50 have no template — no extra fields
  payslip_copy: [],
  tax_50: [],
};

/**
 * Format a date string (YYYY-MM-DD) to "MMMM DD, YYYY" style.
 * e.g., "2024-05-12" → "May 12, 2024"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
}

/**
 * Merges auto-filled employee profile fields with user-supplied templateFields.
 * Returns the complete data object for docxtemplater to consume.
 */
export function mergeTemplateFields(
  docType: string,
  employeeProfile: {
    firstName: string;
    lastName: string;
    position?: string | null;
    department?: string | null;
  },
  userFields: Record<string, string> = {}
): Record<string, string> {
  // Auto-fill today's date in "MMMM DD, YYYY" format
  const dateNow = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });

  // Format any date fields supplied by the user
  const formattedUserFields: Record<string, string> = {};
  const fieldDefs = TEMPLATE_FIELD_DEFINITIONS[docType] || [];
  for (const [key, value] of Object.entries(userFields)) {
    const def = fieldDefs.find((f) => f.key === key);
    if (def?.type === 'date') {
      formattedUserFields[key] = formatDate(value);
    } else {
      formattedUserFields[key] = value;
    }
  }

  return {
    // Auto-filled
    date_now: dateNow,
    first_name: employeeProfile.firstName,
    last_name: employeeProfile.lastName,
    position: employeeProfile.position || '',
    department: employeeProfile.department || '',
    // User-supplied (may override auto-filled if keys overlap)
    ...formattedUserFields,
  };
}
