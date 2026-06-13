export const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
] as const;

export const ACCOUNT_CATEGORIES: Record<string, string[]> = {
  asset: ['current_asset', 'fixed_asset', 'other_asset'],
  liability: ['current_liability', 'long_term_liability', 'other_liability'],
  equity: ['capital', 'retained_earnings', 'drawings'],
  revenue: ['operating_revenue', 'other_revenue'],
  expense: ['operating_expense', 'administrative_expense', 'other_expense'],
};

export const CATEGORY_LABELS: Record<string, string> = {
  current_asset: 'Current Asset',
  fixed_asset: 'Fixed Asset',
  other_asset: 'Other Asset',
  current_liability: 'Current Liability',
  long_term_liability: 'Long-term Liability',
  other_liability: 'Other Liability',
  capital: 'Capital',
  retained_earnings: 'Retained Earnings',
  drawings: 'Drawings',
  operating_revenue: 'Operating Revenue',
  other_revenue: 'Other Revenue',
  operating_expense: 'Operating Expense',
  administrative_expense: 'Administrative Expense',
  other_expense: 'Other Expense',
};

export const JOURNAL_STATUS = [
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted' },
  { value: 'void', label: 'Void' },
] as const;

export const ORDER_STATUS = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const PO_STATUS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const AR_STATUS = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'void', label: 'Void' },
] as const;

export const AP_STATUS = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'void', label: 'Void' },
] as const;

export const CASHBOOK_TYPES = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'payment', label: 'Payment' },
  { value: 'transfer', label: 'Transfer' },
] as const;

export const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'manager', label: 'Manager' },
  { value: 'user', label: 'User' },
] as const;

export const NAV_ITEMS = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },
  {
    group: 'Financial',
    items: [
      { label: 'Chart of Accounts', href: '/financial/coa', icon: 'BookOpen' },
      { label: 'Journal Entries', href: '/financial/journal', icon: 'FileText' },
      { label: 'General Ledger', href: '/financial/ledger', icon: 'Book' },
      { label: 'Trial Balance', href: '/financial/trial-balance', icon: 'Scale' },
      { label: 'Accounts Receivable', href: '/financial/ar', icon: 'Receipt' },
      { label: 'Accounts Payable', href: '/financial/ap', icon: 'CreditCard' },
      { label: 'Cashbook', href: '/financial/cashbook', icon: 'Wallet' },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { label: 'Products', href: '/inventory/products', icon: 'Package' },
      { label: 'Sales Orders', href: '/inventory/sales-orders', icon: 'ShoppingCart' },
      { label: 'Purchase Orders', href: '/inventory/purchase-orders', icon: 'Truck' },
    ],
  },
  {
    group: 'CRM',
    items: [
      { label: 'Customers', href: '/crm/customers', icon: 'Users' },
      { label: 'Suppliers', href: '/crm/suppliers', icon: 'Building2' },
    ],
  },
];
