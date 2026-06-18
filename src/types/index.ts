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

// HR Types
export interface Employee {
  id: string;
  employeeNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employmentType: string;
  dateHired: Date;
  tinNumber: string;
  nssaNumber: string;
  necNumber: string;
  zimdefNumber: string;
  basicSalary: number;
  currency: string;
  bankName: string;
  bankAccount: string;
  isActive: boolean;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  employee?: Employee;
  period: string;
  basicPay: number;
  overtime: number;
  allowances: number;
  grossPay: number;
  payeTax: number;
  aidsLevy: number;
  nssaDeduction: number;
  necDeduction: number;
  zimdefDeduction: number;
  otherDeductions: number;
  netPay: number;
  currency: string;
  status: string;
  paidAt: Date | null;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: Employee;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: string;
}

// Fleet Types
export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  make: string;
  type: string;
  fuelType: string;
  status: string;
  assignedDriver: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  refuelDate: Date;
  quantity: number;
  unitCost: number;
  totalCost: number;
  odometer: number;
  vendor: string;
}

export interface VehicleDispatch {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  dispatchedAt: Date;
  returnedAt: Date | null;
  driverName: string;
  origin: string;
  destination: string;
  status: string;
}

// Workshop Types
export interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
  model: string;
  manufacturer: string;
  serialNo: string;
  location: string;
  status: string;
}

export interface WorkOrder {
  id: string;
  woNumber: string;
  equipmentId: string;
  equipment?: Equipment;
  type: string;
  priority: string;
  description: string;
  assignedTo: string;
  status: string;
}

// Warehouse Types
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
}

export interface StockMovement {
  id: string;
  movementNo: string;
  type: string;
  productName: string;
  quantity: number;
  fromWarehouseId: string;
  toWarehouseId: string;
}

export interface CycleCount {
  id: string;
  countNo: string;
  warehouseId: string;
  warehouse?: Warehouse;
  status: string;
  countedBy: string;
  countedAt: Date;
}

// CRM Types
export interface Lead {
  id: string;
  customerId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  source: string;
  stage: string;
  value: number;
  probability: number;
  assignedTo: string;
  expectedCloseDate: Date | null;
  customer?: { name: string };
}

// Tax Types
export interface TaxType {
  id: string;
  code: string;
  name: string;
  category: string;
  rate: number;
  isActive: boolean;
}

// FDMS Types
export interface FdmsDevice {
  id: string;
  deviceId: string;
  serialNo: string;
  status: string;
  fiscalDayNo: number;
  receiptCounter: number;
  receiptGlobalNo: number;
  lastSyncAt: Date | null;
}

// Supplier Types
export interface Supplier {
  id: string;
  code: string;
  name: string;
  itf263Status: string;
  itf263Expiry: Date | null;
  paymentTerms: string;
  performanceScore: number;
  category: string;
  blacklisted: boolean;
  isActive: boolean;
}

export interface SupplierContract {
  id: string;
  supplierId: string;
  contractNo: string;
  title: string;
  startDate: Date;
  endDate: Date;
  value: number;
  currency: string;
  status: string;
}

// System Types
export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  category: string;
  description: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  changes: any;
  ipAddress: string;
  createdAt: Date;
}
