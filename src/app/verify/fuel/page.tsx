'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, ShieldAlert, Loader2, ArrowLeft, Fuel } from 'lucide-react';
import Link from 'next/link';

interface Voucher {
  id: string;
  plateNumber: string;
  vehicleDetails: string;
  fuelType: string;
  liters: number;
  gasStation: string;
  treasurerApprovedBy: string | null;
  financeManagerApprovedBy: string | null;
  token: string | null;
  createdAt: string;
}

function VerifyFuelContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) {
      setErrorMsg('No requisition ID provided for validation');
      setLoading(false);
      return;
    }

    const checkVerification = async () => {
      try {
        const qs = new URLSearchParams();
        if (id) qs.set('id', id);
        if (token) qs.set('token', token);
        const res = await fetch(`/api/verify/fuel?${qs.toString()}`);
        const data = await res.json();
        if (res.ok && data.verified) {
          setVerified(true);
          setVoucher(data.voucher);
        } else {
          setVerified(false);
          setErrorMsg(data.error || 'This voucher is pending approval or has been rejected.');
        }
      } catch (_) {
        setErrorMsg('Network error checking voucher authenticity');
      } finally {
        setLoading(false);
      }
    };

    checkVerification();
  }, [id]);

  // Barcode SVG helper (Code 39) for display
  const getBarcodeSvg = (value: string) => {
    const charPatterns: Record<string, string> = {
      '0': '101000111011101', '1': '111010001010111', '2': '101110001010111',
      '3': '111011100010101', '4': '101000111010111', '5': '111010001110101',
      '6': '101110001110101', '7': '101000101110111', '8': '111010001011101',
      '9': '101110001011101'
    };
    const startStop = '100010111011101';
    let binaryString = startStop;
    for (const char of value) {
      binaryString += '0' + (charPatterns[char] || charPatterns['0']);
    }
    binaryString += '0' + startStop;

    const moduleW = 1.5;
    return (
      <svg width={binaryString.length * moduleW} height="54" className="mx-auto">
        <g fill="#000">
          {binaryString.split('').map((bit, index) => {
            if (bit === '1') {
              return (
                <rect
                  key={index}
                  x={index * moduleW}
                  y="0"
                  width={moduleW}
                  height="54"
                />
              );
            }
            return null;
          })}
        </g>
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full mx-auto space-y-8">
        {/* Portal Header */}
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2 text-indigo-600">
            <Fuel className="h-8 w-8" />
            <span className="font-extrabold text-2xl tracking-wider">MINEAZY</span>
          </div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Security Verification Gateway</h2>
        </div>

        {/* Verification Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6 relative overflow-hidden">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Validating Cryptographic Signatures...</p>
            </div>
          ) : verified && voucher ? (
            <>
              {/* Authenticity Watermark Banner */}
              <div className="absolute top-0 right-0 left-0 h-2 bg-emerald-500" />
              
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-emerald-50 rounded-full text-emerald-600">
                  <ShieldCheck className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">AUTHENTICITY VERIFIED</h3>
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Voucher is Active & Valid</p>
              </div>

              <div className="border-t border-b border-slate-100 py-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plate Number:</span>
                  <span className="font-bold text-slate-800">{voucher.plateNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle:</span>
                  <span className="font-medium text-slate-800">{voucher.vehicleDetails}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fuel Type / Quantity:</span>
                  <span className="font-bold text-slate-800">{voucher.fuelType} - {voucher.liters} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Redeem Station:</span>
                  <span className="font-bold text-indigo-700">{voucher.gasStation}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-dashed border-slate-100 text-xs">
                  <span className="text-slate-400">Treasurer Approved:</span>
                  <span className="font-medium text-emerald-600">{voucher.treasurerApprovedBy}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Finance Manager:</span>
                  <span className="font-medium text-emerald-600">{voucher.financeManagerApprovedBy}</span>
                </div>
              </div>

              {/* Barcoded Voucher Token */}
              {voucher.token && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-2">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Redeemable Barcode Token</p>
                  <div>{getBarcodeSvg(voucher.token)}</div>
                  <p className="text-sm font-bold font-mono text-indigo-700">CODE: {voucher.token}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="absolute top-0 right-0 left-0 h-2 bg-red-500" />
              
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-red-50 rounded-full text-red-600">
                  <ShieldAlert className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">VERIFICATION FAILED</h3>
                <p className="text-xs text-red-500 font-semibold uppercase tracking-wider">Invalid Voucher Record</p>
              </div>

              <div className="bg-red-50 text-red-800 text-xs p-4 rounded-xl border border-red-100 text-center font-medium">
                {errorMsg}
              </div>
            </>
          )}

          {/* Action Footer */}
          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Return to ERP Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        &copy; 2026 Mineazy Logistics Inc. All rights reserved. Secure verification portal.
      </div>
    </div>
  );
}

export default function VerifyFuelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium mt-3">Loading Secure Verification Portal...</p>
      </div>
    }>
      <VerifyFuelContent />
    </Suspense>
  );
}
