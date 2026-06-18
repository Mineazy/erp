'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, X, Printer, RotateCcw, LogOut, LogIn } from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  sellingPrice: number;
  stock: number;
  isActive: boolean;
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
}

interface Transaction {
  id: string;
  transactionNumber: string;
  total: number;
  paymentMethod: string;
  status: string;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'credit', label: 'Credit' },
];

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'Raw Materials', label: 'Raw Materials' },
  { value: 'Equipment', label: 'Equipment' },
  { value: 'Safety Gear', label: 'Safety Gear' },
  { value: 'Consumables', label: 'Consumables' },
];

export default function POSTerminalPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const res = await fetch(`/api/inventory/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.data || []);
    } catch {
      setProducts([]);
    }
  }, [search, category]);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/sessions?status=open');
      const data = await res.json();
      const sessions: Session[] = Array.isArray(data) ? data : data.data || [];
      setSession(sessions.length > 0 ? sessions[0] : null);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (session?.status === 'open') {
      setLoading(true);
      fetchProducts().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session, fetchProducts]);

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
          body: JSON.stringify({ closingBalance: session.totalSales || 0 }),
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

  const subtotal = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const taxRate = 0.1;
  const tax = subtotal * taxRate;
  const discount = 0;
  const total = subtotal + tax - discount;

  const filteredProducts = products.filter(
    (p) =>
      p.isActive &&
      (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
  );

  const handlePayment = async () => {
    if (cart.length === 0 || !session) return;
    setProcessingPayment(true);
    try {
      const res = await fetch('/api/pos/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.product.sellingPrice,
          })),
          subtotal,
          tax,
          discount,
          total,
          paymentMethod,
          amountReceived: parseFloat(amountReceived) || total,
        }),
      });
      const data = await res.json();
      setLastTransaction(data.data || data);
      setPaymentDialogOpen(false);
      setReceiptDialogOpen(true);
      setCart([]);
      setAmountReceived('');
    } catch {
      // ignore
    } finally {
      setProcessingPayment(false);
    }
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
        </div>
        <div className="flex items-center gap-2">
          {sessionOpen ? (
            <Button variant="destructive" onClick={closeSession}>
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
              <CardContent className="p-3 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 w-full"
                  />
                </div>
                <Select
                  options={categories}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-44"
                />
              </CardContent>
            </Card>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {loading ? (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-mine-blue-800 border-t-transparent rounded-full" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-400">
                    No products found
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className="text-left p-3 rounded-lg border border-slate-200 bg-white hover:border-mine-blue-400 hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <p className="font-medium text-sm text-slate-900 truncate">{product.name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{product.code}</p>
                      <p className="text-sm font-bold text-mine-blue-800 mt-2">
                        ${product.sellingPrice.toLocaleString()}
                        <span className="font-normal text-xs text-slate-400 ml-1">/{product.unit}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Stock: {product.stock}
                      </p>
                    </button>
                  ))
                )}
              </div>
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
                            ${item.product.sellingPrice.toLocaleString()} / {item.product.unit}
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
                            ${(item.product.sellingPrice * item.quantity).toLocaleString()}
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
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Tax (10%)</span>
                    <span className="font-mono">${tax.toLocaleString()}</span>
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
        onClose={() => setPaymentDialogOpen(false)}
        title="Complete Payment"
        description={`Total amount: $${total.toLocaleString()}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-slate-900 font-mono">${total.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Total Due</p>
          </div>
          <Select
            label="Payment Method"
            options={paymentMethods}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <Input
            label="Amount Received"
            type="number"
            step="0.01"
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            placeholder={`${total}`}
          />
          {amountReceived && parseFloat(amountReceived) >= total && (
            <div className="flex justify-between text-sm font-medium text-green-600 bg-green-50 rounded-lg p-3">
              <span>Change Due</span>
              <span className="font-mono font-bold">${(parseFloat(amountReceived) - total).toFixed(2)}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePayment} loading={processingPayment} disabled={!amountReceived || isNaN(parseFloat(amountReceived)) || parseFloat(amountReceived) < total}>
            Complete Payment
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        title="Payment Successful"
        description="Transaction completed"
        size="sm"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mx-auto">
            <CreditCard className="h-8 w-8" />
          </div>
          {lastTransaction && (
            <div>
              <p className="text-sm text-slate-500">Transaction #</p>
              <p className="text-lg font-bold font-mono">{lastTransaction.transactionNumber}</p>
            </div>
          )}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-slate-900 font-mono">${(lastTransaction?.total ?? 0).toLocaleString()}</p>
            <p className="text-sm text-slate-500">Paid via {paymentMethods.find((m) => m.value === paymentMethod)?.label}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button variant="secondary" onClick={() => setReceiptDialogOpen(false)}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
