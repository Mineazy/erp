import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, ShieldCheck, FileText, Package, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default async function GoodsReceiptVerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const receipt = await prisma.erpGoodsReceipt.findUnique({
    where: { id },
    include: { lines: true }
  });

  if (!receipt) {
    notFound();
  }

  const isVerified = receipt.status === 'Approved';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm mb-4">
            <ShieldCheck className="h-8 w-8 text-mine-blue-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Receipt Verification</h1>
          <p className="text-slate-500">Official ERP Verification Record</p>
        </div>

        <Card className="border-t-4 border-t-mine-blue-500 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Goods Receipt</CardTitle>
            <CardDescription className="font-mono text-sm">{receipt.receiptNo}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            
            <div className={`p-4 rounded-lg flex items-center gap-3 ${isVerified ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
              <CheckCircle className={`h-6 w-6 ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div>
                <p className="font-semibold">{isVerified ? 'Verified & Approved' : 'Pending Approval'}</p>
                <p className="text-xs opacity-90">
                  {isVerified ? `Approved on ${receipt.approvedAt?.toLocaleString() || receipt.updatedAt.toLocaleString()}` : 'This receipt has not been finalized.'}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-500 font-medium">Insight PO / Delivery Note</p>
                  <p className="font-semibold text-slate-900">
                    {receipt.insightPoNumber || 'N/A'} <span className="text-slate-400 font-normal mx-1">&bull;</span> {receipt.deliveryNoteNumber || 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-500 font-medium">Supplier</p>
                  <p className="font-semibold text-slate-900">{receipt.supplierName}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-500 font-medium">Reviewing Supervisor</p>
                  <p className="font-semibold text-slate-900">{receipt.reviewedBy || 'Pending'}</p>
                </div>
              </div>
            </div>

            <Separator />
            
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" /> Received Items
              </h3>
              <div className="space-y-3">
                {receipt.lines.map((line) => (
                  <div key={line.id} className="bg-slate-50 p-3 rounded-md border text-sm">
                    <p className="font-medium text-slate-900 mb-1">{line.productName}</p>
                    <div className="flex justify-between text-slate-600">
                      <span>Ordered: {Number(line.orderedQty)}</span>
                      <span className="font-medium text-emerald-600">Accepted: {Number(line.acceptedQty)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-slate-400">
          Scanned via Mineazy ERP<br/>
          {new Date().getFullYear()} &copy; All rights reserved.
        </p>
      </div>
    </div>
  );
}
