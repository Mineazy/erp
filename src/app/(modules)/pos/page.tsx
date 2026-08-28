'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, X, Printer, RotateCcw, LogOut, LogIn, Banknote, Landmark, Smartphone, Clock, ShieldAlert, LayoutGrid, List, Download } from 'lucide-react';
import { useNetwork } from '@/lib/hooks/use-network';
import { cacheData, getCachedData, saveOfflineTransaction } from '@/lib/db';
import { useReportExport } from '@/hooks/use-report-export';
import { generateA4Invoice, printPOSReceipt } from '@/lib/pos-print';

// Image fetching logic moved to pos-print.ts

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  sellingPrice: number;
  stock: number;
  isActive: boolean;
  categoryId?: string;
  minStock?: number;
  barcode?: string;
  description?: string;
  availableLocations?: string[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Session {
  id: string;
  openedAt: string;
  closedAt: string | null;
  status: 'open' | 'closed';
  totalSales: number;
  branchId?: string | null;
}

interface Transaction {
  id: string;
  transactionNumber: string;
  total: number;
  paymentMethod: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  paidAmount: number;
  changeAmount: number;
  createdAt: string;
  fiscalisedDocId?: string | null;
  payments?: { method: string; amount: number; reference?: string; currency?: string; exchangeRate?: number }[];
  lines?: { productName: string; quantity: number; unitPrice: number; total: number }[];
  branch?: { id: string; code: string; name: string; address?: string | null; city?: string | null; country?: string | null; phone?: string | null; email?: string | null } | null;
}

interface PaymentEntry {
  method: string;
  amount: string;
  reference: string;
  currency?: string;
}

const SESSION_MAX_MS = 24 * 60 * 60 * 1000;
const WARNING_THRESHOLD_MS = 60 * 60 * 1000;
const CRITICAL_THRESHOLD_MS = 15 * 60 * 1000;
const EXPIRY_POLL_MS = 30000;

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Landmark },
  { value: 'mobile_wallet', label: 'Mobile Wallet (Manual)', icon: Smartphone },
  { value: 'paynow_ecocash', label: 'Paynow - Ecocash', icon: Smartphone },
  { value: 'paynow_onemoney', label: 'Paynow - OneMoney', icon: Smartphone },
  { value: 'credit', label: 'Credit', icon: CreditCard },
  { value: 'loyalty_points', label: 'Loyalty Points', icon: CreditCard },
  { value: 'loyalty_card_balance', label: 'Loyalty Card Balance', icon: CreditCard },
];

const currencies = [
  { code: 'USD', symbol: '$', rate: 1 },
  { code: 'ZIG', symbol: 'ZiG', rate: 25 },
  { code: 'ZAR', symbol: 'R', rate: 18 },
];

interface Customer {
  id: string;
  code: string;
  name: string;
  loyaltyCardBarcode?: string | null;
  loyaltyPoints: number;
  totalSpent: number;
  cardBalance: number;
}

export default function POSTerminalPage() {
  const { isOnline } = useNetwork();
  const { triggerExport, ExportDialog } = useReportExport();
  const [products, setProducts] = useState<Product[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [selectedTaxId, setSelectedTaxId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([{ value: '', label: 'All Categories' }]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentEntry[]>([{ method: 'cash', amount: '', reference: '', currency: 'USD' }]);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [warningLevel, setWarningLevel] = useState<'none' | 'warning' | 'critical' | 'expired'>('none');
  const [forceCloseDialogOpen, setForceCloseDialogOpen] = useState(false);
  const [closeSessionDialogOpen, setCloseSessionDialogOpen] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [receiptCustomer, setReceiptCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [transferChangeToCard, setTransferChangeToCard] = useState(false);
  const [transferChangeToWallet, setTransferChangeToWallet] = useState(false);
  const [walkinWalletNumber, setWalkinWalletNumber] = useState('');
  const [walkinCustomerName, setWalkinCustomerName] = useState('');
  const [paynowDialog, setPaynowDialog] = useState<{open: boolean, pollUrl: string, instructions: string, invoiceNumber: string, payload: any, status: string}>({ open: false, pollUrl: '', instructions: '', invoiceNumber: '', payload: null, status: '' });
  const [mobileOrders, setMobileOrders] = useState<any[]>([]);
  const [mobileOrdersDialogOpen, setMobileOrdersDialogOpen] = useState(false);
  const [linkedMobileOrderId, setLinkedMobileOrderId] = useState<string | null>(null);

  // Debounced customer search
  useEffect(() => {
    if (!customerSearch) {
      setCustomerSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/crm/customers?search=${encodeURIComponent(customerSearch)}`);
        if (res.ok) {
          const data = await res.json();
          // Check if there is an exact barcode match
          const exactMatch = data.find(
            (c: any) => c.loyaltyCardBarcode?.toLowerCase() === customerSearch.toLowerCase()
          );
          if (exactMatch) {
            setSelectedCustomer(exactMatch);
            setCustomerSearch('');
            setCustomerSearchResults([]);
            toast(`Customer ${exactMatch.name} selected!`, 'success');
          } else {
            setCustomerSearchResults(data);
          }
        }
      } catch (err) {
        console.error('Failed to search customers:', err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [customerSearch]);

  const fetchMobileOrders = async () => {
    try {
      const res = await fetch('/api/pos/mobile-orders');
      if (res.ok) {
        const data = await res.json();
        setMobileOrders(data.items || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMobileOrder = (order: any) => {
    const newCart = order.lines.map((line: any) => ({
      product: {
        id: line.productId,
        name: line.productName,
        sellingPrice: Number(line.unitPrice),
      },
      quantity: Number(line.quantity)
    }));
    setCart(newCart);
    setLinkedMobileOrderId(order.id);
    
    if (order.customerId && order.customerId !== 'walk-in') {
      fetch(`/api/crm/customers/${order.customerId}`)
        .then(res => res.ok ? res.json() : null)
        .then(cust => {
           if (cust) setSelectedCustomer(cust);
           else setSelectedCustomer({ id: order.customerId, name: order.customerName } as any);
        })
        .catch(() => setSelectedCustomer({ id: order.customerId, name: order.customerName } as any));
    } else {
      setSelectedCustomer(null);
    }
    
    setMobileOrdersDialogOpen(false);
    toast('Mobile order loaded into cart', 'success');
  };

  // If cart is edited inside payment dialog and becomes empty, close the dialog
  useEffect(() => {
    if (paymentDialogOpen && cart.length === 0) {
      setPaymentDialogOpen(false);
    }
  }, [cart, paymentDialogOpen]);

  const fetchTaxes = useCallback(async () => {
    try {
      if (!isOnline) {
        const cached = await getCachedData('taxes_cache');
        if (cached.length > 0) {
          setTaxes(cached);
          const vat = cached.find((t: any) => t.code === 'VAT' || t.name.toLowerCase().includes('value added tax'));
          if (vat) setSelectedTaxId(vat.id);
          else if (cached.length > 0) setSelectedTaxId(cached[0].id);
          return;
        }
      }

      const res = await fetch('/api/tax/rates');
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.data || [];
        const activeTaxes = items.filter((t: any) => t.isActive);
        setTaxes(activeTaxes);
        if (isOnline) {
          await cacheData('taxes_cache', activeTaxes);
        }
        
        const vat = activeTaxes.find((t: any) => t.code === 'VAT' || t.name.toLowerCase().includes('value added tax'));
        if (vat) {
          setSelectedTaxId(vat.id);
        } else if (activeTaxes.length > 0) {
          setSelectedTaxId(activeTaxes[0].id);
        }
      }
    } catch {}
  }, [isOnline]);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  useEffect(() => {
    if (!paynowDialog.open || !paynowDialog.pollUrl) return;
    
    let interval = setInterval(async () => {
      try {
        const res = await fetch('/api/pos/paynow/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pollUrl: paynowDialog.pollUrl })
        });
        const data = await res.json();
        
        if (data.success && data.status) {
          setPaynowDialog(prev => ({ ...prev, status: data.status }));
          if (data.status === 'Paid') {
            clearInterval(interval);
            setPaynowDialog(prev => ({ ...prev, open: false }));
            if (paynowDialog.payload) finalizeTransaction(paynowDialog.payload);
          } else if (data.status === 'Cancelled' || data.status === 'Failed') {
            clearInterval(interval);
            toast(`Paynow transaction ${data.status.toLowerCase()}`, 'error');
            setPaynowDialog(prev => ({ ...prev, open: false }));
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [paynowDialog.open, paynowDialog.pollUrl, paynowDialog.payload]);

  const fetchProducts = useCallback(async () => {
    try {
      if (!isOnline) {
        const cached = await getCachedData('products_cache');
        if (cached.length > 0) {
          let filtered = cached;
          if (search) {
            filtered = cached.filter(p => 
              p.name.toLowerCase().includes(search.toLowerCase()) || 
              p.code.toLowerCase().includes(search.toLowerCase()) ||
              (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
            );
          }
          setProducts(filtered);
          setLoading(false);
          return;
        }
      }

      const params = new URLSearchParams({ limit: '5000' });
      if (search) params.append('search', search);
      if (category) params.append('categoryId', category);
      if (session?.branchId) params.append('branchId', session.branchId);
      
      const res = await fetch(`/api/inventory/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.items || data.data || [];
      setProducts(items);
      
      // Cache products if we're not searching, so we have the full active list
      if (!search && isOnline) {
        await cacheData('products_cache', items.filter((p: any) => p.isActive));
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, isOnline]);

  const fetchSession = useCallback(async () => {
    try {
      if (!isOnline) {
        const cached = await getCachedData('session_cache');
        if (cached.length > 0) {
          setSession(cached[0]);
          return;
        }
      }

      const res = await fetch('/api/pos/sessions?status=open');
      const data = await res.json();
      const sessions: Session[] = Array.isArray(data) ? data : data.data || [];
      const activeSession = sessions.length > 0 ? sessions[0] : null;
      setSession(activeSession);
      
      if (activeSession && isOnline) {
        await cacheData('session_cache', [activeSession]);
      }
    } catch {
      setSession(null);
    }
  }, [isOnline]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        if (!isOnline) {
          const cached = await getCachedData('categories_cache');
          if (cached.length > 0) {
            setCategories([
              { value: '', label: 'All Categories' },
              ...cached.map((c: any) => ({ value: c.id, label: c.name }))
            ]);
            return;
          }
        }

        const res = await fetch('/api/inventory/categories');
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.data || [];
          setCategories([
            { value: '', label: 'All Categories' },
            ...items.map((c: any) => ({ value: c.id, label: c.name }))
          ]);
          if (isOnline) {
            await cacheData('categories_cache', items);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategories();
  }, [isOnline]);

  useEffect(() => {
    if (session?.status === 'open') {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [session, fetchProducts]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search) {
      const cleanSearch = search.trim().toLowerCase();
      const exactMatch = products.find(
        (p) =>
          p.isActive &&
          (p.code.toLowerCase() === cleanSearch ||
            p.barcode?.toLowerCase() === cleanSearch)
      );
      if (exactMatch) {
        if (Number(exactMatch.stock) > 0) {
          addToCart(exactMatch);
          setSearch('');
          toast(`Added ${exactMatch.name} to cart`, 'success');
        } else {
          toast(`${exactMatch.name} is out of stock`, 'warning');
        }
      }
    }
  };

  const openSession = async () => {
    try {
      const tid = toast('Saving session...', 'info', 120000);
      let res;
      try {
        res = await fetch('/api/pos/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ openingBalance: 0 }),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        dismissToast(tid);
        toast(err.error || 'Failed to open session', 'error');
        return;
      }
      const data = await res.json();
      dismissToast(tid);
      toast('Session created successfully', 'success');
      setSession(data.data || data);
    } catch {
      toast('Failed to open session', 'error');
    }
  };

  const closeSession = async () => {
    if (!session) return;
    try {
      const tid = toast('Updating session...', 'info', 120000);
      let res;
      try {
        res = await fetch(`/api/pos/sessions/${session.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ closingBalance: actualCashInput || 0 }),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        dismissToast(tid);
        toast(err.error || 'Failed to close session', 'error');
        return;
      }
      const data = await res.json();
      dismissToast(tid);
      toast('Session updated successfully', 'success');
      setSession(data.data || { ...session, status: 'closed', closedAt: new Date().toISOString() });
      setCart([]);
      setCloseSessionDialogOpen(false);
      setActualCashInput('');
    } catch {
      toast('Failed to close session', 'error');
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const formatTimeRemaining = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  useEffect(() => {
    if (!session || session.status !== 'open') {
      setTimeRemaining(null);
      setWarningLevel('none');
      return;
    }

    const check = () => {
      const elapsed = Date.now() - new Date(session.openedAt).getTime();
      const remaining = Math.max(0, SESSION_MAX_MS - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) { setWarningLevel('expired'); return; }
      if (remaining <= CRITICAL_THRESHOLD_MS) { setWarningLevel('critical'); return; }
      if (remaining <= WARNING_THRESHOLD_MS) { setWarningLevel('warning'); return; }
      setWarningLevel('none');
    };

    check();
    const interval = setInterval(check, EXPIRY_POLL_MS);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (warningLevel !== 'expired' || !session || session.status !== 'open') return;
    const forceClose = async () => {
      try {
        await fetch(`/api/pos/sessions/${session.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ closingBalance: session.totalSales || 0 }),
        });
      } catch {}
      setSession({ ...session, status: 'closed', closedAt: new Date().toISOString() });
      setCart([]);
      setForceCloseDialogOpen(true);
    };
    forceClose();
  }, [warningLevel, session]);

  const subtotal = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const selectedTax = taxes.find(t => t.id === selectedTaxId);
  const taxRate = selectedTax ? Number(selectedTax.rate) / 100 : 0;
  const tax = subtotal * taxRate;
  const discount = 0;
  const total = subtotal + tax - discount;

  const filteredProducts = products
    .filter(
      (p) =>
        p.isActive &&
        (!category || p.categoryId === category) &&
        (!search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.code.toLowerCase().includes(search.toLowerCase()) ||
          (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase())) ||
          (p.description && p.description.toLowerCase().includes(search.toLowerCase())))
    )
    .sort((a, b) => {
      const aStock = Number(a.stock) > 0;
      const bStock = Number(b.stock) > 0;
      if (aStock !== bStock) return aStock ? -1 : 1;
      return (b.availableLocations?.length ?? 0) - (a.availableLocations?.length ?? 0);
    });

  const getStockStatus = (p: Product) => {
    const stock = Number(p.stock);
    const minStock = Number(p.minStock ?? 0);
    if (stock <= 0) {
      return {
        bg: 'bg-red-50/50 hover:bg-red-50',
        border: 'border-red-200 hover:border-red-400',
        text: 'text-red-800',
        stockText: 'text-red-600 font-bold',
        badge: 'bg-red-100 text-red-800 border-red-200',
        label: 'Not Available'
      };
    }
    if (stock <= minStock) {
      return {
        bg: 'bg-amber-50/50 hover:bg-amber-50',
        border: 'border-amber-200 hover:border-amber-400',
        text: 'text-amber-800',
        stockText: 'text-amber-600 font-bold',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        label: `Stock: ${stock}`
      };
    }
    return {
      bg: 'bg-emerald-50/20 hover:bg-emerald-50/45',
      border: 'border-emerald-200 hover:border-emerald-400',
      text: 'text-emerald-800',
      stockText: 'text-emerald-600 font-medium',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      label: `Stock: ${stock}`
    };
  };

  const totalPaid = payments.reduce((s, p) => {
    const amt = parseFloat(p.amount) || 0;
    const cur = currencies.find(c => c.code === p.currency) || { rate: 1 };
    return s + (amt / cur.rate);
  }, 0);
  const changeDue = Math.max(0, totalPaid - total);
  const remaining = Math.max(0, total - totalPaid);

  const handlePayment = async () => {
    if (cart.length === 0 || !session) return;
    const validPayments = payments.filter(p => parseFloat(p.amount) > 0);
    if (validPayments.length === 0) { toast('Enter at least one payment', 'error'); return; }
    if (totalPaid < total) { toast('Total payment must cover the full amount', 'error'); return; }

    // Frontend validations for loyalty card/points payments
    if (selectedCustomer) {
      const loyaltyPointsPay = validPayments
        .filter(p => p.method === 'loyalty_points')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const loyaltyCardPay = validPayments
        .filter(p => p.method === 'loyalty_card_balance')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      if (loyaltyPointsPay > selectedCustomer.loyaltyPoints) {
        toast(`Insufficient loyalty points. Available: ${selectedCustomer.loyaltyPoints}`, 'error');
        return;
      }
      if (loyaltyCardPay > selectedCustomer.cardBalance) {
        toast(`Insufficient loyalty card balance. Available: $${Number(selectedCustomer.cardBalance).toFixed(2)}`, 'error');
        return;
      }
    } else {
      // If no customer selected, make sure they aren't trying to pay with loyalty
      const hasLoyaltyPay = validPayments.some(p => p.method === 'loyalty_points' || p.method === 'loyalty_card_balance');
      if (hasLoyaltyPay) {
        toast('Please select a customer to pay using loyalty points or card balance', 'error');
        return;
      }
    }

    if (transferChangeToWallet && !selectedCustomer && !walkinWalletNumber) {
      toast('Please enter a mobile wallet number for the transfer', 'error');
      return;
    }

    setProcessingPayment(true);
    try {
      const payload = {
        sessionId: session.id,
        customerId: selectedCustomer?.id || undefined,
        customerName: selectedCustomer?.name || walkinCustomerName || undefined,
        transferChangeToCard,
        transferChangeToWallet,
        walkinWalletNumber,
        lines: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.sellingPrice,
        })),
        subtotal,
        taxAmount: tax,
        discount,
        linkedMobileOrderId,
        payments: validPayments.map(p => ({
          method: p.method,
          amount: parseFloat(p.amount),
          reference: p.reference || undefined,
          currency: p.currency,
          exchangeRate: currencies.find(c => c.code === p.currency)?.rate || 1,
        })),
      };

      const paynowPayment = validPayments.find(p => p.method.startsWith('paynow_'));
      if (paynowPayment) {
        if (!paynowPayment.reference) {
          toast('Please enter customer phone number for Paynow', 'error');
          setProcessingPayment(false);
          return;
        }
        
        const method = paynowPayment.method.split('_')[1]; // 'ecocash' or 'onemoney'
        const initRes = await fetch('/api/pos/paynow/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(paynowPayment.amount),
            phone: paynowPayment.reference,
            method: method,
          })
        });
        const initData = await initRes.json();
        
        if (!initData.success) {
          toast(initData.error || 'Failed to initiate Paynow transaction', 'error');
          setProcessingPayment(false);
          return;
        }

        setPaynowDialog({
          open: true,
          pollUrl: initData.pollUrl,
          instructions: initData.instructions,
          invoiceNumber: initData.invoiceNumber,
          payload,
          status: 'Initiated'
        });
        setProcessingPayment(false);
        return; 
      }

      await finalizeTransaction(payload);
    } catch (e) {
      toast('Network error. Please try again.', 'error');
      setProcessingPayment(false);
    }
  };

  // Print logic moved to pos-print.ts

  const finalizeTransaction = async (payload: any) => {
      if (!isOnline) {
        const offlineId = crypto.randomUUID();
        await saveOfflineTransaction({
          id: offlineId,
          type: 'pos_payment',
          payload,
          timestamp: Date.now(),
          status: 'pending'
        });
        
        toast('Offline payment saved locally', 'success');
        const simulatedData = {
          id: `offline-${offlineId.substring(0,8)}`,
          transactionNumber: `OFF-${Date.now()}`,
          total,
          status: 'OFFLINE_PENDING',
          ...payload
        };
        setLastTransaction(simulatedData as any);
        setReceiptCustomer(selectedCustomer || (walkinCustomerName ? { name: walkinCustomerName } as any : null));
        setPaymentDialogOpen(false);
        setReceiptDialogOpen(true);
        setCart([]);
        setPayments([{ method: 'cash', amount: '', reference: '' }]);
        setSelectedCustomer(null);
        setWalkinCustomerName('');
        setTransferChangeToCard(false);
        setTransferChangeToWallet(false);
        setWalkinWalletNumber('');
        setLinkedMobileOrderId(null);
        setProcessingPayment(false);
        return;
      }

      const tid = toast('Processing payment...', 'info', 120000);
      let res;
      try {
        res = await fetch('/api/pos/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (e) { dismissToast(tid); throw e; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        dismissToast(tid);
        toast(err.error || 'Payment failed', 'error');
        return;
      }
      const data = await res.json();
      dismissToast(tid);
      toast('Payment successful', 'success');
      setLastTransaction(data.data || data);
      setReceiptCustomer(selectedCustomer || (walkinCustomerName ? { name: walkinCustomerName } as any : null));
      setPaymentDialogOpen(false);
      setReceiptDialogOpen(true);
      setCart([]);
      setPayments([{ method: 'cash', amount: '', reference: '', currency: 'USD' }]);
      setSelectedCustomer(null);
      setWalkinCustomerName('');
      setTransferChangeToCard(false);
      setTransferChangeToWallet(false);
      setWalkinWalletNumber('');
      setLinkedMobileOrderId(null);
      setProcessingPayment(false);
      
      // Refetch products to update inventory display
      fetchProducts();
  };

  const sessionOpen = session?.status === 'open';

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-mine-blue-800" />
            POS Terminal
          </h2>
          {session && (
            <p className="text-sm text-slate-500 mt-1">
              Session opened: {new Date(session.openedAt).toLocaleString()}
            </p>
          )}
          {timeRemaining !== null && sessionOpen && warningLevel !== 'none' && (
            <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              warningLevel === 'critical' || warningLevel === 'expired'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {warningLevel === 'critical' || warningLevel === 'expired' ? (
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
              ) : (
                <Clock className="h-4 w-4 flex-shrink-0" />
              )}
              {warningLevel === 'expired' ? (
                <span className="font-medium">Session has expired and will be auto-closed.</span>
              ) : warningLevel === 'critical' ? (
                <span>
                  CRITICAL: Session expires in{' '}
                  <span className="font-mono font-bold">{formatTimeRemaining(timeRemaining)}</span>
                  {' — '}Please close it immediately.
                </span>
              ) : (
                <span>
                  Session expires in{' '}
                  <span className="font-mono font-bold">{formatTimeRemaining(timeRemaining)}</span>
                  {' — '}Please close and open a new session.
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.open('/mobile-pos/index.html', '_blank')}>
            <Smartphone className="h-4 w-4 mr-2" />
            Mobile POS
          </Button>
          <Button variant="outline" onClick={() => { fetchMobileOrders(); setMobileOrdersDialogOpen(true); }}>
            <List className="h-4 w-4 mr-2" />
            Mobile Orders
          </Button>
          {sessionOpen ? (
              <Button variant="destructive" onClick={() => setCloseSessionDialogOpen(true)}>
                <LogOut className="h-4 w-4 mr-2" />
                Close Session
              </Button>
          ) : (
            <Button onClick={openSession} variant="secondary">
              <LogIn className="h-4 w-4 mr-2" />
              Open Session
            </Button>
          )}
        </div>
      </div>

      {!sessionOpen && !loading && (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Open Session</h3>
            <p className="text-slate-500 mb-6">Open a session to start processing transactions</p>
            <Button size="lg" variant="secondary" onClick={openSession}>
              <LogIn className="h-5 w-5 mr-2" />
              Open New Session
            </Button>
          </CardContent>
        </Card>
      )}

      {sessionOpen && (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left panel: Products */}
          <div className="flex-1 flex flex-col min-h-0">
            <Card className="flex-shrink-0 mb-4">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products by name, code, description, or scan barcode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="pl-12 pr-4 py-3 h-12 text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-full shadow-sm"
                  />
                </div>
                <div className="w-48 flex-shrink-0">
                  <Select
                    options={categories}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-12 text-base rounded-xl shadow-sm"
                  />
                </div>

                {/* View toggle */}
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner flex-shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white text-mine-blue-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-mine-blue-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Detailed List View by Category"
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </CardContent>
            </Card>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-mine-blue-800 border-t-transparent rounded-full" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  No products found
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product);
                    return (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        disabled={Number(product.stock) <= 0}
                        className={`text-left p-3 rounded-lg border ${status.border} ${status.bg} transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <p className="font-semibold text-sm text-slate-900 truncate flex-1">{product.name}</p>
                          {Number(product.stock) <= 0 ? (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${status.badge}`}>OUT</span>
                          ) : Number(product.stock) <= Number(product.minStock ?? 0) ? (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${status.badge}`}>LOW</span>
                          ) : (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${status.badge}`}>OK</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{product.code}</p>
                        <p className="text-sm font-bold text-mine-blue-800 mt-2">
                          ${Number(product.sellingPrice).toLocaleString()}
                          <span className="font-normal text-xs text-slate-400 ml-1">/{product.unit}</span>
                        </p>
                        <p className={`text-xs mt-1 ${status.stockText}`}>
                          {status.label}
                        </p>
                        {product.availableLocations && product.availableLocations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {product.availableLocations.slice(0, 3).map((loc) => (
                              <span key={loc} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">{loc}</span>
                            ))}
                            {product.availableLocations.length > 3 && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">+{product.availableLocations.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Detailed List View sorted by Category */
                <div className="space-y-6">
                  {(() => {
                    // Group products
                    const grouped: Record<string, typeof filteredProducts> = {};
                    filteredProducts.forEach((p) => {
                      const catName = p.category && typeof p.category === 'object'
                        ? (p.category as any).name
                        : (p.category || 'Uncategorized');
                      if (!grouped[catName]) {
                        grouped[catName] = [];
                      }
                      grouped[catName].push(p);
                    });

                    return Object.keys(grouped).sort().map((catName) => (
                      <div key={catName} className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-1.5 border-slate-200">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                            Category: {catName}
                          </h4>
                          <Badge variant="secondary" className="text-[10px]">
                            {grouped[catName].length} {grouped[catName].length === 1 ? 'item' : 'items'}
                          </Badge>
                        </div>
                        <div className="divide-y divide-slate-100 border border-slate-200/60 rounded-xl overflow-hidden bg-white shadow-sm">
                          {grouped[catName].map((product) => {
                            const status = getStockStatus(product);
                            return (
                              <div
                                key={product.id}
                                className="p-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-slate-900 truncate">
                                      {product.name}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">
                                      ({product.code})
                                    </span>
                                  </div>
                                  {(product as any).description && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                      {(product as any).description}
                                    </p>
                                  )}
                                  {product.availableLocations && product.availableLocations.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {product.availableLocations.slice(0, 4).map((loc) => (
                                        <span key={loc} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">{loc}</span>
                                      ))}
                                      {product.availableLocations.length > 4 && (
                                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">+{product.availableLocations.length - 4}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0">
                                  <div className="text-right">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded border inline-block ${status.badge}`}>
                                      {status.label}
                                    </span>
                                  </div>
                                  <div className="font-bold text-sm text-mine-blue-900 font-mono w-24 text-right">
                                    ${Number(product.sellingPrice).toLocaleString()}
                                    <span className="font-normal text-xs text-slate-400 ml-0.5">/{product.unit}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    disabled={Number(product.stock) <= 0}
                                    onClick={() => addToCart(product)}
                                    className="h-8 text-xs font-semibold px-3 bg-mine-blue-800 hover:bg-mine-blue-900 text-white"
                                  >
                                    Add
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Cart */}
          <div className="w-96 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardContent className="p-4 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-mine-blue-800" />
                    Cart ({cart.length})
                  </h3>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>

                {/* Customer / Loyalty Selection */}
                <div className="mb-3 pb-3 border-b border-slate-100 flex-shrink-0 space-y-2 relative">
                  {!selectedCustomer ? (
                    <div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Scan Card Barcode or search Customer..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 h-8 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-mine-blue-500 w-full bg-slate-50"
                        />
                      </div>
                      {customerSearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg z-50 text-xs">
                          {customerSearchResults.map((cust) => (
                            <button
                              key={cust.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setCustomerSearch('');
                                setCustomerSearchResults([]);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-100 border-b border-slate-50 last:border-0"
                            >
                              <p className="font-semibold text-slate-800">{cust.name}</p>
                              <p className="text-[10px] text-slate-500">
                                Card: {cust.loyaltyCardBarcode || 'None'} | Pts: {cust.loyaltyPoints} | Bal: ${Number(cust.cardBalance).toLocaleString()}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-md p-2 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-emerald-800">{selectedCustomer.name}</p>
                        <p className="text-[10px] text-emerald-600 font-medium">
                          Pts: {selectedCustomer.loyaltyPoints} | Balance: ${Number(selectedCustomer.cardBalance).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setTransferChangeToCard(false);
                          setTransferChangeToWallet(false);
                          setWalkinWalletNumber('');
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Cart is empty</p>
                      <p className="text-xs">Select products to add</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{item.product.name}</p>
                          <p className="text-xs text-slate-400">
                            ${Number(item.product.sellingPrice || 0).toLocaleString()} / {item.product.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-mono font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-right w-20">
                          <p className="text-sm font-mono font-semibold">
                            ${(Number(item.product.sellingPrice || 0) * item.quantity).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 rounded hover:bg-red-100 text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Totals */}
                <div className="border-t border-slate-200 pt-3 mt-3 space-y-1.5 flex-shrink-0">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono">${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>Tax</span>
                      <select 
                        className="border border-slate-200 rounded p-1 text-xs outline-none bg-transparent"
                        value={selectedTaxId}
                        onChange={(e) => setSelectedTaxId(e.target.value)}
                      >
                        <option value="">No Tax (0%)</option>
                        {taxes.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>
                        ))}
                      </select>
                    </div>
                    <span className="font-mono">${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span className="font-mono">-${discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                    <span>Total</span>
                    <span className="font-mono">${total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Pay button */}
                <Button
                  size="lg"
                  className="w-full mt-3 flex-shrink-0"
                  disabled={cart.length === 0}
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Charge ${total.toLocaleString()}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => { setPaymentDialogOpen(false); setPayments([{ method: 'cash', amount: '', reference: '', currency: 'USD' }]); }}
        title="Complete Payment"
        description={`Total amount: $${total.toLocaleString()}`}
        size="3xl"
        className="max-w-5xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Cart Summary & Total Due */}
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-slate-900 font-mono">${total.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Total Due</p>
              {remaining > 0 && (
                <p className="text-sm font-medium text-amber-600 mt-1">Remaining: ${remaining.toFixed(2)}</p>
              )}
            </div>

            {/* Cart Items Summary & Edit Controls */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white max-h-[300px] overflow-y-auto shadow-inner">
              <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-1">Cart Items Summary</p>
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{item.product.name}</p>
                    <p className="text-[10px] text-slate-400">
                      ${Number(item.product.sellingPrice || 0).toLocaleString()} / {item.product.unit}
                    </p>
                  </div>
                  {/* Quantity edit controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-0.5 rounded hover:bg-slate-200 text-slate-500"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center font-mono font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-0.5 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Line total and Delete button */}
                  <div className="text-right w-16">
                    <span className="font-mono font-semibold">${(Number(item.product.sellingPrice || 0) * item.quantity).toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-0.5 rounded hover:bg-red-100 text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="text-center text-slate-400 text-xs py-4">No items in cart</p>
              )}
            </div>

            {/* Customer Name (Optional) */}
            <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-1.5">
              <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Customer Name (Optional)</p>
              {selectedCustomer ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{selectedCustomer.name}</span>
                  <span className="text-[10px] text-mine-blue-600 bg-mine-blue-50 px-1.5 py-0.5 rounded">Linked</span>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Walk-in Customer"
                  value={walkinCustomerName}
                  onChange={(e) => setWalkinCustomerName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              )}
            </div>
          </div>

          {/* Right Column: Payment Splits & Totals */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Payment Split</label>
                <button
                  onClick={() => setPayments([...payments, { method: 'cash', amount: '', reference: '', currency: 'USD' }])}
                  className="text-xs text-mine-blue-800 hover:text-mine-blue-600 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Payment
                </button>
              </div>

              <div className="max-h-[260px] overflow-y-auto space-y-3 pr-1 shadow-inner p-1.5 bg-slate-50/50 rounded-lg">
                {payments.map((p, i) => {
                  const PmIcon = paymentMethods.find(m => m.value === p.method)?.icon || Banknote;
                  return (
                    <div key={i} className="p-3 rounded-lg border border-slate-200 bg-white shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                          <PmIcon className="h-3.5 w-3.5 text-mine-blue-600" />
                          <span>Split Payment #{i + 1}</span>
                        </div>
                        {payments.length > 1 && (
                          <button
                            onClick={() => setPayments(payments.filter((_, j) => j !== i))}
                            className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors"
                            title="Remove Payment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Method Select */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Method</label>
                          <select
                            value={p.method}
                            onChange={(e) => {
                              const newP = [...payments];
                              newP[i] = { ...newP[i], method: e.target.value };
                              setPayments(newP);
                            }}
                            className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
                          >
                            {paymentMethods
                              .filter(m => {
                                if (m.value === 'loyalty_points' || m.value === 'loyalty_card_balance') {
                                  return !!selectedCustomer;
                                }
                                return true;
                              })
                              .map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                          </select>
                        </div>

                        {/* Amount & Currency in one row */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount</label>
                          <div className="flex rounded-md border border-slate-200 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-mine-blue-500">
                            <input
                              type="number"
                              step="0.01;any"
                              min="0"
                              placeholder="0.00"
                              value={p.amount}
                              onChange={(e) => {
                                const newP = [...payments];
                                newP[i] = { ...newP[i], amount: e.target.value };
                                setPayments(newP);
                              }}
                              className="w-full text-xs bg-white px-2 py-1.5 focus:outline-none font-mono text-slate-800"
                            />
                            <select
                              value={p.currency}
                              disabled={p.method === 'loyalty_points' || p.method === 'loyalty_card_balance'}
                              onChange={(e) => {
                                const newP = [...payments];
                                newP[i] = { ...newP[i], currency: e.target.value };
                                setPayments(newP);
                              }}
                              className="text-xs bg-slate-100 border-l border-slate-200 px-1.5 focus:outline-none font-bold text-slate-600 disabled:opacity-50"
                            >
                              {currencies.map(c => (
                                <option key={c.code} value={c.code}>{c.code}</option>
                              ))}
                            </select>
                          </div>
                          {p.currency !== 'USD' && p.amount && (
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              ≈ ${(parseFloat(p.amount) / (currencies.find(c => c.code === p.currency)?.rate || 1)).toFixed(2)} USD
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reference Row (Conditional) */}
                      {(p.method === 'bank_transfer' || p.method === 'mobile_wallet' || p.method.startsWith('paynow_')) && (
                        <div className="space-y-1 pt-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reference / Txn ID</label>
                          <input
                            type="text"
                            placeholder="Enter transaction or wallet transfer ID"
                            value={p.reference}
                            onChange={(e) => {
                              const newP = [...payments];
                              newP[i] = { ...newP[i], reference: e.target.value };
                              setPayments(newP);
                            }}
                            className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex justify-between text-sm font-medium">
                <span>Total Paid</span>
                <span className={`font-mono ${totalPaid >= total ? 'text-green-600' : 'text-amber-600'}`}>
                  ${totalPaid.toFixed(2)}
                </span>
              </div>
              {changeDue > 0 && (
                <div className="space-y-3 bg-green-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm font-medium text-green-600">
                    <span>Change Due (Cash)</span>
                    <span className="font-mono font-bold">{(transferChangeToCard || transferChangeToWallet) ? '$0.00' : `$${changeDue.toFixed(2)}`}</span>
                  </div>
                  <div className="flex flex-col gap-2 pt-2 border-t border-green-200/50">
                    {selectedCustomer && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="transferChangeToCard"
                          checked={transferChangeToCard}
                          onChange={(e) => {
                            setTransferChangeToCard(e.target.checked);
                            if (e.target.checked) setTransferChangeToWallet(false);
                          }}
                          className="h-4 w-4 rounded text-mine-blue-600 border-slate-300 focus:ring-mine-blue-500"
                        />
                        <label htmlFor="transferChangeToCard" className="text-xs font-semibold text-green-700 cursor-pointer select-none">
                          Transfer change (${changeDue.toFixed(2)}) to Loyalty Card balance
                        </label>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="transferChangeToWallet"
                          checked={transferChangeToWallet}
                          onChange={(e) => {
                            setTransferChangeToWallet(e.target.checked);
                            if (e.target.checked) setTransferChangeToCard(false);
                          }}
                          className="h-4 w-4 rounded text-mine-blue-600 border-slate-300 focus:ring-mine-blue-500"
                        />
                        <label htmlFor="transferChangeToWallet" className="text-xs font-semibold text-green-700 cursor-pointer select-none">
                          Transfer change (${changeDue.toFixed(2)}) to Mobile Wallet balance
                        </label>
                      </div>
                      {transferChangeToWallet && !selectedCustomer && (
                        <div className="ml-6">
                          <input
                            type="text"
                            placeholder="Enter Mobile Wallet Number"
                            value={walkinWalletNumber}
                            onChange={(e) => setWalkinWalletNumber(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setPaymentDialogOpen(false); setPayments([{ method: 'cash', amount: '', reference: '', currency: 'USD' }]); }}>
            Cancel
          </Button>
          <Button onClick={handlePayment} loading={processingPayment} disabled={totalPaid < total || cart.length === 0}>
            Complete Payment
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Paynow Polling Dialog */}
      <Dialog
        open={paynowDialog.open}
        onClose={() => setPaynowDialog(prev => ({ ...prev, open: false }))}
        title="Waiting for Mobile Payment"
        size="sm"
      >
        <div className="space-y-6 text-center py-4">
          <div className="flex justify-center">
            <Smartphone className="h-16 w-16 text-mine-blue-600 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-slate-800">Check Customer Phone</h4>
            <p className="text-sm text-slate-600">
              {paynowDialog.instructions || "Please ask the customer to check their phone and enter their PIN to authorize the transaction."}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Status</p>
            <p className="text-mine-blue-700 font-medium">
              {paynowDialog.status === 'Initiated' ? 'Waiting for customer...' : paynowDialog.status}
            </p>
          </div>

          <p className="text-xs text-slate-400">
            This dialog will close automatically once the payment is confirmed.
          </p>
        </div>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        title="Payment Receipt"
        size="md"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-slate-800 text-xs font-sans">
          {/* Header/Company details */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-200">
            <h4 className="text-base font-bold tracking-tight text-slate-900">
              Mineazy Mining Solutions
            </h4>
            {lastTransaction?.branch?.name && (
              <p className="text-sm font-semibold text-slate-700">
                {lastTransaction.branch.name}
              </p>
            )}
            <p className="text-slate-500 text-[10px]">
              {lastTransaction?.branch?.address || '15 Plumtree Road, Belmont'}
              {lastTransaction?.branch?.city ? `, ${lastTransaction.branch.city}` : ', BULAWAYO'}
            </p>
            <p className="text-slate-500 text-[10px]">
              TIN: 2001282270 | VAT No: 220107408
            </p>
            <p className="text-slate-500 text-[10px]">
              Tel: {lastTransaction?.branch?.phone || '+263712290046'}
            </p>
            <p className="text-slate-500 text-[10px]">
              Email: {lastTransaction?.branch?.email || 'sales@mineazy.co.zw, accounts@mineazy.co.zw'}
            </p>
            <p className="text-slate-500 font-mono text-[10px] pt-1">
              Receipt: {lastTransaction?.transactionNumber}
            </p>
            <p className="text-slate-500 text-[10px]">
              Date: {lastTransaction?.createdAt ? new Date(lastTransaction.createdAt).toLocaleString() : new Date().toLocaleString()}
            </p>
          </div>

          {/* Customer Details */}
          {receiptCustomer && (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-1">
              <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Customer Details</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <span className="text-slate-500">Name:</span>
                <span className="font-semibold text-right">{receiptCustomer.name}</span>
                <span className="text-slate-500">Loyalty Card:</span>
                <span className="font-mono text-right">{receiptCustomer.loyaltyCardBarcode || 'N/A'}</span>
                <span className="text-slate-500">Points Balance:</span>
                <span className="font-semibold text-right text-mine-blue-700">{Math.floor((Number(receiptCustomer.totalSpent || 0) + (lastTransaction?.total ?? 0)) / 1000)} pts</span>
                <span className="text-slate-500">Card Balance:</span>
                <span className="font-semibold text-right text-emerald-700">${Number(receiptCustomer.cardBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {/* Product Items */}
          <div className="space-y-1.5 py-2 border-b border-dashed border-slate-200">
            <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Items Purchased</p>
            <div className="space-y-2">
              {lastTransaction?.lines?.map((line, i) => (
                <div key={i} className="flex justify-between items-start">
                  <div className="max-w-[70%]">
                    <p className="font-medium text-slate-900">{line.productName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {Number(line.quantity).toFixed(0)} x ${Number(line.unitPrice).toFixed(2)}
                    </p>
                  </div>
                  <span className="font-mono font-semibold">${Number(line.total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Tax */}
          <div className="space-y-1.5 py-1">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-mono">${Number(lastTransaction?.subtotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>VAT (15.5%)</span>
              <span className="font-mono">${Number(lastTransaction?.taxAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {Number(lastTransaction?.discount ?? 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="font-mono">-${Number(lastTransaction?.discount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-950 pt-1.5 border-t border-slate-200">
              <span>Total</span>
              <span className="font-mono">${Number(lastTransaction?.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 space-y-1">
            <p className="font-bold text-[10px] text-emerald-800 uppercase tracking-wider">Payment Breakdown</p>
            <div className="space-y-1">
              {(lastTransaction?.payments ?? []).length > 0 ? (
                lastTransaction!.payments!.map((pm, i) => {
                  const pmLabel = paymentMethods.find(m => m.value === pm.method)?.label || pm.method;
                  return (
                    <div key={i} className="flex justify-between text-slate-700">
                      <span>
                        {pmLabel} 
                        {pm.currency && pm.currency !== 'USD' && ` (Paid in ${pm.currency} @ rate ${Number(pm.exchangeRate || 1)})`}
                      </span>
                      <span className="font-mono font-medium">
                        {pm.currency && pm.currency !== 'USD' 
                          ? `${Number(Number(pm.amount) * Number(pm.exchangeRate || 1)).toFixed(2)} ${pm.currency} ($${Number(pm.amount).toFixed(2)} USD)`
                          : `$${Number(pm.amount).toFixed(2)} USD`
                        }
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex justify-between text-slate-700">
                  <span className="capitalize">{lastTransaction?.paymentMethod?.replace(/_/g, ' ')}</span>
                  <span className="font-mono font-medium">${Number(lastTransaction?.paidAmount ?? 0).toFixed(2)}</span>
                </div>
              )}
              {(() => {
                const txTotal = Number(lastTransaction?.total ?? 0);
                const paid = Number(lastTransaction?.paidAmount ?? 0);
                const returnedCash = Number(lastTransaction?.changeAmount ?? 0);
                const actualChange = Math.max(0, paid - txTotal);
                const transferredChange = actualChange - returnedCash;

                return (
                  <>
                    {returnedCash > 0 && (
                      <div className="flex justify-between text-amber-700 pt-1 border-t border-emerald-200/50">
                        <span>Change Given (Cash)</span>
                        <span className="font-mono">-${returnedCash.toFixed(2)}</span>
                      </div>
                    )}
                    {transferredChange > 0 && (
                      <div className="flex justify-between text-blue-700 pt-1 border-t border-emerald-200/50">
                        <span>Change Transferred (Wallet/Card)</span>
                        <span className="font-mono">-${transferredChange.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Footer message */}
          <div className="text-center pt-3 border-t border-dashed border-slate-200 text-slate-400 text-[10px] space-y-0.5">
            <p>Thank you for shopping with Mineazy!</p>
            <p>Please keep this receipt for returns/warranty.</p>
          </div>
        </div>
        <DialogFooter className="flex space-x-2">
          <Button variant="outline" onClick={() => { generateA4Invoice(lastTransaction, receiptCustomer, triggerExport); setReceiptDialogOpen(false); }} className="flex-1 border-mine-blue-600 text-mine-blue-700 hover:bg-mine-blue-50">
            <Download className="w-4 h-4 mr-2" />
            Export A4 Invoice
          </Button>
          <Button onClick={() => { printPOSReceipt(lastTransaction); setReceiptDialogOpen(false); }} className="flex-1 bg-mine-blue-600 hover:bg-mine-blue-700">
            <Printer className="w-4 h-4 mr-2" />
            Print to POS Printer
          </Button>
          <Button variant="ghost" onClick={() => setReceiptDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={forceCloseDialogOpen}
        onClose={() => setForceCloseDialogOpen(false)}
        title="Session Force-Closed"
        description="The 24-hour session limit was reached."
        size="sm"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600 mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600">
              Your POS session was automatically closed because it reached the 24-hour maximum duration.
            </p>
            <p className="text-sm text-slate-600 mt-2">
              Please open a new session to continue processing transactions.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setForceCloseDialogOpen(false)}>
            <LogIn className="h-4 w-4 mr-2" />
            Open New Session
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Mobile Orders Dialog */}
      <Dialog
        open={mobileOrdersDialogOpen}
        onClose={() => setMobileOrdersDialogOpen(false)}
        title="Mobile POS Orders"
        description="Select a pending mobile order to load into the cart"
        size="lg"
      >
        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
          {mobileOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Smartphone className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p>No pending mobile orders found.</p>
            </div>
          ) : (
            mobileOrders.map((order) => (
              <div key={order.id} className="p-4 border rounded-lg shadow-sm bg-white hover:border-mine-blue-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-mono bg-mine-blue-50 text-mine-blue-700 px-2 py-1 rounded">
                      {order.orderNumber}
                    </span>
                    <h3 className="font-semibold text-slate-800 mt-1">{order.customerName}</h3>
                    <p className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${Number(order.total).toFixed(2)}</p>
                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Pending Sync</Badge>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 my-3 pt-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Items ({order.lines.length})</p>
                  <div className="space-y-1">
                    {order.lines.slice(0, 3).map((line: any) => (
                      <div key={line.id} className="flex justify-between text-sm">
                        <span className="text-slate-700">{Number(line.quantity)}x {line.productName}</span>
                        <span className="text-slate-600">${(Number(line.quantity) * Number(line.unitPrice)).toFixed(2)}</span>
                      </div>
                    ))}
                    {order.lines.length > 3 && (
                      <p className="text-xs text-slate-400 italic">...and {order.lines.length - 3} more items</p>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button 
                    onClick={() => loadMobileOrder(order)}
                    className="w-full sm:w-auto"
                  >
                    Load into Cart
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setMobileOrdersDialogOpen(false)}>Close</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={closeSessionDialogOpen} onClose={() => setCloseSessionDialogOpen(false)} title="Close Session">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Enter the total cash counted in the drawer to close the session and generate the day-end report.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total Cash Counted ($)</label>
            <Input 
              type="number" 
              placeholder="0.00" 
              value={actualCashInput}
              onChange={(e) => setActualCashInput(e.target.value)}
              step="0.01"
              min="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCloseSessionDialogOpen(false)}>Cancel</Button>
          <Button onClick={closeSession} disabled={!actualCashInput}>Confirm & Close</Button>
        </DialogFooter>
      </Dialog>
      {ExportDialog}
    </div>
  );
}
