'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectOption } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save } from 'lucide-react';

interface JournalLine {
  id: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

interface JournalFormProps {
  accounts: SelectOption[];
  onSubmit: (data: {
    entryDate: string;
    description: string;
    lines: JournalLine[];
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function JournalForm({ accounts, onSubmit, onCancel, loading }: JournalFormProps) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { id: crypto.randomUUID(), accountId: '', description: '', debit: 0, credit: 0 },
  ]);

  const addLine = () => {
    setLines([...lines, { id: crypto.randomUUID(), accountId: '', description: '', debit: 0, credit: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter((l) => l.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof JournalLine, value: string | number) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const totalDebits = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced || !description) return;
    onSubmit({ entryDate, description, lines });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Journal Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Entry Date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
            <Input
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the transaction"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-700">Journal Lines</h4>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" /> Add Line
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 font-medium text-slate-500">Account</th>
                    <th className="text-left py-2 px-2 font-medium text-slate-500">Description</th>
                    <th className="text-right py-2 px-2 font-medium text-slate-500">Debit</th>
                    <th className="text-right py-2 px-2 font-medium text-slate-500">Credit</th>
                    <th className="w-10 py-2 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={line.id} className="border-b border-slate-100">
                      <td className="py-1 px-2">
                        <Select
                          options={accounts}
                          placeholder="Select account"
                          value={line.accountId}
                          onChange={(e) => updateLine(line.id, 'accountId', e.target.value)}
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          className="w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-mine-blue-500 focus:outline-none py-1 text-sm bg-transparent"
                          value={line.description}
                          onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                          placeholder="Line description"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-mine-blue-500 focus:outline-none py-1 text-sm bg-transparent font-mono"
                          value={line.debit || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateLine(line.id, 'debit', val);
                            if (val > 0) updateLine(line.id, 'credit', 0);
                          }}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-mine-blue-500 focus:outline-none py-1 text-sm bg-transparent font-mono"
                          value={line.credit || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateLine(line.id, 'credit', val);
                            if (val > 0) updateLine(line.id, 'debit', 0);
                          }}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-medium">
                    <td colSpan={2} className="py-2 px-2 text-right text-slate-700">Totals</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-900">
                      {totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-slate-900">
                      {totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className={`text-sm font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              {isBalanced ? 'Journal is balanced' : `Difference: ${(totalDebits - totalCredits).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isBalanced || !description || loading} loading={loading}>
              <Save className="h-4 w-4 mr-2" />
              Post Journal Entry
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
