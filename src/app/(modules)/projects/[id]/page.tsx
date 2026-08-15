'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ArrowLeft, Plus } from 'lucide-react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';

import { use } from 'react';
export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', estimatedHours: '' });

  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: 'materials', description: '', amount: '', recordedById: '' });

  const [isNewTimeLogOpen, setIsNewTimeLogOpen] = useState(false);
  const [newTimeLog, setNewTimeLog] = useState({ employeeId: '', hours: '', description: '', taskId: '' });

  const [employees, setEmployees] = useState<any[]>([]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        setProject(await res.json());
      } else {
        router.push('/projects');
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) setEmployees(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchEmployees();
  }, [id]);

  const handleCreateTask = async () => {
    if (!newTask.title) return alert('Title required');
    try {
      await fetch(`/api/projects/${id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      setIsNewTaskOpen(false);
      setNewTask({ title: '', description: '', estimatedHours: '' });
      fetchProject();
    } catch (e) { console.error(e); }
  };

  const handleUpdateTask = async (taskId: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) fetchProject();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProjectStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchProject();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateExpense = async () => {
    if (!newExpense.amount) return alert('Amount required');
    try {
      const res = await fetch(`/api/projects/${id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to create expense');
        return;
      }
      setIsNewExpenseOpen(false);
      setNewExpense({ category: 'materials', description: '', amount: '', recordedById: '' });
      fetchProject();
    } catch (e) { console.error(e); }
  };

  const handleCreateTimeLog = async () => {
    if (!newTimeLog.hours) return alert('Hours required');
    try {
      const res = await fetch(`/api/projects/${id}/time-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTimeLog),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to log time');
        return;
      }
      setIsNewTimeLogOpen(false);
      setNewTimeLog({ employeeId: '', hours: '', description: '', taskId: '' });
      fetchProject();
    } catch (e) { console.error(e); }
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!project) return null;

  const totalExpenses = project.expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalHours = project.timeLogs.reduce((s: number, t: any) => s + Number(t.hours), 0);

  const overviewContent = (
    <Card>
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-500">Description</Label>
            <p>{project.description || 'No description provided.'}</p>
          </div>
          <div>
            <Label className="text-slate-500">Type</Label>
            <p className="capitalize">{project.type}</p>
          </div>
          <div>
            <Label className="text-slate-500">Start Date</Label>
            <p>{project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : '-'}</p>
          </div>
          <div>
            <Label className="text-slate-500">End Date</Label>
            <p>{project.endDate ? format(new Date(project.endDate), 'MMM d, yyyy') : '-'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const tasksContent = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Tasks</h3>
        <Button size="sm" onClick={() => setIsNewTaskOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Task</Button>
        <Dialog open={isNewTaskOpen} onClose={() => setIsNewTaskOpen(false)} title="Add Task">
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
            </div>
            <div>
              <Label>Estimated Hours</Label>
              <Input type="number" value={newTask.estimatedHours} onChange={e => setNewTask({...newTask, estimatedHours: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTaskOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask}>Save</Button>
          </DialogFooter>
        </Dialog>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Est. Hours</TableHead></TableRow></TableHeader>
          <TableBody>
            {project.tasks.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-slate-500">No tasks found.</TableCell></TableRow>
            ) : (
              project.tasks.map((task: any) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-slate-500">{task.description}</p>
                  </TableCell>
                  <TableCell>
                    <Select value={task.status} onChange={e => handleUpdateTask(task.id, 'status', e.target.value)} className="h-8 w-32 capitalize text-xs">
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="done">Done</option>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={task.priority} onChange={e => handleUpdateTask(task.id, 'priority', e.target.value)} className="h-8 w-28 capitalize text-xs">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </Select>
                  </TableCell>
                  <TableCell>{task.estimatedHours} hrs</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

  const expensesContent = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Expenses</h3>
        <Button size="sm" onClick={() => setIsNewExpenseOpen(true)}><Plus className="h-4 w-4 mr-2" /> Log Expense</Button>
        <Dialog open={isNewExpenseOpen} onClose={() => setIsNewExpenseOpen(false)} title="Log Expense">
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                <option value="materials">Materials</option>
                <option value="equipment">Equipment</option>
                <option value="contractors">Contractors</option>
                <option value="travel">Travel</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label>Logged By (Employee)</Label>
              <Select value={newExpense.recordedById} onChange={e => setNewExpense({...newExpense, recordedById: e.target.value})}>
                <option value="">Select an employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
            </div>
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewExpenseOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateExpense}>Save</Button>
          </DialogFooter>
        </Dialog>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {project.expenses.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-slate-500">No expenses logged.</TableCell></TableRow>
            ) : (
              project.expenses.map((expense: any) => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.expenseDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="capitalize">{expense.category}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell className="text-right font-medium">${Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

  const timeContent = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Time Logs</h3>
        <Button size="sm" onClick={() => setIsNewTimeLogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Log Time</Button>
        <Dialog open={isNewTimeLogOpen} onClose={() => setIsNewTimeLogOpen(false)} title="Log Time">
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={newTimeLog.employeeId} onChange={e => setNewTimeLog({...newTimeLog, employeeId: e.target.value})}>
                <option value="">Select an employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Hours</Label>
              <Input type="number" step="0.5" value={newTimeLog.hours} onChange={e => setNewTimeLog({...newTimeLog, hours: e.target.value})} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={newTimeLog.description} onChange={e => setNewTimeLog({...newTimeLog, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTimeLogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTimeLog}>Save</Button>
          </DialogFooter>
        </Dialog>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Hours</TableHead></TableRow></TableHeader>
          <TableBody>
            {project.timeLogs.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-slate-500">No time logged.</TableCell></TableRow>
            ) : (
              project.timeLogs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.logDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{log.description}</TableCell>
                  <TableCell className="text-right font-medium">{Number(log.hours).toFixed(1)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

  const tabsData = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    { id: 'tasks', label: 'Tasks', content: tasksContent },
    { id: 'expenses', label: 'Expenses', content: expensesContent },
    { id: 'time', label: 'Time Logs', content: timeContent },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
            <span>{project.projectNo}</span>
            <span>•</span>
            <Select value={project.status} onChange={e => handleUpdateProjectStatus(e.target.value)} className="h-7 w-32 capitalize text-xs bg-slate-100 border-none">
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="col-span-1 shadow-sm border-t-4 border-t-mine-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">${Number(project.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="col-span-1 shadow-sm border-t-4 border-t-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="col-span-1 shadow-sm border-t-4 border-t-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">${(Number(project.budget) - totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="col-span-1 shadow-sm border-t-4 border-t-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Logged Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)} hrs</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Tabs tabs={tabsData} defaultTab="overview" />
      </div>
    </div>
  );
}
