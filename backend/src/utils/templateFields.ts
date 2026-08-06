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
  // Salary cert and employment cert need no extra fields beyond the reason — just request them.
  salary_cert: [],
  emp_cert: [],
  visa_letter: [
    PREFIX_FIELD,
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
  ],
  // payslip_copy and tax_50 have no template — no extra fields
  payslip_copy: [],
  tax_50: [],
};

