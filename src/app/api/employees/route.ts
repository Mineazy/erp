import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    let employees = await prisma.erpEmployee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
      },
      orderBy: { firstName: 'asc' },
    });

    if (employees.length === 0) {
      const defaultEmployee = await prisma.erpEmployee.create({
        data: {
          employeeNo: 'EMP-0001',
          firstName: 'System',
          lastName: 'Admin',
          department: 'Management',
          position: 'Administrator',
          employmentType: 'permanent',
          dateHired: new Date(),
          basicSalary: 0,
          currency: 'USD'
        }
      });
      employees = [{
        id: defaultEmployee.id,
        firstName: defaultEmployee.firstName,
        lastName: defaultEmployee.lastName,
        department: defaultEmployee.department,
        position: defaultEmployee.position,
      }];
    }

    return ok(employees);
  } catch (error: any) {
    console.error('GET Employees Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
