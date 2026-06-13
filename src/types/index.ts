export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string | null;
  isHeader: boolean;
  parentId: string | null;
  balance: number;
  currency: string;
  isActive: boolean;
  children?: Account[];
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  description: string;
  entryDate: Date;
  period: string;
  status: 'draft' | 'posted' | 'void';
  postedAt: Date | null;
  postedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  lines: JournalLine[];
}

export interface JournalLine {
  id: string;
  entryId: string;
  accountId: string;
  description: string | null;
  debit: number;
  credit: number;
  currency: string;
  account?: Account;
}

export interface DashboardStats {
  totalRevenue: number;
  outstandingAR: number;
  outstandingAP: number;
  cashBalance: number;
  revenueChange: number;
  arChange: number;
  apChange: number;
}

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  type: string;
  amount: number;
  status: string;
}

export interface ChartDataPoint {
  month: string;
  revenue: number;
  expenses: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}
