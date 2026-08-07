import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export function getAiTools(userRole: string) {
  // Helpers for role checks
  const isAdmin = userRole === 'admin';
  const isAccountant = userRole === 'accountant' || isAdmin;
  const isSales = userRole === 'sales' || isAdmin;
  const isInventory = userRole === 'inventory' || isAdmin;
  const isHR = userRole === 'hr' || isAdmin;
  const isFleet = userRole === 'fleet' || isAdmin;
  const isWorkshop = userRole === 'workshop' || isAdmin;

  return {
    // === GENERIC DATABASE TOOLS ===
    getDatabaseSchema: tool({
      description: 'Get a simplified overview of the database schema (available models and their fields) to understand what data can be queried.',
      parameters: z.object({ dummy: z.string().optional() }),
      execute: async () => {
        // Return a condensed map to save token space
        const models = Prisma.dmmf.datamodel.models.map(m => ({
          model: m.name,
          fields: m.fields.filter(f => f.kind !== 'object').map(f => f.name),
        }));
        return models;
      }
    } as any),
    queryDatabase: tool({
      description: 'Query the database dynamically by providing a modelName and query arguments (where, take, select, orderBy). Use this only when you know the exact schema.',
      parameters: z.object({
        modelName: z.string().describe("The exact Prisma model name (e.g. 'ErpProduct', 'ErpSalesOrder')"),
        queryArgs: z.any().describe("A JSON object representing Prisma findMany arguments. Example: { take: 5, where: { status: 'active' } }")
      }),
      execute: async ({ modelName, queryArgs }: any) => {
        // Basic RBAC checking based on modelName prefix or keyword
        const lowerModel = modelName.toLowerCase();
        
        // Deny HR data unless HR or Admin
        if ((lowerModel.includes('employee') || lowerModel.includes('payroll') || lowerModel.includes('leave') || lowerModel.includes('attendance')) && !isHR) {
          return { error: 'Access Denied: Your role does not permit access to HR data.' };
        }
        
        // Deny Financial data unless Accountant or Admin
        if ((lowerModel.includes('journal') || lowerModel.includes('account') || lowerModel.includes('ledger') || lowerModel.includes('tax') || lowerModel.includes('cashbook')) && !isAccountant) {
          return { error: 'Access Denied: Your role does not permit access to Financial data.' };
        }
        
        // Enforce max records limit to prevent massive data dumps
        const safeQueryArgs = { ...queryArgs };
        if (!safeQueryArgs.take || safeQueryArgs.take > 20) {
          safeQueryArgs.take = 20;
        }

        try {
          // Prisma models are usually camel cased on the prisma client: erpProduct
          const clientModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
          
          if (!(prisma as any)[clientModelName]) {
            return { error: `Model ${modelName} not found in database client.` };
          }

          const results = await (prisma as any)[clientModelName].findMany(safeQueryArgs);
          return {
            count: results.length,
            note: results.length === 20 ? 'Results limited to 20 to prevent data overload.' : undefined,
            data: results
          };
        } catch (e: any) {
          return { error: `Query failed: ${e.message}` };
        }
      }
    } as any),

    // === INVENTORY TOOLS ===
    getInventoryStatus: tool({
      description: 'Get the current inventory status, including low stock products, total value, and product counts.',
      parameters: z.object({ dummy: z.string().optional() }),
      execute: async () => {
        const products = await prisma.erpProduct.findMany({
          where: { isActive: true },
          select: { id: true, name: true, sellingPrice: true }
        });
        
        const branchStocks = await prisma.erpBranchStock.findMany({
          select: { productId: true, quantity: true, minQuantity: true }
        });
        
        const stockMap = new Map();
        const minStockMap = new Map();
        for (const bs of branchStocks) {
          stockMap.set(bs.productId, (stockMap.get(bs.productId) || 0) + Number(bs.quantity));
          minStockMap.set(bs.productId, (minStockMap.get(bs.productId) || 0) + Number(bs.minQuantity));
        }

        const lowStock = products.filter(p => (stockMap.get(p.id) || 0) <= (minStockMap.get(p.id) || 0));
        const totalValue = products.reduce((sum, p) => sum + ((stockMap.get(p.id) || 0) * Number(p.sellingPrice)), 0);
        
        return {
          totalActiveProducts: products.length,
          lowStockCount: lowStock.length,
          lowStockItems: lowStock.map(p => p.name).slice(0, 10), // Limit output
          estimatedTotalValue: totalValue
        };
      },
    } as any),
    searchProducts: tool({
      description: 'Search for products by name or category.',
      parameters: z.object({
        query: z.string().describe('Search term for product name')
      }),
      execute: async ({ query }: any) => {
        const products = await prisma.erpProduct.findMany({
          where: { name: { contains: query } },
          take: 5,
          select: { id: true, name: true, code: true, sellingPrice: true }
        });
        return products;
      }
    } as any),

    // === CRM TOOLS ===
    searchCustomers: tool({
      description: 'Search for customers by name or email.',
      parameters: z.object({
        query: z.string().describe('Search term for customer name or email')
      }),
      execute: async ({ query }: any) => {
        if (!isSales) return { error: 'Access Denied: Your role does not permit access to CRM.' };
        const customers = await prisma.erpCustomer.findMany({
          where: { OR: [{ name: { contains: query } }, { email: { contains: query } }] },
          take: 5,
          select: { id: true, name: true, email: true, phone: true, type: true }
        });
        return customers;
      }
    } as any),
    searchSuppliers: tool({
      description: 'Search for suppliers.',
      parameters: z.object({
        query: z.string().describe('Search term for supplier name')
      }),
      execute: async ({ query }: any) => {
        if (!isSales && !isInventory) return { error: 'Access Denied: Your role does not permit access to Suppliers.' };
        const suppliers = await prisma.erpSupplier.findMany({
          where: { name: { contains: query } },
          take: 5,
          select: { id: true, name: true, email: true, phone: true, category: true }
        });
        return suppliers;
      }
    } as any),

    // === SALES & PROCUREMENT ===
    getSalesOrders: tool({
      description: 'Get recent sales orders.',
      parameters: z.object({
        limit: z.number().optional().describe('Number of recent orders to fetch (default: 5)')
      }),
      execute: async ({ limit }: any) => {
        if (!isSales) return { error: 'Access Denied: Your role does not permit access to Sales.' };
        const orders = await prisma.erpSalesOrder.findMany({
          take: limit || 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, orderNumber: true, total: true, status: true, customerName: true }
        });
        return orders;
      }
    } as any),
    getPurchaseOrders: tool({
      description: 'Get recent purchase orders.',
      parameters: z.object({
        limit: z.number().optional().describe('Number of recent orders to fetch (default: 5)')
      }),
      execute: async ({ limit }: any) => {
        if (!isInventory) return { error: 'Access Denied: Your role does not permit access to Procurement.' };
        const orders = await prisma.erpPurchaseOrder.findMany({
          take: limit || 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, poNumber: true, total: true, status: true, supplierName: true }
        });
        return orders;
      }
    } as any),

    // === POS TOOLS ===
    getRecentSales: tool({
      description: 'Get a summary of recent POS transactions.',
      parameters: z.object({
        limit: z.number().optional().describe('Number of recent transactions to fetch (default: 5)')
      }),
      execute: async ({ limit }: any) => {
        if (!isSales) return { error: 'Access Denied: Your role does not permit access to POS data.' };
        const transactions = await prisma.erpPosTransaction.findMany({
          take: limit || 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, transactionNumber: true, total: true, status: true, createdAt: true }
        });
        return transactions;
      },
    } as any),

    // === FINANCIAL TOOLS ===
    getFinancialSummary: tool({
      description: 'Get a summary of the financial status (Revenue and Expenses). Restricted to admins and accountants.',
      parameters: z.object({ dummy: z.string().optional() }),
      execute: async () => {
        if (!isAccountant) return { error: 'Access Denied: Your role does not permit access to financial summaries.' };
        const journals = await prisma.erpJournalEntry.findMany({
          where: { status: 'POSTED' },
          take: 100
        });
        return {
          totalPostedJournals: journals.length,
          message: 'Full financial aggregation would require deeper ledger queries, but there are ' + journals.length + ' posted journals.'
        };
      },
    } as any),
    getChartOfAccounts: tool({
      description: 'Get chart of accounts summary.',
      parameters: z.object({ dummy: z.string().optional() }),
      execute: async () => {
        if (!isAccountant) return { error: 'Access Denied.' };
        const accounts = await prisma.erpChartOfAccounts.findMany({
          take: 10,
          select: { code: true, name: true, type: true, balance: true }
        });
        return accounts;
      }
    } as any),

    // === FLEET & WORKSHOP TOOLS ===
    getVehicles: tool({
      description: 'Get a list of fleet vehicles and their status.',
      parameters: z.object({ dummy: z.string().optional() }),
      execute: async () => {
        if (!isFleet) return { error: 'Access Denied.' };
        const vehicles = (prisma as any).erpVehicle ? await (prisma as any).erpVehicle.findMany({ take: 5 }) : { error: 'Fleet module not fully initialized.' };
        return vehicles;
      }
    } as any),
    getWorkOrders: tool({
      description: 'Get recent workshop work orders.',
      parameters: z.object({ dummy: z.string().optional() }),
      execute: async () => {
        if (!isWorkshop) return { error: 'Access Denied.' };
        const orders = (prisma as any).erpWorkOrder ? await (prisma as any).erpWorkOrder.findMany({ take: 5 }) : { error: 'Workshop module not fully initialized.' };
        return orders;
      }
    } as any),

    // === HR TOOLS ===
    getEmployees: tool({
      description: 'Get a summary of employees.',
      parameters: z.object({ dummy: z.string().optional() }),
      execute: async () => {
        if (!isHR) return { error: 'Access Denied.' };
        const employees = await prisma.erpEmployee.findMany({
          take: 10,
          select: { firstName: true, lastName: true, department: true, position: true }
        });
        return employees;
      }
    } as any),
  };
}
