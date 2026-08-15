'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Search, Plus, ExternalLink, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function ProjectsList() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    type: 'construction',
    status: 'planning',
    budget: '',
    startDate: '',
    endDate: '',
  });

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch projects', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter, typeFilter]);

  const handleCreate = async () => {
    if (!newProject.name) return alert('Name is required');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      if (res.ok) {
        setIsCreateOpen(false);
        setNewProject({ name: '', description: '', type: 'construction', status: 'planning', budget: '', startDate: '', endDate: '' });
        fetchProjects();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create project');
      }
    } catch (error) {
      console.error(error);
      alert('Error creating project');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">Manage construction and company development projects</p>
        </div>
        
        <Button className="bg-mine-blue-600 hover:bg-mine-blue-700 shadow-sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
        <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Project">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="e.g. Head Office Renovation" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newProject.type} onChange={e => setNewProject({...newProject, type: e.target.value})}>
                  <option value="construction">Construction</option>
                  <option value="internal">Internal Development</option>
                  <option value="client">Client Project</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value})}>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={newProject.startDate} onChange={e => setNewProject({...newProject, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Expected End Date</Label>
                <Input type="date" value={newProject.endDate} onChange={e => setNewProject({...newProject, endDate: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Budget ($)</Label>
              <Input type="number" value={newProject.budget} onChange={e => setNewProject({...newProject, budget: e.target.value})} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Project</Button>
          </DialogFooter>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-[150px] bg-white">
                <option value="all">All Statuses</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </Select>
              <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-[160px] bg-white">
                <option value="all">All Types</option>
                <option value="construction">Construction</option>
                <option value="internal">Internal</option>
                <option value="client">Client</option>
              </Select>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Project ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">Loading projects...</TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">No projects found.</TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => router.push(`/projects/${project.id}`)}>
                    <TableCell className="font-mono text-sm text-slate-500">{project.projectNo}</TableCell>
                    <TableCell className="font-medium text-slate-900">{project.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-slate-600">
                        {project.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        project.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                        project.status === 'on_hold' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                        'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-700">
                      ${Number(project.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {format(new Date(project.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-mine-blue-600 hover:bg-mine-blue-50">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
