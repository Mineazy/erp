import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export const generateA4Invoice = async (
  transaction: any,
  customer: any | null,
  triggerExport: (url: string, filename: string, options?: any) => void
) => {
  if (!transaction) return;

  const doc = new jsPDF('p', 'mm', 'a4');
  
  try {
    const logoBase64 = await fetchImageAsBase64('/logo.png');
    doc.addImage(logoBase64 as string, 'PNG', 14, 15, 30, 10);
  } catch (e) {
    console.error('Failed to load logo', e);
  }

  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text('Mineazy Mining Solutions', 14, 34);

  if (transaction?.branch?.name) {
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text(transaction.branch.name, 14, 42);
  }

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const address = transaction?.branch?.address || '15 Plumtree Road, Belmont';
  const city = transaction?.branch?.city || 'BULAWAYO';
  doc.text(`${address}, ${city}`, 14, 48);
  doc.text('TIN: 2001282270 | VAT No: 220107408', 14, 53);
  doc.text(`Mobile: ${transaction?.branch?.phone || '+263712290046'}`, 14, 58);
  doc.text(`Email: ${transaction?.branch?.email || 'sales@mineazy.co.zw, accounts@mineazy.co.zw'}`, 14, 63);

  doc.setFontSize(24);
  doc.setTextColor(79, 70, 229);
  doc.text('FISCAL TAX INVOICE', 196, 34, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice No: ${transaction.transactionNumber}`, 196, 48, { align: 'right' });
  doc.text(`Date: ${new Date(transaction.createdAt).toLocaleDateString()}`, 196, 53, { align: 'right' });
  doc.text(`Time: ${new Date(transaction.createdAt).toLocaleTimeString()}`, 196, 58, { align: 'right' });

  doc.line(14, 68, 196, 68);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Customer Details', 14, 78);
  
  doc.setFontSize(10);
  if (customer) {
    doc.text(`Name: ${customer.name}`, 14, 85);
    doc.text(`Loyalty ID: ${customer.loyaltyCardBarcode || 'N/A'}`, 14, 90);
  } else if (transaction.customerName) {
    doc.text(`Name: ${transaction.customerName}`, 14, 85);
  } else {
    doc.text('Walk-in Customer', 14, 85);
  }

  autoTable(doc, {
    startY: 100,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: transaction.lines?.map((item: any) => [
      item.productName,
      item.quantity.toString(),
      `$${Number(item.unitPrice || item.price || 0).toFixed(2)}`,
      `$${Number(item.total || item.lineTotal || (Number(item.quantity) * Number(item.unitPrice || item.price || 0)) || 0).toFixed(2)}`
    ]) || [],
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 10 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  const subtotal = Number(transaction.total || 0) - Number(transaction.taxAmount || 0);
  const taxAmount = Number(transaction.taxAmount || 0);
  const total = Number(transaction.total || 0);

  autoTable(doc, {
    startY: finalY,
    margin: { left: 120 },
    body: [
      ['Subtotal (Excl. VAT):', `$${subtotal.toFixed(2)}`],
      ['VAT Amount:', `$${taxAmount.toFixed(2)}`],
      ['Total Amount:', `$${total.toFixed(2)}`]
    ],
    theme: 'plain',
    styles: { fontSize: 11, halign: 'right' },
    columnStyles: {
      0: { fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 14;
      }
    }
  });

  finalY = (doc as any).lastAutoTable.finalY + 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for shopping with Mineazy!', 105, 280, { align: 'center' });
  doc.text('Please keep this invoice for your records, returns, or warranty claims.', 105, 285, { align: 'center' });

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  triggerExport(url, `Tax_Invoice_${transaction.transactionNumber}`, { isRestricted: true });
};

export const printPOSReceipt = async (transaction: any) => {
  if (!transaction) return;
  // Tauri desktop: use native raw print if available
  try {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
    if (isTauri) {
      const { tauriPrintRaw } = await import('./tauri-bridge');
      // Build ESC/POS text fallback then delegate to Rust
      const escPosText = `Mineazy Mining Solutions\n${transaction.branch?.name || ''}\nTAX INVOICE ${transaction.transactionNumber}\n${new Date(transaction.createdAt).toLocaleString()}\n------------------------------\n${(transaction.lines||[]).map((l:any)=>`${l.productName} x${l.quantity}  $${Number(l.total).toFixed(2)}`).join('\n')}\n------------------------------\nTOTAL $${Number(transaction.total).toFixed(2)}\nThank you!\n`;
      await tauriPrintRaw('', escPosText);
      return;
    }
  } catch {}
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) return;

  const itemsHtml = transaction.lines?.map((item: any) => `
    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
      <span>${item.productName} x${item.quantity}</span>
      <span>$${Number(item.total || item.lineTotal || (Number(item.quantity) * Number(item.unitPrice || item.price || 0)) || 0).toFixed(2)}</span>
    </div>
  `).join('') || '';

  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt - ${transaction.transactionNumber}</title>
        <style>
          @page { margin: 0; }
          body { font-family: monospace; width: 300px; margin: 0 auto; padding: 10px; color: #000; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .border-b { border-bottom: 1px dashed #000; margin: 10px 0; padding-bottom: 10px; }
          .flex-between { display: flex; justify-content: space-between; }
          .mb-2 { margin-bottom: 8px; }
          .mt-4 { margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="text-center border-b">
          <h2 class="font-bold" style="margin: 0; font-size: 16px;">Mineazy Mining Solutions</h2>
          ${transaction?.branch?.name ? `<p class="font-bold" style="margin: 2px 0 0; font-size: 14px;">${transaction.branch.name}</p>` : ''}
          <p style="margin: 2px 0 0; font-size: 10px;">${transaction?.branch?.address || '15 Plumtree Road, Belmont'}${transaction?.branch?.city ? `, ${transaction.branch.city}` : ', BULAWAYO'}</p>
          <p style="margin: 2px 0 0; font-size: 10px;">TIN: 2001282270 | VAT No: 220107408</p>
          <p style="margin: 2px 0 0; font-size: 10px;">Mobile: ${transaction?.branch?.phone || '+263712290046'} | Email: ${transaction?.branch?.email || 'sales@mineazy.co.zw'}</p>
          
          <h3 class="font-bold mt-4" style="margin: 10px 0 0; font-size: 14px;">TAX INVOICE</h3>
          <p style="margin: 2px 0 0; font-size: 12px;">Ref: ${transaction.transactionNumber}</p>
          <p style="margin: 2px 0 0; font-size: 12px;">${new Date(transaction.createdAt).toLocaleString()}</p>
        </div>
        ${transaction.customerName ? `<div style="padding: 4px 0; border-bottom: 1px dashed #000; font-size: 11px;"><span class="font-bold">Customer:</span> ${transaction.customerName}</div>` : ''}
        <div class="border-b">${itemsHtml}</div>
        <div class="border-b">
          <div class="flex-between">
            <span>Subtotal:</span>
            <span>$${(Number(transaction.total || 0) - Number(transaction.taxAmount || 0)).toFixed(2)}</span>
          </div>
          <div class="flex-between">
            <span>Tax:</span>
            <span>$${Number(transaction.taxAmount || 0).toFixed(2)}</span>
          </div>
          <div class="flex-between font-bold mt-4" style="font-size: 16px;">
            <span>TOTAL:</span>
            <span>$${Number(transaction.total || 0).toFixed(2)}</span>
          </div>
        </div>
        <div class="text-center mt-4">
          <p style="font-size: 12px; margin: 0;">Thank you for shopping!</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
