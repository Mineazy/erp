# MEMORY.md

Project memory for the Mineazy ERP repository. Summarizes work completed so future sessions can pick up quickly.

## Project Overview
- **Repo**: https://github.com/Mineazy/erp (remote `origin`, branch `master`)
- **Stack**: Next.js (App Router) + TypeScript + Tailwind, jsPDF for PDF generation, PM2 (`pm2 restart erp`) on server `root@mineazy.com`
- **Database**: MySQL `mineazy_erp` (password `Adm1n@2024!`), Prisma ORM (v5.22.0)
- **Root layout** (`src/app/layout.tsx`) wraps all routes in `<Providers>` + `<AppShell>` (sidebar + navbar). `AppShell` renders standalone (no chrome) for `/login` and any `/verify/*` path.
- **Prisma models key additions**: `ErpInstallmentPlan`, `ErpInstallmentPayment` (installment tracking for heavy duty equipment sales), `ErpBackOrder` (enhanced with procurement stages), `ErpBackOrderLine`, `ErpBackOrderActivity`, `ErpRepairJobCard`, `ErpRepairActivity`, `ErpPriceAdjustment`, `ErpTaskExtension`, `ErpDocumentShare`

## Deploy Flow
- **SSH key**: `$env:USERPROFILE\.ssh\id_rsa`
- **LIVE DIRECTORY**: `/var/www/erp` (NOT `/root/erp` — PM2 exec cwd is `/var/www/erp`)
- **Deploy command**: `tar` src+prisma → SCP tar to server → extract to `/var/www/erp` → `npx prisma generate` → `npx next build` → `pm2 restart erp`
- **Full deploy steps**:
  1. `cd "C:\Users\Administrator\tmp\erp"; tar -cf erp-src.tar src prisma`
  2. `scp -i "$env:USERPROFILE\.ssh\id_rsa" erp-src.tar root@mineazy.com:/tmp/erp-src.tar`
  3. `ssh -i "$env:USERPROFILE\.ssh\id_rsa" root@mineazy.com "cd /var/www/erp; rm -rf src prisma; tar -xf /tmp/erp-src.tar; npx prisma generate; npx next build"`
  4. `ssh -i "$env:USERPROFILE\.ssh\id_rsa" root@mineazy.com "pm2 restart erp"`
- **Must run `npx prisma generate`** on server after schema changes before build
- **Database name**: `mineazy_erp` (NOT `erp`)
- New directories on server must be created with `mkdir -p` before `scp`
- After finishing a task: run `npx tsc --noEmit` before deploying
- After schema changes: `scp schema.prisma` → `npx prisma generate` → `npx prisma db push` → then build
- For new pages/routes: create local files → `scp` all to server → `npx next build` → `pm2 restart erp`

## Critical Gotchas

### Prisma `mode: 'insensitive'` — DO NOT USE ON MYSQL
- Prisma v5.22.0 on MySQL does **NOT support `mode: 'insensitive'`** for `contains`. It throws `PrismaClientValidationError: Unknown argument 'mode'`.
- MySQL's default collation (`utf8mb4_general_ci` / `utf8mb4_0900_ai_ci`) is **already case-insensitive**, so `contains` is inherently case-insensitive.
- **Never add `mode: 'insensitive'`** to any Prisma `contains` filter on this project. It will crash the API with a 500 error.

### ProductPicker Race Condition — Server-side Search
- The Branch Orders ProductPicker does **server-side search** (not client-side filtering).
- When the picker closes, `serverResults` is cleared. A `selectedProductRef` caches the last selected product so it persists.
- Additionally, a `selectedProduct` prop provides saved product data from line items for the Edit dialog fallback.
- ProductPicker lookup chain: `allProducts.find()` → `selectedProductRef.current` → `selectedProduct` prop.

### Branch Stock Orders — ProductPicker Architecture
- Products are fetched from `/api/inventory/products?search=...&limit=50&warehouseId=...` (server-side).
- When `warehouseId` is provided, the API returns ALL products (not filtered by warehouse). It enriches `stock` with the selected warehouse's quantity and `availableLocations` with names of OTHER warehouses that have the product.
- ProductPicker shows warehouse availability pills (amber badges) for products available in other warehouses.

### Next.js 15 Route Params
- Route params are `Promise<{ id: string }>` (not synchronous).

### Prisma `getBody()` Returns `any`
- Must cast with `as string` for Prisma create/update operations.
- TypeScript infers destructured body as `{}` — always type as `const body: any = await getBody(request)` to avoid type errors on `.length` etc.

### Prisma `db push` Collation Mismatch on MySQL
- Prisma v5.22.0 may create tables with `utf8mb4_unicode_ci` even when DB default is `utf8mb4_0900_ai_ci`
- This causes FK constraint errors when referencing existing tables with `utf8mb4_0900_ai_ci`
- **Workaround**: Create tables manually via MySQL with correct collation, then `prisma generate` + `prisma db push` (will detect tables already in sync)
- Affected: `hr_disciplinary`, `hr_disciplinary_hearings`, `erp_installment_plans`, `erp_installment_payments`, `erp_back_orders`, `erp_back_order_lines`, `erp_back_order_activities`, `erp_repair_job_cards`, `erp_repair_activities`
- Some tables (`erp_branches`) use `utf8mb4_unicode_ci` — FK from new tables (using `utf8mb4_0900_ai_ci`) will fail. Skip those FK constraints.

### Fuel Unit Cost
- Hardcoded at $1.94/L for both Diesel and Petrol in `/api/fleet/requisitions/redemption/route.ts`
- Change the `FUEL_UNIT_COST` constant if prices change

### Branch Filtering
- `getBranchFilter(session)` returns `{ branchId }` for branch users, `undefined` for admin (no filter).

### Deploy Directory — CRITICAL
- PM2 runs from `/var/www/erp` (check with `pm2 show erp` → `exec cwd`).
- `/root/erp` exists as a separate copy — deploying there has NO effect on the live site.
- **ALWAYS deploy to `/var/www/erp`**. The tar extract command must `cd /var/www/erp` before extracting.

## Recent Feature Work

### Hauling Page — Logistics Haulage Ledger (`src/app/(modules)/fleet/hauling/page.tsx`)
- **Dispatch Cargo Truck form** updated:
  - Source Warehouse: dropdown populated from `/api/warehouse`
  - Driver Name: dropdown populated with unique `assignedDriver` values from Fleet Registry vehicles
  - Destination Shop: multi-select dropdown from `/api/admin/branches` with removable chips
  - Cargo Details/Manifest: multi-select dropdown of in-transit branch orders with removable chips + Eye icon to view order modal
  - Instructions beneath multi-select fields: "Press the CTRL Button to select more than 1..."
- **Date of Dispatch** column added between Vehicle and Route columns
- **Pagination**: 10 rows per page, page numbers with ellipsis, Previous/Next arrows
- **Search**: full-text search across driver, vehicle, route, cargo, status
- **Filters**: Driver, Route, Cargo Details, Status, Date From, Date To (toggle with Filters button)
- Active filter count badge, Clear Filters button

### Branch Stock Orders — Warehouse View (`src/app/(modules)/warehouse/branch-orders/page.tsx`)
Updated to match Inventory Branch Orders view:
- **Process Dialog** with sent qty inputs (instead of simple confirm)
- **View Dialog** with Product Code, Requested Qty, Sent Qty, Received Qty columns
- **Dispatch Note PDF** with Sent Qty column, Driver/Courier and Received By signatures
- **GRN PDF** for received orders
- **Draft** status filter option

### Branch Stock Orders — Edit Dialog Submit Order
- Edit dialog now has three buttons: Cancel, Save as Draft, Submit Order
- Submit Order saves with status `pending` for warehouse processing

### Branch Stock Orders — ProductPicker Performance
- Dialog opens immediately (products load in background)
- Product fetch limit reduced from 10,000 to 500

### Branch Stock Orders — ProductPicker Server-side Search
- Switched from client-side filtering to server-side search with 250ms debounce
- Searches ALL products in the database, not just the first 500
- Shows "X products in stock" when idle, "X products found" when searching

### Branch Stock Orders — Line Items
- **Numbered line items** (# column: 1, 2, 3...)
- **Cumulative Total row** at bottom showing item count and sum of quantities
- Both Create and Edit dialogs

### Branch Stock Orders — Edit Dialog Product Persistence
- `selectedProduct` prop on ProductPicker provides saved product data from line items
- Ensures products display correctly when editing draft orders even if not in the fetched products list

### Branch Stock Orders — ProductSearch Warehouse Pills
- Products not in the selected warehouse show amber pills with warehouse names where they ARE available
- API enriches `availableLocations` with OTHER warehouse names when `warehouseId` is provided

### API Search Fix (`/api/inventory/products/route.ts`)
- Removed `mode: 'insensitive'` from all Prisma `contains` filters (3 files: products, POS transactions, projects)
- Products API, POS Transactions API, Projects API all fixed

### HR Module (full implementation)
- Prisma models: `HrStaff`, `HrLeave`, `HrTimesheet`, `HrLoan`, `HrDisciplinary`, `HrDisciplinaryHearing`
- API routes: `/api/hr/staff`, `/api/hr/leave`, `/api/hr/timesheets`, `/api/hr/loans`, `/api/hr/disciplinary`, `/api/hr/disciplinary/[id]`, `/api/hr/disciplinary/notifications`
- UI pages: `/hr/staff`, `/hr/leave`, `/hr/timesheets`, `/hr/loans`, `/hr/disciplinary`
- Navigation: HR group in sidebar with proper icons (Calendar=Leave, Banknote=Loans, ShieldAlert=Disciplinary)
- Permissions: `hr` module in `authz.ts` (admin/manager: full, accountant/user: readonly)
- Leave: Branch/Dept filters, Contactable Address, Commutation, two-level approval (Manager → Operations Manager)
- Timesheets/Leave/Loans: Bulk import via XLSX (template download + file upload via `/api/hr/import`)
- HR Reports & Analytics page at `/hr/reports` with KPI cards, bar/donut charts, recent activity tables
- `xlsx` (SheetJS) library installed on server for Excel handling

#### Back Order Management (Enhanced with Procurement Stages)
- **Prisma models**: `ErpBackOrder` (enhanced with `stage`, `customerName`, `customerRef`, `urgency`, `targetDate`, `salesReviewedBy/At`), `ErpBackOrderLine` (enhanced with `purchasedQty`, `receivedQty`), `ErpBackOrderActivity` (new — audit log)
- DB tables `erp_back_orders`, `erp_back_order_lines`, `erp_back_order_activities` created manually (FK collation mismatch workaround)
- **Stage Pipeline**: submitted → warehouse_review → procurement_needed → requisition_created → po_created → goods_received → allocation → dispatched → closed
- **Warehouse Review**: View DC stock per line item. If stock available → allocate. If insufficient → request procurement.
- **Procurement Flow**: Request → Purchase Requisition creation (auto-generates via `/api/purchasing/requisitions`) → PO Created → Goods Received → Allocation → Dispatch
- **Activity Timeline**: Full audit log of all stage transitions, actions, and user who performed them. Shown on detail page.
- **Goods Receiving**: Record received quantities per line item when goods arrive from supplier. Updates `receivedQty` and `purchasedQty`.
- **List Page**: Stage filter dropdown, stage badge with icon per row, search by order number/branch/customer
- **Detail Page**: Visual stage pipeline, context-aware action panel (changes per stage), activity timeline sidebar, order info card
- API: `GET/POST /api/warehouse/back-orders`, `GET /api/warehouse/back-orders/[id]`, `POST /api/warehouse/back-orders/[id]/fulfill` (actions: `advance_stage`, `request_procurement`, `create_requisition`, `create_po`, `receive_goods`, `update_lines`)
- Navigation: "Back Orders" under Warehouse sidebar

### Workshop — Returned Equipment Repairs (`/workshop/repairs`)
- **Prisma models**: `ErpRepairJobCard` (job card for customer-returned equipment), `ErpRepairActivity` (audit log)
- DB tables `erp_repair_job_cards`, `erp_repair_activities` created manually (FK collation mismatch workaround)
- **Workflow**: Open → Troubleshooting → Quoted → Paid → In Repair → Repaired → Dispatched → Completed
- **Beyond Repair path**: Open → Troubleshooting → Beyond Repair → Replacement Quoted → Replacement Sent → Dispatched → Completed
- Auto-generated job card numbers (`RC-001`, `RC-002`, etc.)
- Fields: branch, customer name/contact, product name/code/serial, fault description, diagnosis notes, repair cost, replacement cost, assigned technician, received/target/completed/dispatch dates, payment ref, replacement product details
- **Troubleshooting**: Technician documents diagnosis, provides repair cost estimate
- **Beyond Repair**: If equipment is unrepairable, quote replacement product + cost
- **Payment**: Record payment reference before starting repair
- **Replacement**: Quote and dispatch replacement product to branch
- API: `GET/POST /api/workshop/repairs`, `GET/PUT /api/workshop/repairs/[id]`, `POST /api/workshop/repairs/[id]/action`
- Actions: `advance_status`, `submit_diagnosis`, `mark_beyond_repair`, `record_payment`, `quote_replacement`, `dispatch_replacement`
- Navigation: "Returned Repairs" under Workshop sidebar (RotateCcw icon)

### Project Task Extensions & Actual Tracking
- **Prisma model**: `ErpTaskExtension` (tracks deadline extensions per task)
- **New column on `ErpProjectTask`**: `actualHours` — tracks actual hours taken to complete a task
- DB table `erp_task_extensions` created manually (FK to `erp_project_tasks`), `actual_hours` column added via ALTER TABLE
- **Extension workflow**: Click "Extend" on any task → set new due date + reason + additional hours/cost/resources → extension auto-approved and task due date updated
- **Actual hours tracking**: Click "Actual" on any task → record actual hours + completion date → marks task as done
- **Gantt chart**: Shows original due date as grey bar behind the actual bar, extensions labeled, legend added
- **KPI cards**: Added "Hours (Est / Actual)" card with % variance, "Extensions / Addl. Cost" card
- **Project Timeline bar**: Shows planned vs elapsed days with extension count
- **Task table**: Added Est. Hrs, Actual Hrs (color-coded red if over, green if under), Extensions column
- **API**: `GET/POST /api/projects/[id]/tasks/[taskId]/extensions`, `PUT/DELETE /api/projects/[id]/tasks/[taskId]/extensions/[extensionId]`
- Project API now includes `extensions` relation in task data

### Inventory Price Adjustments (`/inventory/products`)
- **Prisma model**: `ErpPriceAdjustment` — audit trail for all price changes
- DB table `erp_price_adjustments` created manually
- **Single product adjustment**: DollarSign icon on each product row → dialog to set new price (cost or selling), shows change amount and %, reason field
- **Bulk adjustment**: "Bulk Adjust" button in header → 3-step wizard (Configure → Preview → Result)
  - Configure: choose price type (cost/selling), adjustment type (% or fixed $), optional category filter, reason
  - Preview: table showing old price, new price, change for each affected product
  - Result: confirmation with summary
- **Price History**: "Price History" button in header → dialog showing all price adjustments with date, product, type, old/new price, change, reason, user
- **API endpoints**:
  - `POST /api/inventory/products/[id]/adjust-price` — single product: `{ priceType, newPrice, reason }`
  - `POST /api/inventory/products/adjust-price-bulk` — bulk: `{ productIds, priceType, adjustmentType, adjustmentValue, categoryId, reason }`
  - `GET /api/inventory/price-history` — list all adjustments, optional `?productId=`

#### Disciplinary Issues (`/hr/disciplinary`)
- **Prisma models**: `HrDisciplinary` (case), `HrDisciplinaryHearing` (hearing records)
- Auto-generated case numbers (`DISC-001`, `DISC-002`, etc.)
- Incident types: Misconduct, Insubordination, Theft, Fraud, Absenteeism, Tardiness, Safety Violation, Harassment, Policy Violation, Poor Performance, etc.
- Warning levels: none → verbal_warning → first_written_warning → final_written_warning
- Hearing verdicts: verbal_warning, first_written_warning, final_warning, no_action, dismissed, adjourned, other
- Status flow: open → under_review → hearing_scheduled → resolved/closed
- Next hearing date/time/venue scheduling with notification bell (7-day lookahead, urgency badges)
- KPI cards: Total Cases, Open, Under Review, Hearing Scheduled, Resolved, Final Warnings
- DB tables `hr_disciplinary` and `hr_disciplinary_hearings` created manually with `utf8mb4_0900_ai_ci` collation (Prisma db push had collation mismatch)

### POS Reports
- Cashier Variances Report, Branch Orders Report

### User Role — Default Module Access
- **File**: `src/lib/authz.ts`
- Users with role `"user"` get default access to **Documents** and **Messaging** modules only
- Other modules require explicit `permissions.modules` assignment by admin
- Three-tier priority: (1) Custom `permissions.modules` → (2) Department overrides → (3) Role defaults
- `USER_DEFAULT_MODULES = ['documents', 'messaging']` constant controls the default list
- Applied in both `canAccessModule()` and `canWriteModule()` functions
- Sidebar filtering automatically reflects these rules via `canAccessModule()`

### Branch Login Restriction
- **Files**: `src/lib/auth.ts`, `src/app/login/page.tsx`, `src/app/api/auth/pre-check/route.ts`
- **Admin & Manager**: Can choose any branch (or "All Branches") at login
- **All other roles** (User, Accountant, Fuel Attendant, etc.): Locked to their registered branch
- **Pre-check flow**: Login page calls `/api/auth/pre-check` with email+password → returns `role` + `canChooseBranch` without creating a session
- If `canChooseBranch` is true → show branch selector step
- If `canChooseBranch` is false → auto-set branch to user's registered branch, skip branch step, sign in directly
- Backend also enforces: if non-admin/manager tries to pass a different branchId, auth throws "You can only login to your registered branch"
- Users without any branch assigned get error "You are not assigned to any branch. Please contact an administrator."

### Fuel Attendant Lockdown
- **File**: `src/lib/authz.ts`, `src/components/layout/sidebar.tsx`
- Fuel attendants are **hard-locked** to only the `/fleet/attendant` page
- `canAccessModule()`: returns `true` only for `fleet` module, all others return `false` — overrides department, custom permissions, and MODULE_PERMISSIONS
- `canWriteModule()`: same hard-lock as `canAccessModule()`
- `canAccessMenu()`: returns `true` only for `/fleet/attendant` exact path
- Sidebar: hardcoded filter shows only Fleet module with only the Attendant page item
- Login redirects fuel attendants to `/fleet/attendant` instead of `/dashboard`

### Permissions — Live Refresh Fix
- **Root cause**: JWT token was only populated with `permissions` at login time. When admin updated a user's permissions, the user's existing JWT stayed stale until re-login.
- **Fix**: `jwt` callback in `src/lib/auth.ts` now re-fetches `permissions`, `role`, `department`, `branchId`, and `branchName` from DB on every request (not just at initial sign-in). Adds one lightweight DB query per request.
- **Permissions model**: `permissions.modules` = which modules are accessible. `permissions.menus` = optional fine-grained restriction within those modules.
  - If `menus` is empty/not set → all pages within allowed modules are accessible
  - If `menus` has specific items → only those specific pages are shown in sidebar
- **Sidebar logic** (`sidebar.tsx`): checks `permissions.menus.length > 0` before applying menu filter. If empty, shows all items in allowed modules.
- **`canAccessMenu()`** (`authz.ts`): same logic — if `menus` is empty, falls back to module-level access.
- **Permissions modal**: Checking a module = access to all its pages. Admin can optionally check specific pages to restrict further. Unchecking a module also removes its menus. Shows count indicator ("3 of 5 pages selected").
- `canAccessModule()` priority order: (1) fuel_attendant hard-lock → (2) custom `permissions.modules` → (3) department overrides → (4) user role defaults → (5) MODULE_PERMISSIONS

### Permissions — Sidebar Menu Filtering Bug Fix
- **Bug**: Fleet module had an early `return` in the `.map()` for the fleet-specific attendant filter, which **bypassed** the `permissions.menus` filter entirely. Non-fuel-attendant users saw all fleet pages even when `permissions.menus` restricted them.
- **Fix** (`sidebar.tsx`): Changed the `.map()` to use a mutable `items` variable that flows through all filters sequentially — first the attendant filter, then the menus filter. No early returns.
- **Modal fix** (`permissions-modal.tsx`): When saving, sends `menus: null` (not `[]`) when no specific pages are checked, to distinguish "all pages" from "no menus set".

### Documents — Owner-Only File Visibility
- **Bug**: `GET /api/documents` had `{ isRestricted: false }` in the `OR` clause, making ALL non-restricted documents visible to every user.
- **Fix** (`src/app/api/documents/route.ts:65-71`): Removed `isRestricted: false` from the OR clause. Documents are now only visible to: (1) the uploader/owner, (2) users the document is shared with.
- Admins/ managers can still delete/rename via existing authorization checks in DELETE/PATCH handlers.
- Folders were already correctly scoped by `userId`. Recent Files page uses the same API endpoint.

### Last Login Tracking
- **Bug**: `lastLogin` field on `ErpUser` was never updated on login — the `signIn` event in `auth.ts` only logged an audit entry.
- **Fix** (`src/lib/auth.ts`): Added `prisma.erpUser.update({ where: { id }, data: { lastLogin: new Date() } })` in the `signIn` event, before the audit log.
- The "Last Login" column on the User Management page (`/admin/users`) now shows the correct date/time after each login.

### POS Terminal
- Branch location badges on products, products sorted by availability (in-stock first, more locations = higher rank)
- Print to POS Printer: iframe-based `buildReceiptHtml` + 250ms render delay before `print()` (avoids popup blocker; works in Tauri WebView2, `POS 80C` system dialog selectable) — `src/lib/pos-print.ts:203`
- Export A4 Invoice: `Download Only` now tries `window.open` → anchor `_blank` → download attr fallback; embedded iframe preview (400px) in dialog with `Open in new tab` link — `src/hooks/use-report-export.tsx:42`
- Negative stock backorder limit `-10`: `canSellProduct` client guard `stock-qty>=-10`; server `erpBranchStock` per-line guard, blocks at exactly -10, shows `BLOCKED` badge at `<=-10`, `BACKORDER` at `<=0` — `src/app/(modules)/pos/page.tsx:1` + `route.ts:167`
- Hydration #418: `isTauri()` now uses `useState`+`useEffect` so initial server render `null` matches client hydrate — `src/components/tauri-sync.tsx:8`
- Public asset routing: `/downloads` and `/pos/setup-guide` public; `isStaticAsset` serves `exe|msi` without session cookie — `src/middleware.ts:4`

### Recent POS Fixes (2026)
- `b14c4c4`: Consistent branch stock deduction + movement log — always create `erpStockMovement` per line; `erpBranchStock.upsert` only when `branchId` exists, matching the negative-stock guard scope
- `eae5996`: Robust PDF preview — iframe preview inside Export dialog + anchor+window.open+download fallback for `handleDownloadOnly`; no Tauri shell dep (fixes TS2307)
- `71e28cd`: iframe print for POS 80C + anchor PDF preview — replaces `window.open` popup with hidden iframe that renders `buildReceiptHtml`, 250ms delay before `print()`, fallback to `window.open` with alert; `buildReceiptHtml` helper reused
- `24825b2`: Hydration #418 fix — `useState`+`useEffect` pattern so `isTauri()` initial render matches server (`null`) then hydrates to `<div>`
- `9ab8701`: Negative stock `-10` — client `canSellProduct` guard + server `erpBranchStock` per-line guard, allows sales until stock reaches exactly -10, then blocks; `BLOCKED`/`BACKORDER` badges
- `9ebcc77`: Public assets — `/downloads` and `/pos/setup-guide` added to `PUBLIC_PATHS`; `isStaticAsset` adds `exe|msi` so downloads serve 200 without session cookie
- `9ebcc77`: Desktop Client loads remote `https://mineazy.com/pos` via `dist/index.html:1` redirect, so web POS fixes auto-load without Tauri rebuild

### CRM Customers
- Branch-specific with branchId, API with getBranchFilter, UI branch selector
- Top 3/Top 5 analytics, auto-generated Customer Code/Loyalty Card Barcode
- TIN/VAT fields, unique constraint handling

### Sales Ledger — Installment Plans (`/financial/installments`)
- **Prisma models**: `ErpInstallmentPlan`, `ErpInstallmentPayment`
- DB tables created manually (FK collation mismatch with `erp_branches` which uses `utf8mb4_unicode_ci`)
- Tracks heavy duty equipment sales on installment (compressors, alternators, generators, ball mills, jaw crushers, tractors, etc.)
- Customers pay a deposit, then balance over 3-6 months in fixed monthly payments
- Auto-generated plan numbers (`INST-001`, `INST-002`, etc.)
- Auto-generated receipt numbers (`RCP-001`, `RCP-002`, etc.) for each payment
- Links to existing AR invoice via `arInvoiceId` (optional)
- Payment processing updates: installment plan balance → AR `paidAmount`/`balance`/`status`
- Product categories: Compressors, Alternators, Generators, Ball Mills, Jaw Crushers, Tractors, Heavy Duty Equipment, Industrial Machinery, Construction Equipment, Mining Equipment, Other
- Plan statuses: active, completed, defaulted, cancelled
- Payment methods: cash, bank_transfer, mobile_money, cheque, card
- API: `GET/POST/PUT /api/financial/installments`, `GET/DELETE /api/financial/installments/[id]`, `POST /api/financial/installments/[id]/payments`
- **Sales Ledger enhanced**: Shows installment plan indicators (amber badges) per customer, plus 3 installment KPI cards (Active Plans, Balance, Monthly Due)
- Navigation: "Installment Plans" added under Financial sidebar after Sales Ledger

### Fleet & Fuel Module (full implementation)
- **Prisma models**: `ErpVehicle`, `ErpFuelRecord`, `ErpFuelRequisition`, `ErpPrepaidFuel`, `ErpPrepaidFuelLog`, `ErpHaulingTrip`, `ErpServiceRecord`, `ErpServiceItem`, `ErpVehicleDispatch`
- **New columns on ErpServiceRecord**: `mechanicName`, `mechanicContact`, `serviceIntervalKm`, `serviceIntervalDays`
- **New model ErpServiceItem**: tracks parts replaced/repaired during service jobs (itemName, itemType, action, quantity, unitCost, totalCost)
- DB table `erp_service_items` created via `prisma db push`

#### Fleet Dashboard (`/fleet/dashboard`)
- KPI cards: fleet size (active/in-transit/maintenance), fuel consumed + cost, hauling trips, service costs
- Fuel by month bar chart with litres and dollar amounts
- Prepaid fuel balances with progress bars (Diesel/Petrol)
- Top 5 fuel consumers ranked list (clickable to vehicle profile)
- Upcoming services (next 30 days) with dates/odometer
- Recent trips and recent fuel records feeds
- Quick links to Vehicles, Fuel Logs, Reports
- API: `GET /api/fleet/dashboard`

#### Vehicle Profile (`/fleet/vehicles/[id]/profile`)
- 4-tab layout: Overview, Trips, Fuel, Services
- Overview: summary cards, fuel-by-month chart, trips-by-month chart, vehicle details, service reminders
- Trips: dispatch history table with status badges
- Fuel: read-only fuel records list (auto-generated from requisitions)
- Services: expandable service history with nested parts/items table, "Add Service" form with dynamic item rows
- API: `GET /api/fleet/vehicles/[id]/profile`, `GET/POST /api/fleet/vehicles/[id]/services`

#### Fuel Logs (`/fleet/fuel-logs`)
- **Auto-generated** from fuel requisitions — no manual entry
- Records created when attendant dispenses fuel via redemption endpoint
- Unit cost: $1.94/L for both Diesel and Petrol
- Source column with `Auto` badge (blue) for requisition-generated records
- Summary cards: total fuel, total cost, avg unit cost (all in $)
- Search by vendor/fuel type/plate, filter by vehicle, pagination
- API: `GET /api/fleet/fuel-logs`

#### Fuel Requisitions — Registry & Approvals (`/fleet/requisitions`)
- **Search**: Full-text search across plate number, requestor name, driver name, purpose, gas station, branch, destination
- **Filters** (toggle with Filters button):
  - Vehicle (dropdown from fleet registry)
  - Fuel Type (Diesel/Petrol)
  - Status (Pending, Treasurer Approved, Approved, Dispensed, Rejected, Cancelled)
  - Date From / Date To (date range)
  - Active filter count badge, Clear button
- **Pagination**: Configurable rows per page (5/10/25/50), page numbers with ellipsis, Previous/Next, "Showing X–Y of Z" indicator
- All filtering and pagination is client-side (data fetched once, filtered in browser)

#### Fuel Requisition → Fuel Log Auto-Generation (`/api/fleet/requisitions/redemption`)
- When fuel is dispensed (token-based), an `ErpFuelRecord` is auto-created
- Fields: vehicleId, quantity (litersRequested), unitCost ($1.94), totalCost, odometer, fuelType, vendor (gasStation)
- Also updates vehicle's `currentOdometer` when dispensed

#### Reports & Analytics (`/fleet/reports`)
- Existing KPI cards: fleet size, service costs, prepaid fuel, hauling deliveries
- **Fuel Consumption Analytics** section added:
  - 5 summary cards: total used, total cost, avg cost/litre, diesel used, petrol used
  - Fuel by month bar chart
  - Fuel by vehicle table (which vehicles consumed the most)
  - Source breakdown: auto-generated vs manual record counts
- Report generator: Prepaid Fuel Audit Ledger, Fleet Maintenance Cost Audit, Logistics Haulage Deliveries Log

#### Navigation Updates
- Fleet & Fuel sidebar group: Dashboard, Vehicles & Tracking, Fuel Attendant, Fuel Requisitions, Prepaid Fuel, **Fuel Logs** (Droplets icon), Hauling Trips, Reports & Analytics
- Vehicles page: added Profile icon button (BarChart3) per vehicle row linking to `/fleet/vehicles/[id]/profile`

## Broader Project History (from git log, older to newer)
- **POS Terminal / Receipts**: restrict receipts/invoices to uploader's root folder, dynamic branch name/details on thermal + A4 receipts, Mineazy logo on A4 fiscal invoice, number casting fixes (`toFixed` TypeError), ExportDialog mount fixes, print actions + POS history filtering/pagination.
- **Z-Reports**: branch dropdown fix, branch column + date range filter, sales calculation fixes, logo on variance report PDF.
- **Docs/housekeeping**: secure auth logging, cleanup of repo artifacts.
