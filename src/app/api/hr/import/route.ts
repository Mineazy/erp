import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, getBody } from '@/lib/api';
import * as XLSX from 'xlsx';

const TEMPLATES: Record<string, { headers: string[]; sample: any[] }> = {
  timesheets: {
    headers: ['Employee Code', 'Date (YYYY-MM-DD)', 'Clock In (HH:MM)', 'Clock Out (HH:MM)', 'Status', 'Notes'],
    sample: [
      ['EMP-001', '2026-08-23', '08:00', '17:00', 'present', 'Regular day'],
      ['EMP-002', '2026-08-23', '08:30', '17:30', 'late', 'Traffic delay'],
    ],
  },
  leave: {
    headers: ['Employee Code', 'Leave Type', 'Start Date (YYYY-MM-DD)', 'End Date (YYYY-MM-DD)', 'Reason', 'Contact Address', 'Commuted Days'],
    sample: [
      ['EMP-001', 'Annual Leave', '2026-09-01', '2026-09-05', 'Family vacation', '123 Main St, Harare', '0'],
      ['EMP-002', 'Sick Leave', '2026-08-25', '2026-08-27', 'Medical appointment', '', '0'],
    ],
  },
  loans: {
    headers: ['Employee Code', 'Loan Type', 'Amount', 'Monthly Deduction', 'Start Date (YYYY-MM-DD)', 'End Date (YYYY-MM-DD)', 'Reason'],
    sample: [
      ['EMP-001', 'Salary Advance', '500', '100', '2026-09-01', '', 'Emergency'],
      ['EMP-002', 'Education Loan', '2000', '200', '2026-09-01', '2027-09-01', 'Tuition fees'],
    ],
  },
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const type = sp.get('type');

  if (!type || !TEMPLATES[type]) return badRequest('Invalid type. Use: timesheets, leave, or loans');

  const template = TEMPLATES[type];
  const ws = XLSX.utils.aoa_to_sheet([template.headers, ...template.sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type}_template.xlsx"`,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await request.formData();
  const file = body.get('file') as File | null;
  const type = body.get('type') as string;

  if (!file) return badRequest('No file uploaded');
  if (!type || !['timesheets', 'leave', 'loans'].includes(type)) return badRequest('Invalid type');

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

  if (rows.length < 2) return badRequest('File is empty or has no data rows');

  const headers = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
  const dataRows = rows.slice(1).filter((row: any) => row.some((cell: any) => cell != null && cell !== ''));

  const staffList = await prisma.hrStaff.findMany({ where: { isActive: true }, select: { id: true, employeeCode: true } });
  const staffMap = new Map(staffList.map(s => [s.employeeCode, s.id]));

  let imported = 0;
  let errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as any[];
    const rowNum = i + 2;
    const get = (name: string) => {
      const idx = headers.findIndex(h => h.includes(name.toLowerCase()));
      return idx >= 0 ? String(row[idx] || '').trim() : '';
    };

    try {
      const employeeCode = get('employee code');
      const staffId = staffMap.get(employeeCode);
      if (!staffId) { errors.push(`Row ${rowNum}: Employee "${employeeCode}" not found`); continue; }

      if (type === 'timesheets') {
        const date = get('date');
        if (!date) { errors.push(`Row ${rowNum}: Date is required`); continue; }
        const clockIn = get('clock in');
        const clockOut = get('clock out');
        const status = get('status') || 'present';
        const notes = get('notes');
        let hoursWorked = 0;
        if (clockIn && clockOut) {
          const inTime = new Date(`${date}T${clockIn}`);
          const outTime = new Date(`${date}T${clockOut}`);
          hoursWorked = Math.max(0, (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60));
        }
        await prisma.hrTimesheet.create({
          data: {
            staffId,
            date: new Date(date),
            clockIn: clockIn ? new Date(`${date}T${clockIn}`) : null,
            clockOut: clockOut ? new Date(`${date}T${clockOut}`) : null,
            hoursWorked,
            status,
            notes: notes || null,
          },
        });
      } else if (type === 'leave') {
        const leaveType = get('leave type');
        const startDate = get('start date');
        const endDate = get('end date');
        if (!leaveType || !startDate || !endDate) { errors.push(`Row ${rowNum}: Leave type, start and end dates required`); continue; }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const commutedDays = parseInt(get('commuted days')) || 0;
        await prisma.hrLeave.create({
          data: {
            staffId,
            leaveType,
            startDate: start,
            endDate: end,
            days,
            reason: get('reason') || null,
            contactAddress: get('contact address') || null,
            commutedDays,
            commutationStatus: commutedDays > 0 ? 'pending' : 'none',
            status: 'pending',
          },
        });
      } else if (type === 'loans') {
        const loanType = get('loan type');
        const amount = parseFloat(get('amount'));
        const startDate = get('start date');
        if (!loanType || !amount || !startDate) { errors.push(`Row ${rowNum}: Loan type, amount and start date required`); continue; }
        const monthlyDeduction = parseFloat(get('monthly deduction')) || 0;
        const endDate = get('end date');
        await prisma.hrLoan.create({
          data: {
            staffId,
            loanType,
            amount,
            monthlyDeduction,
            outstandingBalance: amount,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            reason: get('reason') || null,
            status: 'pending',
          },
        });
      }
      imported++;
    } catch (e: any) {
      errors.push(`Row ${rowNum}: ${e.message || 'Unknown error'}`);
    }
  }

  return ok({ imported, errors, total: dataRows.length });
}
