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
import { ArrowLeft, Plus, Calendar, Clock, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

import { use } from 'react';
export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editBudgetAmount, setEditBudgetAmount] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', estimatedHours: '', startDate: '', dueDate: '' });

  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: 'materials', description: '', amount: '', recordedById: '' });

  const [isNewTimeLogOpen, setIsNewTimeLogOpen] = useState(false);
  const [newTimeLog, setNewTimeLog] = useState({ employeeId: '', hours: '', description: '', taskId: '' });

  const [employees, setEmployees] = useState<any[]>([]);

  const [extensionDialog, setExtensionDialog] = useState<{ open: boolean; taskId: string; taskTitle: string }>({ open: false, taskId: '', taskTitle: '' });
  const [extensionForm, setExtensionForm] = useState({ newDueDate: '', reason: '', additionalHours: '', additionalResources: '', additionalCost: '' });

  const [actualHoursDialog, setActualHoursDialog] = useState<{ open: boolean; taskId: string; taskTitle: string }>({ open: false, taskId: '', taskTitle: '' });
  const [actualHoursValue, setActualHoursValue] = useState('');
  const [actualCompletionDate, setActualCompletionDate] = useState('');

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
      setNewTask({ title: '', description: '', estimatedHours: '', startDate: '', dueDate: '' });
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

  const handleUpdateProject = async (updates: any) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
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

  const handleRequestExtension = async () => {
    if (!extensionForm.newDueDate || !extensionForm.reason) return alert('New due date and reason required');
    try {
      const res = await fetch(`/api/projects/${id}/tasks/${extensionDialog.taskId}/extensions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extensionForm),
      });
      if (res.ok) {
        setExtensionDialog({ open: false, taskId: '', taskTitle: '' });
        setExtensionForm({ newDueDate: '', reason: '', additionalHours: '', additionalResources: '', additionalCost: '' });
        fetchProject();
      }
    } catch (e) { console.error(e); }
  };

  const handleSetActualHours = async () => {
    if (!actualHoursValue) return alert('Hours required');
    try {
      const res = await fetch(`/api/projects/${id}/tasks/${actualHoursDialog.taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualHours: actualHoursValue,
          status: actualCompletionDate ? 'done' : undefined,
          completedAt: actualCompletionDate ? actualCompletionDate : undefined,
        }),
      });
      if (res.ok) {
        if (actualCompletionDate) {
          await fetch(`/api/projects/${id}/tasks/${actualHoursDialog.taskId}/extensions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              newDueDate: actualCompletionDate,
              reason: 'Task completed with actual hours recorded',
              additionalHours: actualHoursValue,
              actualHours: actualHoursValue,
              actualCompletionDate,
            }),
          });
        }
        setActualHoursDialog({ open: false, taskId: '', taskTitle: '' });
        setActualHoursValue('');
        setActualCompletionDate('');
        fetchProject();
      }
    } catch (e) { console.error(e); }
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!project) return null;

  const totalExpenses = project.expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalHours = project.timeLogs.reduce((s: number, t: any) => s + Number(t.hours), 0);

  const totalEstimatedHours = project.tasks.reduce((s: number, t: any) => s + Number(t.estimatedHours || 0), 0);
  const totalActualHours = project.tasks.reduce((s: number, t: any) => s + Number(t.actualHours || 0), 0);
  const totalAdditionalCost = project.tasks.reduce((s: number, t: any) => {
    return s + (t.extensions || []).reduce((es: number, ext: any) => es + Number(ext.additionalCost || 0), 0);
  }, 0);
  const totalExtensions = project.tasks.reduce((s: number, t: any) => s + (t.extensions?.length || 0), 0);

  const plannedDuration = project.startDate && project.endDate
    ? Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const actualDuration = project.startDate
    ? Math.ceil((new Date().getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const renderProgressChart = () => {
    if (!project) return null;
    const totalTasks = project.tasks?.length || 0;
    const completedTasks = project.tasks?.filter((t: any) => t.status === 'done').length || 0;
    let actualPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    let expectedPercentage = 0;
    if (project.startDate && project.endDate) {
      const start = new Date(project.startDate).getTime();
      const end = new Date(project.endDate).getTime();
      const today = new Date().getTime();
      if (today >= end) expectedPercentage = 100;
      else if (today <= start) expectedPercentage = 0;
      else expectedPercentage = ((today - start) / (end - start)) * 100;
    } else {
      expectedPercentage = actualPercentage;
    }
    const difference = expectedPercentage - actualPercentage;
    let color = '#10b981';
    if (difference > 20 || (expectedPercentage >= 100 && actualPercentage < 100)) color = '#ef4444';
    else if (difference > 5) color = '#f97316';
    const data = [
      { name: 'Completed', value: actualPercentage },
      { name: 'Remaining', value: 100 - actualPercentage }
    ];
    return (
      <div className="flex flex-col items-center justify-center h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270} dataKey="value" stroke="none" isAnimationActive={false}>
              <Cell key="cell-0" fill={color} />
              <Cell key="cell-1" fill="#f1f5f9" />
            </Pie>
            <RechartsTooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
          <span className="text-3xl font-bold" style={{ color }}>{actualPercentage.toFixed(0)}%</span>
        </div>
      </div>
    );
  };

  const renderGantt = () => {
    if (!project || project.tasks.length === 0) return null;
    let minDate = project.startDate ? new Date(project.startDate).getTime() : Infinity;
    let maxDate = project.endDate ? new Date(project.endDate).getTime() : -Infinity;
    const validTasks = project.tasks.filter((t: any) => t.startDate && t.dueDate);
    if (validTasks.length === 0) return null;
    validTasks.forEach((t: any) => {
      minDate = Math.min(minDate, new Date(t.startDate).getTime());
      maxDate = Math.max(maxDate, new Date(t.dueDate).getTime());
      (t.extensions || []).forEach((ext: any) => {
        maxDate = Math.max(maxDate, new Date(ext.newDueDate).getTime());
      });
    });
    if (minDate === Infinity || maxDate === -Infinity || maxDate <= minDate) return null;
    const duration = maxDate - minDate;
    const paddedMin = minDate - duration * 0.05;
    const paddedMax = maxDate + duration * 0.05;
    const paddedDuration = paddedMax - paddedMin;

    return (
      <Card className="mb-6 shadow-sm border border-slate-100">
        <CardHeader className="pb-2 bg-slate-50 border-b border-slate-100 rounded-t-lg">
          <CardTitle className="text-sm text-slate-700 flex items-center gap-2"><Calendar className="w-4 h-4" /> Gantt Chart Timeline</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative w-full py-2">
            <div className="absolute top-0 bottom-0 left-0 w-full pointer-events-none">
              <div className="absolute left-[25%] top-0 bottom-0 border-l border-slate-100 border-dashed" />
              <div className="absolute left-[50%] top-0 bottom-0 border-l border-slate-100 border-dashed" />
              <div className="absolute left-[75%] top-0 bottom-0 border-l border-slate-100 border-dashed" />
            </div>
            {validTasks.map((task: any) => {
              const start = new Date(task.startDate).getTime();
              const due = new Date(task.dueDate).getTime();
              const left = ((start - paddedMin) / paddedDuration) * 100;
              const width = Math.max(((due - start) / paddedDuration) * 100, 1);
              let color = 'bg-mine-blue-500';
              if (task.status === 'done') color = 'bg-emerald-500';
              if (task.status === 'blocked') color = 'bg-red-500';
              if (task.status === 'todo') color = 'bg-slate-400';
              const hasExtensions = task.extensions && task.extensions.length > 0;
              const ext = hasExtensions ? task.extensions[0] : null;
              const origDue = ext ? new Date(ext.originalDueDate).getTime() : due;
              const origWidth = Math.max(((origDue - start) / paddedDuration) * 100, 1);
              return (
                <div key={task.id} className="relative h-10 mb-1 group">
                  {hasExtensions && (
                    <div
                      className="absolute h-5 rounded-md bg-slate-200 opacity-60"
                      style={{ left: `${left}%`, width: `${origWidth}%` }}
                      title={`Original due: ${format(new Date(ext.originalDueDate), 'MMM d, yyyy')}`}
                    />
                  )}
                  <div
                    className={`absolute h-6 rounded-md shadow-sm ${color} transition-all cursor-pointer flex items-center overflow-hidden`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${task.title}: ${format(new Date(task.startDate), 'MMM d, yyyy')} - ${format(new Date(task.dueDate), 'MMM d, yyyy')}${hasExtensions ? ' (Extended)' : ''}`}
                  >
                    <span className="text-[10px] text-white px-2 truncate block w-full">
                      {task.title}{hasExtensions ? ' (Extended)' : ''}
                    </span>
                  </div>
                  {task.status === 'done' && task.actualHours && (
                    <div className="absolute -right-1 top-0 text-[9px] text-emerald-600 font-mono whitespace-nowrap">
                      {Number(task.actualHours)}h / {Number(task.estimatedHours)}h
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex justify-between mt-2 text-xs text-slate-400 border-t border-slate-200 pt-1">
              <span>{format(new Date(paddedMin), 'MMM d')}</span>
              <span>{format(new Date(paddedMin + paddedDuration/2), 'MMM d')}</span>
              <span>{format(new Date(paddedMax), 'MMM d')}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-mine-blue-500 rounded inline-block" /> In Progress</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500 rounded inline-block" /> Done</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-slate-200 rounded inline-block opacity-60" /> Original Due</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-500 rounded inline-block" /> Blocked</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const overviewContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-2">
        <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-slate-500">Description</Label><p>{project?.description || 'No description provided.'}</p></div>
            <div><Label className="text-slate-500">Type</Label><p className="capitalize">{project?.type}</p></div>
            <div><Label className="text-slate-500">Start Date</Label><p>{project?.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : '-'}</p></div>
            <div><Label className="text-slate-500">End Date</Label><p>{project?.endDate ? format(new Date(project.endDate), 'MMM d, yyyy') : '-'}</p></div>
          </div>
        </CardContent>
      </Card>
      <Card className="md:col-span-1">
        <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
        <CardContent>{renderProgressChart()}</CardContent>
      </Card>
    </div>
  );

  const tasksContent = (
    <div className="space-y-4">
      {renderGantt()}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Tasks</h3>
        <Button size="sm" onClick={() => setIsNewTaskOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Task</Button>
        <Dialog open={isNewTaskOpen} onClose={() => setIsNewTaskOpen(false)} title="Add Task">
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} /></div>
            <div><Label>Description</Label><Input value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value})} /></div>
              <div><Label>Due Date</Label><Input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} /></div>
            </div>
            <div><Label>Estimated Hours</Label><Input type="number" value={newTask.estimatedHours} onChange={e => setNewTask({...newTask, estimatedHours: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTaskOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask}>Save</Button>
          </DialogFooter>
        </Dialog>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Est. Hrs</TableHead>
              <TableHead className="text-center">Actual Hrs</TableHead>
              <TableHead>Extensions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {project.tasks.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-slate-500">No tasks found.</TableCell></TableRow>
            ) : (
              project.tasks.map((task: any) => {
                const estHrs = Number(task.estimatedHours || 0);
                const actHrs = Number(task.actualHours || 0);
                const extCount = task.extensions?.length || 0;
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
                return (
                  <TableRow key={task.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                    <TableCell>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-slate-500">{task.description}</p>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {task.startDate && <div className="text-slate-600"><span className="font-medium">Start:</span> {format(new Date(task.startDate), 'MMM d, yyyy')}</div>}
                      {task.dueDate && <div className={`text-slate-600 ${isOverdue ? 'text-red-600 font-medium' : ''}`}><span className="font-medium">Due:</span> {format(new Date(task.dueDate), 'MMM d, yyyy')}</div>}
                      {!task.startDate && !task.dueDate && <span className="text-slate-400">-</span>}
                    </TableCell>
                    <TableCell>
                      <Select value={task.status} onChange={e => handleUpdateTask(task.id, 'status', e.target.value)} className="h-8 w-32 capitalize text-xs">
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="done">Done</option>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">{estHrs}</TableCell>
                    <TableCell className="text-center">
                      {actHrs > 0 ? (
                        <span className={`text-xs font-mono font-medium ${actHrs > estHrs ? 'text-red-600' : 'text-emerald-600'}`}>
                          {actHrs}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {extCount > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                          <History className="h-3 w-3 mr-1" />{extCount} extension{extCount > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => {
                          setActualHoursDialog({ open: true, taskId: task.id, taskTitle: task.title });
                          setActualHoursValue(task.actualHours || '');
                          setActualCompletionDate(task.completedAt ? format(new Date(task.completedAt), 'yyyy-MM-dd') : '');
                        }}>
                          <Clock className="h-3 w-3 mr-1" />Actual
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => {
                          const nextDay = task.dueDate ? format(new Date(new Date(task.dueDate).getTime() + 86400000), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
                          setExtensionDialog({ open: true, taskId: task.id, taskTitle: task.title });
                          setExtensionForm({ ...extensionForm, newDueDate: nextDay });
                        }}>
                          <Plus className="h-3 w-3 mr-1" />Extend
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Extension Dialog */}
      <Dialog open={extensionDialog.open} onClose={() => setExtensionDialog({ open: false, taskId: '', taskTitle: '' })} title={`Extend: ${extensionDialog.taskTitle}`} size="lg">
        <div className="space-y-4">
          <div><Label className="text-xs">New Due Date *</Label><Input type="date" value={extensionForm.newDueDate} onChange={e => setExtensionForm({ ...extensionForm, newDueDate: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs">Reason for Extension *</Label><textarea value={extensionForm.reason} onChange={e => setExtensionForm({ ...extensionForm, reason: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mt-1" placeholder="Why is the extension needed?" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs">Additional Hours Needed</Label><Input type="number" step="0.5" value={extensionForm.additionalHours} onChange={e => setExtensionForm({ ...extensionForm, additionalHours: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Additional Cost ($)</Label><Input type="number" step="0.01" value={extensionForm.additionalCost} onChange={e => setExtensionForm({ ...extensionForm, additionalCost: e.target.value })} className="mt-1" /></div>
          </div>
          <div><Label className="text-xs">Additional Resources Required</Label><Input value={extensionForm.additionalResources} onChange={e => setExtensionForm({ ...extensionForm, additionalResources: e.target.value })} className="mt-1" placeholder="e.g. Extra labor, materials, equipment" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setExtensionDialog({ open: false, taskId: '', taskTitle: '' })}>Cancel</Button>
          <Button onClick={handleRequestExtension}>Request Extension</Button>
        </DialogFooter>
      </Dialog>

      {/* Actual Hours Dialog */}
      <Dialog open={actualHoursDialog.open} onClose={() => setActualHoursDialog({ open: false, taskId: '', taskTitle: '' })} title={`Record Actuals: ${actualHoursDialog.taskTitle}`}>
        <div className="space-y-4">
          <div><Label className="text-xs">Actual Hours Taken *</Label><Input type="number" step="0.5" value={actualHoursValue} onChange={e => setActualHoursValue(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">Completion Date (leave blank if not done)</Label><Input type="date" value={actualCompletionDate} onChange={e => setActualCompletionDate(e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setActualHoursDialog({ open: false, taskId: '', taskTitle: '' })}>Cancel</Button>
          <Button onClick={handleSetActualHours}>Save</Button>
        </DialogFooter>
      </Dialog>
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
            <div><Label>Description</Label><Input value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} /></div>
            <div><Label>Amount ($)</Label><Input type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} /></div>
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
            <div><Label>Hours</Label><Input type="number" step="0.5" value={newTimeLog.hours} onChange={e => setNewTimeLog({...newTimeLog, hours: e.target.value})} /></div>
            <div><Label>Description</Label><Input value={newTimeLog.description} onChange={e => setNewTimeLog({...newTimeLog, description: e.target.value})} /></div>
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
        <Button variant="ghost" size="icon" onClick={() => router.push('/projects')}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
            <span>{project.projectNo}</span>
            <span>•</span>
            <Select value={project.status} onChange={e => handleUpdateProject({ status: e.target.value })} className="h-7 w-32 capitalize text-xs bg-slate-100 border-none">
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="shadow-sm border-t-4 border-t-mine-blue-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Budget</CardTitle></CardHeader>
          <CardContent>
            {isEditingBudget ? (
              <Input type="number" step="0.01" autoFocus className="text-xl font-bold h-10 w-full" value={editBudgetAmount}
                onChange={(e) => setEditBudgetAmount(e.target.value)}
                onBlur={() => { setIsEditingBudget(false); if (editBudgetAmount && editBudgetAmount !== project.budget) handleUpdateProject({ budget: editBudgetAmount }); }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setIsEditingBudget(false); }}
              />
            ) : (
              <p className="text-2xl font-bold text-slate-900 cursor-pointer hover:text-mine-blue-600 transition-colors" onClick={() => { setEditBudgetAmount(project.budget || '0'); setIsEditingBudget(true); }}>
                ${Number(project.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-t-4 border-t-amber-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Expenses</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-slate-900">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card className="shadow-sm border-t-4 border-t-emerald-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Remaining</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-slate-900">${(Number(project.budget) - totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card className="shadow-sm border-t-4 border-t-purple-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Hours (Est / Actual)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{totalEstimatedHours.toFixed(0)} / {totalActualHours.toFixed(0)}</p>
            {totalActualHours > 0 && totalEstimatedHours > 0 && (
              <p className={`text-xs mt-1 ${totalActualHours > totalEstimatedHours ? 'text-red-600' : 'text-emerald-600'}`}>
                {totalActualHours > totalEstimatedHours ? '+' : ''}{((totalActualHours - totalEstimatedHours) / totalEstimatedHours * 100).toFixed(0)}% vs planned
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-t-4 border-t-rose-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Extensions / Addl. Cost</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{totalExtensions}</p>
            {totalAdditionalCost > 0 && <p className="text-xs text-amber-600 mt-1">+${totalAdditionalCost.toLocaleString()} extra</p>}
          </CardContent>
        </Card>
      </div>

      {plannedDuration > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Project Timeline</span>
              <div className="flex items-center gap-4">
                <span>Planned: <span className="font-medium">{plannedDuration} days</span></span>
                <span>Elapsed: <span className={`font-medium ${actualDuration > plannedDuration ? 'text-red-600' : 'text-slate-700'}`}>{actualDuration} days</span></span>
                {totalExtensions > 0 && <Badge className="bg-amber-100 text-amber-800"><History className="h-3 w-3 mr-1" />{totalExtensions} extension{totalExtensions > 1 ? 's' : ''}</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8">
        <Tabs tabs={tabsData} defaultTab="overview" />
      </div>
    </div>
  );
}
