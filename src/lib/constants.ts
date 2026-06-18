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

export const EQUIPMENT_TYPES = [
  { value: 'crusher', label: 'Crusher' },
  { value: 'mill', label: 'Mill' },
  { value: 'conveyor', label: 'Conveyor' },
  { value: 'loader', label: 'Loader' },
  { value: 'excavator', label: 'Excavator' },
  { value: 'drill', label: 'Drill' },
  { value: 'pump', label: 'Pump' },
  { value: 'generator', label: 'Generator' },
] as const;

export const WORK_ORDER_TYPES = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'predictive', label: 'Predictive' },
] as const;

export const ITF263_STATUS = [
  { value: 'valid', label: 'Valid' },
  { value: 'expired', label: 'Expired' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'not_required', label: 'Not Required' },
] as const;

export const SUPPLIER_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'mining_equipment', label: 'Mining Equipment' },
  { value: 'chemicals', label: 'Chemicals' },
  { value: 'safety_gear', label: 'Safety Gear' },
  { value: 'spare_parts', label: 'Spare Parts' },
  { value: 'transport', label: 'Transport' },
  { value: 'services', label: 'Services' },
] as const;

export const TAX_CATEGORIES = [
  { value: 'vat', label: 'VAT' },
  { value: 'paye', label: 'PAYE' },
  { value: 'corporate_tax', label: 'Corporate Income Tax' },
  { value: 'withholding_tax', label: 'Withholding Tax' },
  { value: 'capital_gains_tax', label: 'Capital Gains Tax' },
  { value: 'aids_levy', label: 'AIDS Levy' },
  { value: 'nssa', label: 'NSSA' },
  { value: 'nec', label: 'NEC' },
  { value: 'zimdef', label: 'ZIMDEF' },
] as const;

export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'ZiG', label: 'Zimbabwe Gold (ZiG)' },
  { value: 'ZWL', label: 'Zimbabwe Dollar (ZWL)' },
  { value: 'ZAR', label: 'South African Rand (ZAR)' },
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
      { label: 'Tax Engine', href: '/tax', icon: 'Percent' },
    ],
  },
  {
    group: 'CRM',
    items: [
      { label: 'Customers', href: '/crm/customers', icon: 'Users' },
      { label: 'Leads', href: '/crm/leads', icon: 'Target' },
      { label: 'Suppliers', href: '/suppliers', icon: 'Building2' },
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
    group: 'Purchasing',
    items: [
      { label: 'Requisitions', href: '/purchasing/requisitions', icon: 'ClipboardList' },
    ],
  },
  {
    group: 'Warehouse',
    items: [
      { label: 'Warehouses', href: '/warehouse', icon: 'Warehouse' },
      { label: 'Stock Movements', href: '/warehouse/movements', icon: 'ArrowLeftRight' },
      { label: 'Cycle Counts', href: '/warehouse/cycle-counts', icon: 'ClipboardCheck' },
    ],
  },
  {
    group: 'POS',
    items: [
      { label: 'POS Terminal', href: '/pos', icon: 'ShoppingCart' },
      { label: 'Sessions', href: '/pos/sessions', icon: 'Receipt' },
      { label: 'History', href: '/pos/history', icon: 'FileText' },
    ],
  },
  {
    group: 'Workshop',
    items: [
      { label: 'Equipment', href: '/workshop/equipment', icon: 'Wrench' },
      { label: 'Work Orders', href: '/workshop/work-orders', icon: 'ClipboardList' },
    ],
  },
  {
    group: 'FDMS',
    items: [
      { label: 'Fiscalisation', href: '/fdms', icon: 'QrCode' },
    ],
  },
  {
    group: 'Reports',
    items: [
      { label: 'Reports & Analytics', href: '/reports', icon: 'BarChart3' },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Users', href: '/admin/users', icon: 'Shield' },
      { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
    ],
  },
];
