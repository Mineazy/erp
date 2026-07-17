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
// Quotation Types
export interface QuotationLine {
  id: string;
  quoteId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  quoteDate: string;
  validUntil: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  currency: string;
  exchangeRate: number;
  notes: string | null;
  terms: string | null;
  convertedToId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: QuotationLine[];
}

// Goods Receipt Types
export interface GoodsReceiptLine {
  id: string;
  receiptId: string;
  productId: string;
  productName: string;
  poLineId: string;
  quantity: number;
  batchNo: string | null;
  serialNo: string | null;
  location: string | null;
}

export interface GoodsReceipt {
  id: string;
  receiptNo: string;
  poId: string;
  supplierId: string | null;
  supplierName: string | null;
  receivedAt: string;
  status: string;
  notes: string | null;
  inspectedBy: string | null;
  inspectionStatus: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: GoodsReceiptLine[];
  po?: { poNumber: string; supplierName: string };
}

// Dispatch Note Types
export interface DispatchNoteLine {
  id: string;
  dispatchId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  batchNo: string | null;
}

export interface DispatchNote {
  id: string;
  dispatchNo: string;
  salesOrderId: string | null;
  customerId: string | null;
  customerName: string | null;
  dispatchDate: string;
  status: string;
  vehicleNo: string | null;
  driverName: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: DispatchNoteLine[];
  salesOrder?: { orderNumber: string };
}

// IM Types
export interface ChatUser {
  id: string;
  name: string;
  email: string;
}

export interface ChatAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  attachments?: ChatAttachment[];
  createdAt: string;
  sender: ChatUser;
}

export interface Chat {
  id: string;
  subject: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
  messages?: ChatMessage[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  joinedAt: string;
  lastReadAt: string | null;
  user: ChatUser;
}

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

// Inventory Core Types
export interface ProductBatch {
  id: string;
  productId: string;
  batchNo: string;
  serialNo: string | null;
  quantity: number;
  costPrice: number;
  receivedAt: string;
  expiryDate: string | null;
  isActive: boolean;
}

export interface ProductHistory {
  id: string;
  productId: string;
  productName: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  action: string;
  userId: string;
  userName: string | null;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  adjustmentNo: string;
  productId: string;
  productName: string;
  adjustmentType: string;
  quantity: number;
  currentStock: number;
  newStock: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  userId: string;
  createdAt: string;
}

export interface StockTransfer {
  id: string;
  transferNo: string;
  fromBranchId: string;
  toBranchId: string;
  fromBranch?: { id: string; name: string; code: string };
  toBranch?: { id: string; name: string; code: string };
  status: string;
  requestedBy: string;
  approvedBy: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: StockTransferLine[];
}

export interface StockTransferLine {
  id: string;
  transferId: string;
  productId: string;
  productName: string;
  quantity: number;
  batchNo: string | null;
  unitPrice: number;
}

export interface InventoryCount {
  id: string;
  countNo: string;
  status: string;
  countedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string };
  lines?: InventoryCountLine[];
}

export interface InventoryCountLine {
  id: string;
  countId: string;
  productId: string;
  productName: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  notes: string | null;
}

export interface InventoryForecast {
  id: string;
  productId: string;
  productName: string;
  forecastDate: string;
  predictedDemand: number;
  confidenceLevel: number;
  seasonalPattern: string | null;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  predictedStockoutDate: string | null;
  createdAt: string;
}

export interface SalesPrediction {
  id: string;
  productId: string;
  productName: string;
  branchId: string | null;
  branch?: { id: string; name: string };
  predictedDate: string;
  predictedQuantity: number;
  predictedAmount: number | null;
  confidenceLevel: number;
  trend: string | null;
  actualQuantity: number | null;
  variance: number | null;
  createdAt: string;
}

export interface InventoryOptimization {
  id: string;
  productId: string;
  productName: string;
  branchId: string | null;
  branch?: { id: string; name: string };
  recommendationType: string;
  currentStock: number;
  suggestedAction: string;
  suggestedQty: number;
  reason: string | null;
  priority: string;
  isApplied: boolean;
  createdAt: string;
}

export interface InventoryAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  readAt: string | null;
  userId: string | null;
  createdAt: string;
}

export interface InventoryAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string | null;
  changes: any;
  userId: string;
  userName: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface DashboardInventoryStats {
  totalProducts: number;
  totalStockQty: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentMovements: number;
  branchSummary: { id: string; name: string; productCount: number; stockQty: number; value: number }[];
  forecastsAvailable: boolean;
}
