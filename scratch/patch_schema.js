const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');

// 1. Add to ErpWarehouse
schema = schema.replace(
  '  zones     ErpWarehouseZone[]\n',
  '  zones     ErpWarehouseZone[]\n  fromTransfers ErpStockTransfer[] @relation("WarehouseFromTransfer")\n  toTransfers   ErpStockTransfer[] @relation("WarehouseToTransfer")\n'
);

// 2. Add to ErpWarehouseZone
schema = schema.replace(
  '  capacity    Decimal?     @db.Decimal(15, 2)\n',
  '  capacity    Decimal?     @db.Decimal(15, 2)\n  aisle       String?\n  shelf       String?\n  bin         String?\n'
);

// 3. Add to ErpWarehouseStock
schema = schema.replace(
  '  quantity    Decimal      @default(0.00) @db.Decimal(15, 2)\n  location    String?\n',
  '  quantity    Decimal      @default(0.00) @db.Decimal(15, 2)\n  location    String?\n  aisle       String?\n  shelf       String?\n  bin         String?\n'
);

// 4. Update ErpStockTransfer
schema = schema.replace(
  '  fromBranchId String                 @map("from_branch_id")\n  toBranchId   String                 @map("to_branch_id")\n',
  '  fromBranchId String?                @map("from_branch_id")\n  toBranchId   String?                @map("to_branch_id")\n  fromWarehouseId String?             @map("from_warehouse_id")\n  toWarehouseId   String?             @map("to_warehouse_id")\n'
);
schema = schema.replace(
  '  fromBranch   ErpBranch              @relation("FromBranch", fields: [fromBranchId], references: [id])\n  toBranch     ErpBranch              @relation("ToBranch", fields: [toBranchId], references: [id])\n',
  '  fromBranch   ErpBranch?             @relation("FromBranch", fields: [fromBranchId], references: [id])\n  toBranch     ErpBranch?             @relation("ToBranch", fields: [toBranchId], references: [id])\n  fromWarehouse ErpWarehouse?         @relation("WarehouseFromTransfer", fields: [fromWarehouseId], references: [id])\n  toWarehouse   ErpWarehouse?         @relation("WarehouseToTransfer", fields: [toWarehouseId], references: [id])\n'
);
schema = schema.replace(
  '  @@index([toBranchId], map: "erp_stock_transfers_to_branch_id_fkey")\n',
  '  @@index([toBranchId], map: "erp_stock_transfers_to_branch_id_fkey")\n  @@index([fromWarehouseId], map: "erp_stock_transfers_from_warehouse_id_fkey")\n  @@index([toWarehouseId], map: "erp_stock_transfers_to_warehouse_id_fkey")\n'
);

// 5. Update ErpBranch
schema = schema.replace(
  '  toTransfers            ErpStockTransfer[]         @relation("ToBranch")\n',
  '  toTransfers            ErpStockTransfer[]         @relation("ToBranch")\n  backOrders             ErpBackOrder[]\n'
);

// 6. Add ErpBackOrder and ErpBackOrderLine
const backOrderModels = `
model ErpBackOrder {
  id              String              @id @default(uuid())
  orderNumber     String              @unique @map("order_number")
  branchId        String              @map("branch_id")
  status          String              @default("'draft'")
  requestedBy     String              @map("requested_by")
  approvedBy      String?             @map("approved_by")
  approvedAt      DateTime?           @map("approved_at")
  notes           String?
  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")
  branch          ErpBranch           @relation(fields: [branchId], references: [id])
  lines           ErpBackOrderLine[]

  @@index([branchId], map: "erp_back_orders_branch_id_fkey")
  @@map("erp_back_orders")
}

model ErpBackOrderLine {
  id              String       @id @default(uuid())
  backOrderId     String       @map("back_order_id")
  productId       String       @map("product_id")
  productName     String       @map("product_name")
  requestedQty    Decimal      @map("requested_qty") @db.Decimal(15, 2)
  allocatedQty    Decimal      @default(0.00) @map("allocated_qty") @db.Decimal(15, 2)
  outstandingQty  Decimal      @map("outstanding_qty") @db.Decimal(15, 2)
  status          String       @default("'pending'")
  notes           String?
  backOrder       ErpBackOrder @relation(fields: [backOrderId], references: [id], onDelete: Cascade)

  @@index([backOrderId], map: "erp_back_order_lines_back_order_id_fkey")
  @@map("erp_back_order_lines")
}
`;

schema += backOrderModels;

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema updated successfully!');
