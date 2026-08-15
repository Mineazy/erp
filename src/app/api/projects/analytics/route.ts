import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const branchFilter = getBranchFilter(session);
    const where: any = {};
    Object.assign(where, branchFilter);

    // Filter projects where the signed-in user is the manager, unless they are an admin
    if ((session.user as any)?.role !== 'admin' && (session.user as any)?.id) {
      where.managerId = (session.user as any).id;
    }

    const projects = await prisma.erpProject.findMany({
      where,
      include: {
        tasks: true,
        expenses: true,
      },
    });

    let totalBudget = 0;
    let totalExpenses = 0;
    const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planning');

    const statusCounts = { planning: 0, in_progress: 0, completed: 0, on_hold: 0 };
    const taskStatusCounts = { todo: 0, in_progress: 0, blocked: 0, done: 0 };
    const budgetVsActuals: any[] = [];

    projects.forEach(project => {
      // Budgets
      const budget = Number(project.budget || 0);
      let expenses = 0;
      project.expenses.forEach(e => expenses += Number(e.amount || 0));

      if (project.status === 'in_progress' || project.status === 'planning') {
        totalBudget += budget;
        totalExpenses += expenses;
      }

      // Status
      if (statusCounts[project.status as keyof typeof statusCounts] !== undefined) {
        statusCounts[project.status as keyof typeof statusCounts]++;
      }

      // Tasks
      project.tasks.forEach(task => {
        if (taskStatusCounts[task.status as keyof typeof taskStatusCounts] !== undefined) {
          taskStatusCounts[task.status as keyof typeof taskStatusCounts]++;
        }
      });

      // Budget vs Actuals per project (Top 5 active)
      if (project.status === 'in_progress' || project.status === 'planning') {
        budgetVsActuals.push({
          name: project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name,
          budget,
          expenses
        });
      }
    });

    // Sort budget vs actuals by budget descending and take top 5
    budgetVsActuals.sort((a, b) => b.budget - a.budget);
    const topBudgetVsActuals = budgetVsActuals.slice(0, 5);

    const projectStatusDistribution = [
      { name: 'Planning', value: statusCounts.planning, fill: '#64748b' }, // slate-500
      { name: 'In Progress', value: statusCounts.in_progress, fill: '#3b82f6' }, // blue-500
      { name: 'Completed', value: statusCounts.completed, fill: '#10b981' }, // emerald-500
      { name: 'On Hold', value: statusCounts.on_hold, fill: '#f59e0b' }, // amber-500
    ].filter(item => item.value > 0);

    const taskStatusDistribution = [
      { name: 'To Do', value: taskStatusCounts.todo, fill: '#94a3b8' }, // slate-400
      { name: 'In Progress', value: taskStatusCounts.in_progress, fill: '#3b82f6' }, // blue-500
      { name: 'Blocked', value: taskStatusCounts.blocked, fill: '#ef4444' }, // red-500
      { name: 'Done', value: taskStatusCounts.done, fill: '#10b981' }, // emerald-500
    ].filter(item => item.value > 0);

    return ok({
      activeProjectsCount: activeProjects.length,
      totalProjectsCount: projects.length,
      totalTasksCount: projects.reduce((acc, p) => acc + p.tasks.length, 0),
      totalBudget,
      totalExpenses,
      projectStatusDistribution,
      taskStatusDistribution,
      topBudgetVsActuals
    });
  } catch (error: any) {
    console.error('GET Project Analytics Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
