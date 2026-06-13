'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, FolderOpen, File, Plus, Edit2, Trash2 } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string | null;
  isHeader: boolean;
  parentId: string | null;
  balance: number;
  isActive: boolean;
  children?: Account[];
}

interface CoaTreeProps {
  accounts: Account[];
  onAdd: (parentId?: string) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

function AccountNode({
  account,
  depth,
  onAdd,
  onEdit,
  onDelete,
}: {
  account: Account;
  depth: number;
  onAdd: (parentId?: string) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = account.children && account.children.length > 0;

  const typeColors: Record<string, string> = {
    asset: 'text-mine-blue-700',
    liability: 'text-mine-green-700',
    equity: 'text-purple-700',
    revenue: 'text-mine-amber-700',
    expense: 'text-red-700',
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-slate-50 group transition-colors',
          depth > 0 && 'ml-6'
        )}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 hover:bg-slate-200 rounded"
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />
          ) : (
            <span className="w-4" />
          )}
        </button>

        <div className="flex-1 flex items-center gap-3">
          {account.isHeader ? (
            <FolderOpen className={cn('h-4 w-4', typeColors[account.type] || 'text-slate-400')} />
          ) : (
            <File className={cn('h-4 w-4', typeColors[account.type] || 'text-slate-400')} />
          )}
          <span className="text-xs font-mono text-slate-400 w-16">{account.code}</span>
          <span className={cn('text-sm font-medium', account.isHeader ? 'text-slate-900 font-semibold' : 'text-slate-700')}>
            {account.name}
          </span>
          {account.isHeader && (
            <Badge variant="secondary" className="text-xs">Header</Badge>
          )}
          {!account.isActive && (
            <Badge variant="outline" className="text-xs text-red-500">Inactive</Badge>
          )}
        </div>

        <div className="text-sm font-mono text-slate-600">
          {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>

        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={() => onAdd(account.id)}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            title="Add sub-account"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => onEdit(account)}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            title="Edit"
          >
            <Edit2 className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {!account.isHeader && (
            <button
              onClick={() => onDelete(account)}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <div>
          {account.children!.map((child) => (
            <AccountNode
              key={child.id}
              account={child}
              depth={depth + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CoaTree({ accounts, onAdd, onEdit, onDelete }: CoaTreeProps) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <FolderOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p>No accounts found</p>
        <Button variant="outline" className="mt-4" onClick={() => onAdd()}>
          <Plus className="h-4 w-4 mr-2" />
          Create First Account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {accounts.map((account) => (
        <AccountNode
          key={account.id}
          account={account}
          depth={0}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
