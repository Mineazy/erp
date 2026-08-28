'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { Dialog } from '@/components/ui/dialog';
import { useReportExport } from '@/hooks/use-report-export';

import { ClipboardList, Plus, Check, X, QrCode, Printer, Download, Eye, Fuel, CheckCircle, Clock, Search, Filter, MoreVertical, Building, MapPin, CheckSquare, Settings2, Trash2 } from 'lucide-react';
import { useNetwork } from '@/lib/hooks/use-network';
import { cacheData, getCachedData, saveOfflineTransaction, saveSessionToIdb, loadSessionFromIdb } from '@/lib/db';
import jsPDF from 'jspdf';

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  assignedDriver?: string;
}

interface Requisition {
  id: string;
  vehicleId: string;
  vehicle: Vehicle;
  userId: string;
  userName: string;
  fuelType: string;
  litersRequested: number;
  status: string;
  purpose: string;
  approvedBy: string | null;
  treasurerApprovedBy: string | null;
  treasurerApprovedAt?: string | null;
  financeManagerApprovedBy: string | null;
  financeManagerApprovedAt?: string | null;
  qrCodeUrl: string | null;
  redeemToken: string | null;
  gasStation: string | null;
  driverName?: string | null;
  branch?: string | null;
  destination?: string | null;
  currentOdometer?: number | string | null;
  notes?: string | null;
  redeemedAt?: string | null;
  redeemedBy?: string | null;
  dispensedQuantity?: number | string | null;
  drawdownVoucherNo?: string | null;
  createdAt: string;
}

const CODE39_PATTERNS: Record<string, string> = {
  '0': '101000111011101',
  '1': '111010001010111',
  '2': '101110001010111',
  '3': '111011100010101',
  '4': '101000111010111',
  '5': '111010001110101',
  '6': '101110001110101',
  '7': '101000101110111',
  '8': '111010001011101',
  '9': '101110001011101',
};
const CODE39_START_STOP = '100010111011101';

const code39Binary = (value: string) => {
  let binaryString = CODE39_START_STOP;
  for (const char of value) {
    binaryString += '0' + (CODE39_PATTERNS[char] || CODE39_PATTERNS['0']);
  }
  binaryString += '0' + CODE39_START_STOP;
  return binaryString;
};

function Barcode({ value }: { value: string }) {
  const binaryString = code39Binary(value);
  const moduleW = 1.5;

  return (
    <svg width={binaryString.length * moduleW} height="54" className="mx-auto block">
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
}

const statusLabel = (status: string) =>
  status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const formatApprovalDate = (d?: string | null) => {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '-';
  return `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleString('en-GB', { month: 'short' })} ${date.getFullYear()} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const drawTokenBarcode = (doc: jsPDF, value: string, x: number, y: number, unit: number, height: number) => {
  const binaryString = code39Binary(value);
  doc.setFillColor(0, 0, 0);
  let cx = x;
  for (const bit of binaryString) {
    if (bit === '1') doc.rect(cx, y, unit, height, 'F');
    cx += unit;
  }
};

export default function FleetRequisitionsPage() {
  const { data: sessionData } = useSession();
  const { isOnline } = useNetwork();
  const { triggerExport, ExportDialog } = useReportExport();
  const [activeVoucher, setActiveVoucher] = useState<Requisition | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id?: string; email?: string; role?: string; name?: string } | null>(null);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [gasStation, setGasStation] = useState('Glow Petroleum');
  const [requestedLiters, setRequestedLiters] = useState('');
  const [reqPurpose, setReqPurpose] = useState('');
  const [currentOdometer, setCurrentOdometer] = useState('');
  const [driverName, setDriverName] = useState('');
  const [branch, setBranch] = useState('');
  const [destination, setDestination] = useState('');
  // Custom vehicle fields
  const [customPlate, setCustomPlate] = useState('');
  const [customMake, setCustomMake] = useState('');
  const [customModel, setCustomModel] = useState('');
  // Driver dropdown
  const [driverInputValue, setDriverInputValue] = useState('');
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);

  // Edit dialog state
  const [editingRequisition, setEditingRequisition] = useState<Requisition | null>(null);
  const [editVehicleId, setEditVehicleId] = useState('');
  const [editFuelType, setEditFuelType] = useState('Diesel');
  const [editGasStation, setEditGasStation] = useState('Glow Petroleum');
  const [editRequestedLiters, setEditRequestedLiters] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editOdometer, setEditOdometer] = useState('');
  const [editDriverName, setEditDriverName] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editDestination, setEditDestination] = useState('');

  // View detail modal state
  const [viewingRequisition, setViewingRequisition] = useState<Requisition | null>(null);

  // Reason modal state (for reject/cancel)
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<'reject' | 'cancel'>('reject');
  const [reasonTargetId, setReasonTargetId] = useState('');
  const [reasonText, setReasonText] = useState('');

  // Search, filter, and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterFuelType, setFilterFuelType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async () => {
    try {
      if (!isOnline) {
        const cachedVehicles = await getCachedData('fleet_vehicles_cache');
        if (cachedVehicles.length > 0) setVehicles(cachedVehicles);
        setLoading(false);
        return;
      }

      const [reqsRes, vehiclesRes] = await Promise.all([
        fetch('/api/fleet/requisitions'),
        fetch('/api/fleet/vehicles')
      ]);
      if (reqsRes.ok && vehiclesRes.ok) {
        const reqsData = await reqsRes.json();
        const vehiclesData = await vehiclesRes.json();
        setRequisitions(reqsData);
        setVehicles(vehiclesData);
        
        if (isOnline) {
          await cacheData('fleet_vehicles_cache', vehiclesData);
        }
      }
    } catch (_) {
      toast('Failed to load requisitions data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Derive currentUser from NextAuth session
  useEffect(() => {
    if (sessionData?.user) {
      setCurrentUser(sessionData.user as any);
      saveSessionToIdb(sessionData.user);
    } else if (!isOnline) {
      loadSessionFromIdb().then((cached) => {
        if (cached?.isActive) setCurrentUser(cached);
      });
    } else {
      setCurrentUser(null);
    }
  }, [sessionData, isOnline]);

  // Unique drivers from fleet registry
  const uniqueDrivers = Array.from(new Set(vehicles.map(v => v.assignedDriver).filter(Boolean))) as string[];
  const filteredDrivers = driverInputValue
    ? uniqueDrivers.filter(d => d.toLowerCase().includes(driverInputValue.toLowerCase()))
    : uniqueDrivers;

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedLiters || !reqPurpose || !fuelType || !currentOdometer || !driverName || !branch || !destination) {
      toast('Please complete all form fields', 'warning');
      return;
    }
    if (selectedVehicle === 'custom' && (!customPlate || !customMake || !customModel)) {
      toast('Please enter plate number, make, and model for custom vehicle', 'warning');
      return;
    }
    if (selectedVehicle !== 'custom' && !selectedVehicle) {
      toast('Please select a vehicle', 'warning');
      return;
    }
    
    const payload = {
      action: 'create',
      vehicleId: selectedVehicle === 'custom' ? undefined : selectedVehicle,
      customVehicle: selectedVehicle === 'custom' ? { plateNumber: customPlate, make: customMake, model: customModel } : undefined,
      fuelType,
      gasStation,
      litersRequested: Number(requestedLiters),
      purpose: reqPurpose,
      currentOdometer: Number(currentOdometer),
      driverName,
      branch,
      destination
    };

    if (!isOnline) {
      try {
        await saveOfflineTransaction({
          id: crypto.randomUUID(),
          type: 'fleet_requisition',
          payload,
          timestamp: Date.now(),
          status: 'pending'
        });
        toast('Offline fuel requisition saved locally', 'success');
        
        const veh = vehicles.find(v => v.id === selectedVehicle);
        const simReq: Requisition = {
          id: `off-${Date.now()}`,
          vehicleId: selectedVehicle,
          vehicle: veh || { id: '', plateNumber: 'Offline', make: '', model: '' },
          userId: 'offline-user',
          userName: 'Offline User',
          fuelType,
          gasStation,
          litersRequested: Number(requestedLiters),
          purpose: reqPurpose,
          status: 'PENDING',
          approvedBy: null,
          treasurerApprovedBy: null,
          financeManagerApprovedBy: null,
          qrCodeUrl: null,
          redeemToken: null,
          createdAt: new Date().toISOString()
        };
        setRequisitions(prev => [simReq, ...prev]);
        
        setSelectedVehicle('');
        setRequestedLiters('');
        setReqPurpose('');
        setCurrentOdometer('');
        setDriverName('');
        setDriverInputValue('');
        setCustomPlate('');
        setCustomMake('');
        setCustomModel('');
        setBranch('');
        setDestination('');
      } catch {
        toast('Failed to save offline requisition', 'error');
      }
      return;
    }

    try {
      const res = await fetch('/api/fleet/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast('Fuel requisition submitted successfully', 'success');
        setSelectedVehicle('');
        setRequestedLiters('');
        setReqPurpose('');
        setCurrentOdometer('');
        setDriverName('');
        setDriverInputValue('');
        setCustomPlate('');
        setCustomMake('');
        setCustomModel('');
        setBranch('');
        setDestination('');
        fetchData();
      } else {
        toast('Failed to submit requisition', 'error');
      }
    } catch (_) {
      toast('Connection error', 'error');
    }
  };

  const handleProcessRequisition = async (id: string, actionType: 'approve_treasurer' | 'approve_finance' | 'reject') => {
    try {
      const res = await fetch('/api/fleet/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          requisitionId: id
        })
      });
      if (res.ok) {
        toast(
          actionType === 'approve_treasurer'
            ? 'First approval recorded (Treasurer)'
            : actionType === 'approve_finance'
            ? 'Final approval completed. Voucher issued!'
            : 'Requisition rejected',
          'success'
        );
        fetchData();
      } else {
        const err = await res.json().catch(() => ({ error: 'Error processing request' }));
        toast(err.error || 'Failed to process request', 'error');
      }
    } catch (_) {
      toast('Connection error', 'error');
    }
  };

  const openEditDialog = (req: Requisition) => {
    setEditingRequisition(req);
    setEditVehicleId(req.vehicleId);
    setEditFuelType(req.fuelType);
    setEditGasStation(req.gasStation || 'Glow Petroleum');
    setEditRequestedLiters(String(req.litersRequested));
    setEditPurpose(req.purpose);
    setEditOdometer(req.currentOdometer ? String(req.currentOdometer) : '');
    setEditDriverName(req.driverName || '');
    setEditBranch(req.branch || '');
    setEditDestination(req.destination || '');
  };

  const handleEditRequisition = async () => {
    if (!editingRequisition) return;
    if (!editVehicleId || !editRequestedLiters || !editPurpose || !editFuelType || !editOdometer || !editDriverName || !editBranch || !editDestination) {
      toast('All fields are required', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/fleet/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          requisitionId: editingRequisition.id,
          vehicleId: editVehicleId,
          fuelType: editFuelType,
          gasStation: editGasStation,
          litersRequested: Number(editRequestedLiters),
          purpose: editPurpose,
          currentOdometer: Number(editOdometer),
          driverName: editDriverName,
          branch: editBranch,
          destination: editDestination
        })
      });
      if (res.ok) {
        toast('Requisition updated successfully', 'success');
        setEditingRequisition(null);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to update' }));
        toast(err.error || 'Failed to update requisition', 'error');
      }
    } catch {
      toast('Connection error', 'error');
    }
  };

  const handleCancelRequisition = async (id: string, reason?: string) => {
    try {
      const res = await fetch('/api/fleet/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', requisitionId: id, reason: reason || undefined })
      });
      if (res.ok) {
        toast('Requisition cancelled', 'success');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to cancel' }));
        toast(err.error || 'Failed to cancel requisition', 'error');
      }
    } catch {
      toast('Connection error', 'error');
    }
  };

  const handleReasonConfirm = async () => {
    if (reasonAction === 'reject') {
      try {
        const res = await fetch('/api/fleet/requisitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', requisitionId: reasonTargetId, reason: reasonText || undefined })
        });
        if (res.ok) {
          toast('Requisition rejected', 'success');
          setReasonModalOpen(false);
          setReasonText('');
          fetchData();
        } else {
          const err = await res.json().catch(() => ({ error: 'Failed to reject' }));
          toast(err.error || 'Failed to reject requisition', 'error');
        }
      } catch {
        toast('Connection error', 'error');
      }
    } else if (reasonAction === 'cancel') {
      await handleCancelRequisition(reasonTargetId, reasonText);
      setReasonModalOpen(false);
      setReasonText('');
    }
  };

  const role = currentUser?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isApprover = isAdmin || role === 'treasurer' || role === 'finance_manager';
  const canApproveTreasurer = isAdmin || role === 'treasurer';
  const canApproveFinance = isAdmin || role === 'finance_manager';
  const visibleRequisitions = isApprover || !currentUser
    ? requisitions
    : requisitions.filter(r => r.userId === currentUser.id || r.userId === currentUser.email);

  // Apply search and filters
  const filteredRequisitions = visibleRequisitions.filter(r => {
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        r.vehicle.plateNumber.toLowerCase().includes(q) ||
        r.userName.toLowerCase().includes(q) ||
        r.driverName?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q) ||
        r.gasStation?.toLowerCase().includes(q) ||
        r.branch?.toLowerCase().includes(q) ||
        r.destination?.toLowerCase().includes(q);
      if (!match) return false;
    }
    // Vehicle filter
    if (filterVehicle && r.vehicleId !== filterVehicle) return false;
    // Fuel type filter
    if (filterFuelType && r.fuelType !== filterFuelType) return false;
    // Status filter
    if (filterStatus && r.status !== filterStatus) return false;
    // Date range filter
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      if (new Date(r.createdAt) < from) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(r.createdAt) > to) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredRequisitions.length / pageSize);
  const paginatedRequisitions = filteredRequisitions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const activeFilterCount = [filterVehicle, filterFuelType, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterVehicle('');
    setFilterFuelType('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  };

  const canDownload = (req: Requisition) => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase();
    return role === 'treasurer' || role === 'admin';
  };

  const handleDownloadPDF = async (req: Requisition) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const W = 210;
      const M = 14;
      const CW = W - M * 2;

      // ---- Branded header ----
      doc.setFillColor(79, 70, 229);
      doc.rect(M, 8, CW, 3, 'F');
      const logoBase64 = await fetchImageAsBase64('/logo.png');
      if (logoBase64) doc.addImage(logoBase64, 'PNG', M, 14, 24, 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('Mineazy Mining Solutions', M, 31);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('15 Plumtree Road, Belmont, BULAWAYO', M, 37);
      doc.text('Contact: +263712290046  |  Email: accounts@mineazy.co.zw', M, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(79, 70, 229);
      doc.text('CORPORATE FUEL VOUCHER', W - M, 28, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`REF-${req.id.slice(0, 8).toUpperCase()}`, W - M, 34, { align: 'right' });
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.7);
      doc.line(M, 48, W - M, 48);

      // ---- Approval status banner ----
      let y = 54;
      doc.setFillColor(238, 242, 255);
      doc.roundedRect(M, y, CW, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(22, 101, 52);
      doc.text('APPROVED', 105, y + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229);
      doc.text(`Issued: ${formatApprovalDate(req.financeManagerApprovedAt || req.createdAt)}`, W - M, y + 7, { align: 'right' });
      y += 18;

      // ---- Section title helper ----
      const sectionTitle = (title: string, pos: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(79, 70, 229);
        doc.text(title.toUpperCase(), M, pos);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(M, pos + 2, W - M, pos + 2);
      };
      const rowH = 5.6;
      const drawRow = (label: string, value: string, yRow: number, idx: number) => {
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, yRow - 4.4, CW, rowH, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(label, M, yRow);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        const lines = doc.splitTextToSize(value, CW - 55) as string[];
        doc.text(lines, W - M, yRow, { align: 'right' });
      };

      // ---- Requisition details ----
      sectionTitle('Requisition Details', y);
      y += 8;
      const detailRows: [string, string][] = [
        ['Voucher Reference', `REF-${req.id.slice(0, 8).toUpperCase()}`],
        ['Vehicle Plate', req.vehicle.plateNumber],
        ['Driver Name', req.driverName || '-'],
        ['Branch', req.branch || '-'],
        ['Destination', req.destination || '-'],
        ['Fuel Type', req.fuelType],
        ['Volume to Redeem', `${req.litersRequested} Liters`],
        ['Odometer Reading', req.currentOdometer ? `${req.currentOdometer} km` : '-'],
        ['Redeem Gas Station', req.gasStation || '-'],
      ];
      detailRows.forEach(([label, value], idx) => {
        drawRow(label, value, y, idx);
        y += rowH;
      });
      y += 4;

      // ---- Approval trail ----
      sectionTitle('Approval Trail', y);
      y += 8;
      const approvalRows: [string, string][] = [
        ['Approval Status', statusLabel(req.status)],
        [
          'First (Treasurer)',
          req.treasurerApprovedBy
            ? `Approved by ${req.treasurerApprovedBy}${req.treasurerApprovedAt ? ` on ${formatApprovalDate(req.treasurerApprovedAt)}` : ''}`
            : 'Pending',
        ],
        [
          'Final (Finance Manager)',
          req.financeManagerApprovedBy
            ? `Approved by ${req.financeManagerApprovedBy}${req.financeManagerApprovedAt ? ` on ${formatApprovalDate(req.financeManagerApprovedAt)}` : ''}`
            : 'Pending',
        ],
      ];
      approvalRows.forEach(([label, value], idx) => {
        drawRow(label, value, y, idx);
        y += rowH;
      });
      y += 6;

      // ---- Fuel token (barcode + QR) ----
      sectionTitle('Fuel Token', y);
      y += 9;
      const boxH = 48;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.roundedRect(M, y, CW, boxH, 2, 2, 'FD');
      const dividerX = 150;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(dividerX, y, dividerX, y + boxH);
      // Barcode (left)
      const redeemValue = req.redeemToken || '000000';
      const barcodeUnit = 0.55;
      const barcodeWidth = code39Binary(redeemValue).length * barcodeUnit;
      const barcodeCenterX = (M + dividerX) / 2;
      drawTokenBarcode(doc, redeemValue, barcodeCenterX - barcodeWidth / 2, y + 11, barcodeUnit, 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan to Redeem Fuel', barcodeCenterX, y + 34, { align: 'center' });
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('6-digit redeem code', barcodeCenterX, y + 39, { align: 'center' });
      // QR (right, with white quiet zone)
      const tokenParam = req.redeemToken ? `&token=${encodeURIComponent(req.redeemToken)}` : '';
      const verifyUrl = `${window.location.origin}/verify/fuel?id=${req.id}${tokenParam}`;
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;
      const qrBase64 = await fetchImageAsBase64(qrSrc);
      const qrCenterX = (dividerX + W - M) / 2;
      if (qrBase64) {
        const qrSize = 24;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(qrCenterX - qrSize / 2 - 3, y + 6, qrSize + 6, qrSize + 6, 1.5, 1.5, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(qrCenterX - qrSize / 2 - 3, y + 6, qrSize + 6, qrSize + 6, 1.5, 1.5, 'S');
        doc.addImage(qrBase64, 'PNG', qrCenterX - qrSize / 2, y + 8, qrSize, qrSize);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan to Verify', qrCenterX, y + 34, { align: 'center' });
      doc.text('Authenticity', qrCenterX, y + 39, { align: 'center' });
      y += boxH + 6;

      // ---- Security clearance ----
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.roundedRect(M, y, CW, 38, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(79, 70, 229);
      doc.text('SECURITY CLEARANCE', M + 8, y + 9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Station security officer sign-off before fuel is dispensed', M + 8, y + 14.5);
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Security Officer Signature', M + 8, y + 27);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.line(M + 62, y + 23, 105, y + 23);
      doc.text('Date', 116, y + 27);
      doc.line(131, y + 23, W - M, y + 23);
      y += 44;

      // ---- Footer ----
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(M, y, W - M, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Mineazy Mining Solutions  •  15 Plumtree Road, Belmont, BULAWAYO  •  +263712290046  •  accounts@mineazy.co.zw', 105, y + 6, { align: 'center' });
      doc.text('Authenticity verifiable at mineazy.com/verify/fuel  |  This voucher is valid for one-time fuel redemption at the designated station', 105, y + 11, { align: 'center' });

      const url = window.URL.createObjectURL(doc.output('blob'));
      triggerExport(url, `Fuel_Voucher_REF-${req.id.slice(0, 8).toUpperCase()}`);
    } catch (e) {
      console.error('Failed to generate voucher PDF:', e);
      toast('Failed to generate voucher PDF', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return <Badge variant="warning">Awaiting Treasurer (First)</Badge>;
      case 'TREASURER_APPROVED':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Awaiting Finance Manager (Final)</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Approved & Issued</Badge>;
      case 'DISPENSED':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800">Fuel Dispensed</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-mine-blue-800" />
          Fuel Requisitions
        </h2>
        <p className="text-slate-500 mt-1">Manage and audit vehicle fueling approval requests, QR code verifications, and gas station tokens</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requisitions List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Requisition Registry & Approvals</CardTitle>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs h-8 gap-1">
                      <X className="h-3.5 w-3.5" />
                      Clear ({activeFilterCount})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`text-xs h-8 gap-1 ${showFilters ? 'bg-mine-blue-50 text-mine-blue-700 border-mine-blue-200' : ''}`}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1 bg-mine-blue-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">{activeFilterCount}</span>
                    )}
                  </Button>
                </div>
              </div>
              {/* Search bar */}
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by plate, requestor, driver, purpose, branch..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              {/* Filter row */}
              {showFilters && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                  <select
                    value={filterVehicle}
                    onChange={(e) => { setFilterVehicle(e.target.value); setCurrentPage(1); }}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
                  >
                    <option value="">All Vehicles</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.plateNumber}</option>
                    ))}
                  </select>
                  <select
                    value={filterFuelType}
                    onChange={(e) => { setFilterFuelType(e.target.value); setCurrentPage(1); }}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
                  >
                    <option value="">All Fuel Types</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="TREASURER_APPROVED">Treasurer Approved</option>
                    <option value="APPROVED">Approved</option>
                    <option value="DISPENSED">Dispensed</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                    placeholder="Date From"
                    className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
                  />
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                    placeholder="Date To"
                    className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequisitions.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {new Date(r.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">
                        <div className="flex flex-col">
                          <span>{r.vehicle.plateNumber}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{r.gasStation}</span>
                        </div>
                      </TableCell>
                      <TableCell>{r.userName}</TableCell>
                      <TableCell>
                        <Badge variant={r.fuelType === 'Diesel' ? 'secondary' : 'default'} className="text-[10px]">
                          {r.fuelType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{r.litersRequested} L</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingRequisition(r)}
                            className="text-xs h-8 gap-1"
                            title="View Requisition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>

                          {r.status === 'APPROVED' && canDownload(r) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadPDF(r)}
                              className="text-xs h-8 p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              title="Download Fuel Slip PDF"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedRequisitions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                        {filteredRequisitions.length === 0 && visibleRequisitions.length > 0
                          ? 'No requisitions match your search or filters'
                          : isApprover
                          ? 'No requisitions submitted yet'
                          : 'No requisitions submitted by you yet'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {/* Pagination */}
              {filteredRequisitions.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Showing {Math.min((currentPage - 1) * pageSize + 1, filteredRequisitions.length)}–{Math.min(currentPage * pageSize, filteredRequisitions.length)} of {filteredRequisitions.length}</span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="border border-slate-200 rounded px-1.5 py-0.5 text-xs bg-white"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span>per page</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="h-7 px-2 text-xs"
                    >
                      Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | string)[]>((acc, p, idx, arr) => {
                        if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                          acc.push('...');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        typeof p === 'string' ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-xs">...</span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(p)}
                            className="h-7 w-7 p-0 text-xs"
                          >
                            {p}
                          </Button>
                        )
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="h-7 px-2 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submit Requisition Form */}
        <Card className="self-start">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-lg">Request Fuel</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleCreateRequisition} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Vehicle *</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} ({v.make} {v.model})
                    </option>
                  ))}
                  <option value="custom">+ Add Custom Vehicle</option>
                </select>
              </div>
              {selectedVehicle === 'custom' && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Plate Number *</label>
                    <input type="text" required placeholder="e.g. ABC-123" value={customPlate} onChange={(e) => setCustomPlate(e.target.value.toUpperCase())} className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Make *</label>
                    <input type="text" required placeholder="e.g. Toyota" value={customMake} onChange={(e) => setCustomMake(e.target.value)} className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Model *</label>
                    <input type="text" required placeholder="e.g. Hilux" value={customModel} onChange={(e) => setCustomModel(e.target.value)} className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Moyo"
                    value={driverName}
                    onChange={(e) => { setDriverName(e.target.value); setDriverInputValue(e.target.value); setShowDriverDropdown(true); }}
                    onFocus={() => setShowDriverDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDriverDropdown(false), 200)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                  {showDriverDropdown && filteredDrivers.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredDrivers.map((d) => (
                        <button key={d} type="button" onClick={() => { setDriverName(d); setDriverInputValue(d); setShowDriverDropdown(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 text-slate-700">
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Branch *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Harare Branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Current Odometer Reading (km) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 125000"
                    value={currentOdometer}
                    onChange={(e) => setCurrentOdometer(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Requested Liters (L)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={requestedLiters}
                    onChange={(e) => setRequestedLiters(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Redeem Gas Station</label>
                  <select
                    value={gasStation}
                    onChange={(e) => setGasStation(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                  >
                    <option value="Glow Petroleum">Glow Petroleum</option>
                    <option value="Zuva Petroleum Harare">Zuva Petroleum</option>
                    <option value="Puma Energy Belgravia">Puma Energy</option>
                    <option value="TotalEnergies Avondale">TotalEnergies</option>
                    <option value="Engen Msasa">Engen Petroleum</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Destination *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Branch Harare"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Purpose / Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Hauling ore from WH-EAST to Branch Harare"
                  value={reqPurpose}
                  onChange={(e) => setReqPurpose(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <Button type="submit" className="w-full font-bold">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Voucher Code Preview Modal Dialog */}
      <Dialog
        open={!!activeVoucher}
        onClose={() => setActiveVoucher(null)}
        title="Verifiable Fuel Voucher"
        description="Verify and download official fuel slip"
      >
        {activeVoucher && (
          <div className="space-y-4 py-4 flex flex-col items-center">
            {/* Voucher Specs */}
            <div className="w-full bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm space-y-2">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Mineazy Logo" className="h-10 object-contain" />
                <div>
                  <p className="font-bold text-indigo-700">Fuel Voucher</p>
                  <p className="text-[11px] text-slate-500">REF-{activeVoucher.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plate Number:</span>
                <span className="font-bold text-slate-800">{activeVoucher.vehicle.plateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fuel Type / Volume:</span>
                <span className="font-bold text-slate-800">{activeVoucher.fuelType} - {activeVoucher.litersRequested} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Redeem Station:</span>
                <span className="font-bold text-indigo-700">{activeVoucher.gasStation}</span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 border-t border-slate-200">
                <span className="text-slate-500">1st (Treasurer):</span>
                <span className="font-medium text-emerald-600">
                  Approved ({activeVoucher.treasurerApprovedBy}
                  {activeVoucher.treasurerApprovedAt ? ` - ${formatApprovalDate(activeVoucher.treasurerApprovedAt)}` : ''})
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Final (Finance Mgr):</span>
                <span className="font-medium text-emerald-600">
                  Approved ({activeVoucher.financeManagerApprovedBy}
                  {activeVoucher.financeManagerApprovedAt ? ` - ${formatApprovalDate(activeVoucher.financeManagerApprovedAt)}` : ''})
                </span>
              </div>
            </div>

            {/* Barcoded Token Representation */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-3 text-center w-full">
              <div className="mb-2">
                <Barcode value={activeVoucher.redeemToken || '000000'} />
              </div>
              <div className="text-indigo-700 font-bold text-base">
                TOKEN: {activeVoucher.redeemToken}
              </div>
            </div>

            {/* QR Code representation */}
            {activeVoucher.qrCodeUrl && (
              <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeVoucher.qrCodeUrl} alt="Voucher QR Code" className="w-[130px] h-[130px]" />
              </div>
            )}

            {/* PDF Slip Download trigger */}
            {canDownload(activeVoucher) && (
              <Button
                onClick={() => handleDownloadPDF(activeVoucher)}
                className="w-full font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="h-4 w-4" />
                Download Slip (PDF)
              </Button>
            )}
          </div>
        )}
      </Dialog>

      {/* Edit Requisition Dialog */}
      <Dialog
        open={!!editingRequisition}
        onClose={() => setEditingRequisition(null)}
        title="Edit Requisition"
        description={`Editing requisition for ${editingRequisition?.vehicle?.plateNumber || ''}`}
        size="3xl"
      >
        {editingRequisition && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Vehicle *</label>
                <select
                  value={editVehicleId}
                  onChange={(e) => setEditVehicleId(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.plateNumber} ({v.make} {v.model})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Fuel Type *</label>
                <select
                  value={editFuelType}
                  onChange={(e) => setEditFuelType(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                >
                  <option value="Diesel">Diesel</option>
                  <option value="Petrol">Petrol</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Requested Liters (L) *</label>
                <input
                  type="number"
                  value={editRequestedLiters}
                  onChange={(e) => setEditRequestedLiters(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Gas Station</label>
                <select
                  value={editGasStation}
                  onChange={(e) => setEditGasStation(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                >
                  <option value="Glow Petroleum">Glow Petroleum</option>
                  <option value="Zuva Petroleum Harare">Zuva Petroleum</option>
                  <option value="Puma Energy Belgravia">Puma Energy</option>
                  <option value="TotalEnergies Avondale">TotalEnergies</option>
                  <option value="Engen Msasa">Engen Petroleum</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Driver Name *</label>
                <input
                  type="text"
                  value={editDriverName}
                  onChange={(e) => setEditDriverName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Branch *</label>
                <input
                  type="text"
                  value={editBranch}
                  onChange={(e) => setEditBranch(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Odometer Reading (km) *</label>
                <input
                  type="number"
                  value={editOdometer}
                  onChange={(e) => setEditOdometer(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Destination *</label>
                <input
                  type="text"
                  value={editDestination}
                  onChange={(e) => setEditDestination(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Purpose / Notes *</label>
              <textarea
                rows={3}
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingRequisition(null)}>Cancel</Button>
              <Button onClick={handleEditRequisition}>Save Changes</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* View Requisition Detail Modal */}
      <Dialog
        open={!!viewingRequisition}
        onClose={() => setViewingRequisition(null)}
        title="Requisition Details"
        description={`REF-${viewingRequisition?.id.slice(0, 8).toUpperCase() || ''}`}
        size="3xl"
      >
        {viewingRequisition && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-mine-blue-50 p-2 rounded-lg">
                  <Fuel className="h-5 w-5 text-mine-blue-700" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{viewingRequisition.vehicle.plateNumber}</p>
                  <p className="text-xs text-slate-500">{viewingRequisition.vehicle.make} {viewingRequisition.vehicle.model}</p>
                </div>
              </div>
              {getStatusBadge(viewingRequisition.status)}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Driver</p>
                <p className="text-sm font-medium">{viewingRequisition.driverName || '-'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Fuel Type</p>
                <p className="text-sm font-medium">{viewingRequisition.fuelType}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Liters Requested</p>
                <p className="text-sm font-bold text-mine-blue-800">{viewingRequisition.litersRequested} L</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Branch</p>
                <p className="text-sm font-medium">{viewingRequisition.branch || '-'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Destination</p>
                <p className="text-sm font-medium">{viewingRequisition.destination || '-'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Gas Station</p>
                <p className="text-sm font-medium">{viewingRequisition.gasStation || '-'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Odometer</p>
                <p className="text-sm font-medium">{viewingRequisition.currentOdometer ? `${viewingRequisition.currentOdometer} km` : '-'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Submitted By</p>
                <p className="text-sm font-medium">{viewingRequisition.userName}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Date</p>
                <p className="text-sm font-medium">{new Date(viewingRequisition.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Purpose */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Purpose</p>
              <p className="text-sm text-slate-700">{viewingRequisition.purpose}</p>
            </div>

            {/* Approval Trail */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Approval Trail</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Treasurer:</span>{' '}
                  <span className="font-medium">
                    {viewingRequisition.treasurerApprovedBy
                      ? `${viewingRequisition.treasurerApprovedBy}${viewingRequisition.treasurerApprovedAt ? ` on ${formatApprovalDate(viewingRequisition.treasurerApprovedAt)}` : ''}`
                      : 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Finance Manager:</span>{' '}
                  <span className="font-medium">
                    {viewingRequisition.financeManagerApprovedBy
                      ? `${viewingRequisition.financeManagerApprovedBy}${viewingRequisition.financeManagerApprovedAt ? ` on ${formatApprovalDate(viewingRequisition.financeManagerApprovedAt)}` : ''}`
                      : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes/Reason (if rejected/cancelled) */}
            {viewingRequisition.notes && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-[10px] text-red-500 uppercase tracking-wider font-bold mb-1">Reason ({viewingRequisition.status === 'REJECTED' ? 'Rejection' : 'Cancellation'})</p>
                <p className="text-sm text-red-700">{viewingRequisition.notes}</p>
              </div>
            )}

            {/* Action Buttons (for approvers on editable requisitions) */}
            {viewingRequisition && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(viewingRequisition.status) && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {viewingRequisition.status === 'PENDING' && canApproveTreasurer && (
                  <Button
                    size="sm"
                    onClick={() => { handleProcessRequisition(viewingRequisition.id, 'approve_treasurer'); setViewingRequisition(null); }}
                    className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve (Treasurer)
                  </Button>
                )}
                {viewingRequisition.status === 'TREASURER_APPROVED' && canApproveFinance && (
                  <Button
                    size="sm"
                    onClick={() => { handleProcessRequisition(viewingRequisition.id, 'approve_finance'); setViewingRequisition(null); }}
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve (Finance Mgr)
                  </Button>
                )}
                {isApprover && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { openEditDialog(viewingRequisition); setViewingRequisition(null); }}
                      className="gap-1"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setReasonAction('reject'); setReasonTargetId(viewingRequisition.id); setReasonModalOpen(true); setViewingRequisition(null); }}
                      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setReasonAction('cancel'); setReasonTargetId(viewingRequisition.id); setReasonModalOpen(true); setViewingRequisition(null); }}
                      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </>
                )}
                {!isApprover && (
                  <p className="text-xs text-slate-400 italic">Only approvers can take action on this requisition</p>
                )}
              </div>
            )}

            {/* View Voucher for APPROVED */}
            {viewingRequisition.status === 'APPROVED' && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  onClick={() => { setActiveVoucher(viewingRequisition); setViewingRequisition(null); }}
                  className="gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Voucher
                </Button>
                {canDownload(viewingRequisition) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { handleDownloadPDF(viewingRequisition); setViewingRequisition(null); }}
                    className="gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PDF
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Reason Modal (for Reject/Cancel) */}
      <Dialog
        open={reasonModalOpen}
        onClose={() => { setReasonModalOpen(false); setReasonText(''); }}
        title={reasonAction === 'reject' ? 'Reason for Rejection' : 'Reason for Cancellation'}
        description="Please provide a reason (optional)"
        size="sm"
      >
        <div className="space-y-4">
          <textarea
            rows={4}
            placeholder={reasonAction === 'reject' ? 'e.g. Insufficient budget, duplicate request...' : 'e.g. No longer needed, duplicate request...'}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-800"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setReasonModalOpen(false); setReasonText(''); }}>
              Cancel
            </Button>
            <Button
              variant={reasonAction === 'reject' ? 'destructive' : 'destructive'}
              onClick={handleReasonConfirm}
            >
              {reasonAction === 'reject' ? 'Confirm Rejection' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Dialog>
      {ExportDialog}
    </div>
  );
}
