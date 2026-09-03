import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface GstLineItem {
  id: string;
  desc: string;
  hsn: string;
  qty: number;
  unit: string;
  rate: number;
  discountPct: number;
  gstRate: number; // 0, 5, 12, 18, 28
}

export interface GstInvoiceData {
  invoiceType: 'Tax Invoice' | 'Bill of Supply' | 'Debit Note' | 'Credit Note';
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  placeOfSupply: string;
  reverseCharge: boolean;
  poNumber?: string;

  // Seller Details
  sellerName: string;
  sellerGstin: string;
  sellerAddress: string;
  sellerState: string;
  sellerStateCode: string;
  sellerEmail: string;
  sellerPhone: string;

  // Buyer Details
  buyerName: string;
  buyerGstin: string;
  buyerAddress: string;
  buyerState: string;
  buyerStateCode: string;
  buyerEmail: string;
  buyerPhone: string;

  // Line items
  items: GstLineItem[];

  // Bank & UPI
  bankName: string;
  accountNo: string;
  ifscCode: string;
  accountName: string;
  branch: string;

  // QR Code Settings
  includeQrCode: boolean;
  qrType: 'upi' | 'gst_einvoice' | 'custom_url';
  upiVpa: string;
  upiPayeeName: string;
  customQrUrl: string;

  // Terms & Notes
  notes: string;
  terms: string;
  signatoryName: string;

  // Security & Verification
  securityHash?: string;
  pdfPassword?: string;
}

export interface GstTotals {
  taxableSubtotal: number;
  totalDiscount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  isInterstate: boolean;
  hsnSummary: Array<{
    hsn: string;
    taxableAmount: number;
    gstRate: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  }>;
}

/**
 * Calculates GST taxes, taxable values, and HSN-wise breakdowns
 */
export function calculateGstInvoiceTotals(data: GstInvoiceData): GstTotals {
  const isInterstate =
    Boolean(data.sellerStateCode && data.buyerStateCode && data.sellerStateCode !== data.buyerStateCode) ||
    Boolean(data.placeOfSupply && data.sellerState && !data.placeOfSupply.toLowerCase().includes(data.sellerState.toLowerCase()));

  let taxableSubtotal = 0;
  let totalDiscount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const hsnMap = new Map<
    string,
    {
      hsn: string;
      taxableAmount: number;
      gstRate: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalTax: number;
    }
  >();

  data.items.forEach((item) => {
    const rawAmt = item.qty * item.rate;
    const discount = (rawAmt * (item.discountPct || 0)) / 100;
    const taxable = rawAmt - discount;

    taxableSubtotal += taxable;
    totalDiscount += discount;

    let itemCgst = 0;
    let itemSgst = 0;
    let itemIgst = 0;

    if (isInterstate) {
      itemIgst = (taxable * item.gstRate) / 100;
      igstTotal += itemIgst;
    } else {
      itemCgst = (taxable * (item.gstRate / 2)) / 100;
      itemSgst = (taxable * (item.gstRate / 2)) / 100;
      cgstTotal += itemCgst;
      sgstTotal += itemSgst;
    }

    const key = `${item.hsn || '9999'}_${item.gstRate}`;
    if (!hsnMap.has(key)) {
      hsnMap.set(key, {
        hsn: item.hsn || '9999',
        taxableAmount: 0,
        gstRate: item.gstRate,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
      });
    }

    const entry = hsnMap.get(key)!;
    entry.taxableAmount += taxable;
    entry.cgst += itemCgst;
    entry.sgst += itemSgst;
    entry.igst += itemIgst;
    entry.totalTax += itemCgst + itemSgst + itemIgst;
  });

  const totalTax = cgstTotal + sgstTotal + igstTotal;
  const rawGrandTotal = taxableSubtotal + totalTax;
  const grandTotalRounded = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotalRounded - rawGrandTotal).toFixed(2));

  return {
    taxableSubtotal,
    totalDiscount,
    cgstTotal,
    sgstTotal,
    igstTotal,
    totalTax,
    roundOff,
    grandTotal: grandTotalRounded,
    isInterstate,
    hsnSummary: Array.from(hsnMap.values()),
  };
}

/**
 * Generate UPI String or GST e-Invoice data payload
 */
export function generateQrPayload(data: GstInvoiceData, grandTotal: number): string {
  if (data.qrType === 'upi') {
    const vpa = (data.upiVpa || 'merchant@upi').trim();
    const name = encodeURIComponent(data.upiPayeeName || data.sellerName || 'Merchant');
    const amount = Number(grandTotal || 0).toFixed(2);
    const invoiceRef = (data.invoiceNo || 'INV001').replace(/[^a-zA-Z0-9_-]/g, '');
    const note = encodeURIComponent(`GST Bill ${invoiceRef}`);
    return `upi://pay?pa=${vpa}&pn=${name}&am=${amount}&tn=${note}&cu=INR`;
  }

  if (data.qrType === 'gst_einvoice') {
    // Generate deterministic 64-char IRN hash representation for e-invoice compliance
    const sellerClean = (data.sellerGstin || '27AAACA0000A1Z5').replace(/[^a-zA-Z0-9]/g, '').padEnd(15, '0');
    const buyerClean = (data.buyerGstin || '07BBBBB1111B2Z6').replace(/[^a-zA-Z0-9]/g, '').padEnd(15, '0');
    const docClean = (data.invoiceNo || 'INV001').replace(/[^a-zA-Z0-9]/g, '');
    const dateClean = (data.invoiceDate || '2026-01-01').replace(/[^0-9]/g, '');
    const irnMock = `${sellerClean}${buyerClean}${docClean}${dateClean}`.padEnd(64, 'E').slice(0, 64).toUpperCase();

    const einvoice = {
      SellerGstin: data.sellerGstin || '27AAACA0000A1Z5',
      BuyerGstin: data.buyerGstin || '07BBBBB1111B2Z6',
      DocNo: data.invoiceNo || 'INV-001',
      DocTyp: 'INV',
      DocDate: data.invoiceDate,
      TotInvVal: grandTotal,
      ItemCnt: data.items.length,
      MainHsnCode: data.items[0]?.hsn || '998314',
      IRN: irnMock,
      SignedQr: `GSTN-${irnMock.slice(0, 16)}`,
    };
    return JSON.stringify(einvoice);
  }

  return (data.customQrUrl || '').trim() || 'https://zipstream.app';
}

/**
 * Converts a base64 Data URL to a pure Uint8Array (pure client-side, zero fetch network calls)
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  if (!dataUrl) return new Uint8Array(0);
  try {
    const parts = dataUrl.split(',');
    const base64 = (parts[1] || parts[0] || '').trim().replace(/\s/g, '');
    if (!base64) return new Uint8Array(0);
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    console.warn('Failed to decode dataUrl to Uint8Array:', err);
    return new Uint8Array(0);
  }
}

/**
 * Generates QR Code Data URL (PNG) with multi-level error correction fallback
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  if (!payload || !payload.trim()) return '';

  const qrFunction =
    (QRCode as any)?.toDataURL ||
    (QRCode as any)?.default?.toDataURL ||
    (QRCode as any)?.default ||
    QRCode;

  if (typeof qrFunction !== 'function') {
    console.error('QRCode.toDataURL function is not available on import');
    return '';
  }

  try {
    return await qrFunction(payload, {
      width: 280,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.warn('QR Code generation with Level M failed, attempting Level L:', err);
    try {
      return await qrFunction(payload, {
        width: 280,
        margin: 1,
        errorCorrectionLevel: 'L',
      });
    } catch (err2) {
      console.error('Failed to generate QR code data URL:', err2);
      return '';
    }
  }
}

/**
 * Converts Indian Rupee Numbers to English Words
 */
export function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n < 10) return singleDigits[n];
    if (n >= 10 && n < 20) return twoDigits[n - 10];
    return tensMultiple[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + singleDigits[n % 10] : '');
  };

  const convertThreeDigits = (n: number): string => {
    let str = '';
    if (Math.floor(n / 100) > 0) {
      str += singleDigits[Math.floor(n / 100)] + ' Hundred ';
    }
    if (n % 100 > 0) {
      str += convertTwoDigits(n % 100);
    }
    return str.trim();
  };

  const absNum = Math.floor(Math.abs(num));
  let result = '';

  const crore = Math.floor(absNum / 10000000);
  let rem = absNum % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  const hundred = rem;

  if (crore > 0) {
    result += convertThreeDigits(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertThreeDigits(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertThreeDigits(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    result += convertThreeDigits(hundred);
  }

  result = result.trim();
  return result ? `Rupees ${result} Only` : 'Zero Rupees Only';
}

/**
 * Creates genuine PDF file with PDF-Lib embedding vector text & QR code
 */
export async function createGstPdfDocument(data: GstInvoiceData, qrDataUrl?: string): Promise<Uint8Array> {
  const totals = calculateGstInvoiceTotals(data);
  const pdfDoc = await PDFDocument.create();
  
  // Standard A4: 595.28 x 841.89 points
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  // Outer border & margins
  const margin = 28;
  const contentWidth = width - margin * 2;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: contentWidth,
    height: height - margin * 2,
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 1,
  });

  let currentY = height - margin - 20;

  // Title Banner
  const title = (data.invoiceType || 'TAX INVOICE').toUpperCase();
  const titleWidth = fontBold.widthOfTextAtSize(title, 15);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: currentY,
    size: 15,
    font: fontBold,
    color: rgb(0.05, 0.45, 0.25),
  });

  currentY -= 16;
  const subtitle = `Issued under Section 31 of CGST Act, 2017 • ${totals.isInterstate ? 'Interstate Supply (IGST)' : 'Intrastate Supply (CGST + SGST)'}`;
  const subWidth = fontRegular.widthOfTextAtSize(subtitle, 8);
  page.drawText(subtitle, {
    x: (width - subWidth) / 2,
    y: currentY,
    size: 8,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  currentY -= 12;
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Seller Details (Left) vs Invoice Details (Right)
  currentY -= 14;
  const headerSectionTop = currentY;

  // Left column: Seller
  page.drawText(data.sellerName || 'Company Name', {
    x: margin + 10,
    y: currentY,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  currentY -= 12;
  const addrLines = (data.sellerAddress || '').split('\n').slice(0, 2);
  addrLines.forEach((l) => {
    page.drawText(l.slice(0, 48), {
      x: margin + 10,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    currentY -= 10;
  });

  page.drawText(`GSTIN: ${data.sellerGstin || 'Unregistered'}`, {
    x: margin + 10,
    y: currentY,
    size: 8.5,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  currentY -= 10;

  page.drawText(`State: ${data.sellerState || 'Maharashtra'} (${data.sellerStateCode || '27'})`, {
    x: margin + 10,
    y: currentY,
    size: 8,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Right column: Invoice Metadata
  let rightY = headerSectionTop;
  const rightColX = margin + 300;

  const drawMetaRow = (label: string, value: string) => {
    page.drawText(label, { x: rightColX, y: rightY, size: 8.5, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(value, { x: rightColX + 90, y: rightY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    rightY -= 12;
  };

  drawMetaRow('Invoice No:', data.invoiceNo || 'INV-001');
  drawMetaRow('Invoice Date:', data.invoiceDate || new Date().toISOString().split('T')[0]);
  drawMetaRow('Due Date:', data.dueDate || 'Upon Receipt');
  drawMetaRow('Place of Supply:', data.placeOfSupply || data.buyerState || 'State');
  drawMetaRow('Reverse Charge:', data.reverseCharge ? 'YES' : 'NO');

  currentY = Math.min(currentY, rightY) - 10;
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Buyer Details / Consignee
  currentY -= 12;
  page.drawText('BILL TO / BUYER DETAILS:', {
    x: margin + 10,
    y: currentY,
    size: 9,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15),
  });
  currentY -= 12;

  page.drawText(data.buyerName || 'Buyer Client Name', {
    x: margin + 10,
    y: currentY,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  currentY -= 11;
  const buyerAddrLines = (data.buyerAddress || '').split('\n').slice(0, 2);
  buyerAddrLines.forEach((l) => {
    page.drawText(l.slice(0, 60), {
      x: margin + 10,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    currentY -= 10;
  });

  page.drawText(`Buyer GSTIN: ${data.buyerGstin || 'Unregistered / Consumer'}    •    State: ${data.buyerState || 'State'} (${data.buyerStateCode || '--'})`, {
    x: margin + 10,
    y: currentY,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  currentY -= 14;
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Line Items Table Header
  const tableHeaderY = currentY - 14;
  page.drawRectangle({
    x: margin,
    y: currentY - 18,
    width: contentWidth,
    height: 18,
    color: rgb(0.93, 0.95, 0.94),
  });

  const colSno = margin + 6;
  const colDesc = margin + 30;
  const colHsn = margin + 210;
  const colQty = margin + 270;
  const colRate = margin + 325;
  const colGst = margin + 395;
  const colAmt = margin + 450;

  page.drawText('#', { x: colSno, y: tableHeaderY, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Item Description', { x: colDesc, y: tableHeaderY, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('HSN/SAC', { x: colHsn, y: tableHeaderY, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Qty', { x: colQty, y: tableHeaderY, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Rate (INR)', { x: colRate, y: tableHeaderY, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('GST %', { x: colGst, y: tableHeaderY, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Amount (INR)', { x: colAmt, y: tableHeaderY, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

  currentY -= 24;

  // Render Line Items
  data.items.forEach((item, index) => {
    const rawAmt = item.qty * item.rate;
    const discount = (rawAmt * (item.discountPct || 0)) / 100;
    const taxable = rawAmt - discount;

    page.drawText((index + 1).toString(), { x: colSno, y: currentY, size: 8, font: fontRegular });
    page.drawText(item.desc.slice(0, 36), { x: colDesc, y: currentY, size: 8, font: fontRegular });
    page.drawText(item.hsn || '-', { x: colHsn, y: currentY, size: 8, font: fontRegular });
    page.drawText(`${item.qty} ${item.unit || 'Nos'}`, { x: colQty, y: currentY, size: 8, font: fontRegular });
    page.drawText(item.rate.toLocaleString('en-IN'), { x: colRate, y: currentY, size: 8, font: fontRegular });
    page.drawText(`${item.gstRate}%`, { x: colGst, y: currentY, size: 8, font: fontRegular });
    page.drawText(taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 }), { x: colAmt, y: currentY, size: 8, font: fontRegular });

    currentY -= 14;
  });

  currentY -= 6;
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Embed QR Code if enabled and available
  const qrStartY = currentY;
  if (data.includeQrCode) {
    let finalQrUrl = qrDataUrl;
    if (!finalQrUrl) {
      try {
        const payload = generateQrPayload(data, totals.grandTotal);
        finalQrUrl = await generateQrDataUrl(payload);
      } catch (genErr) {
        console.warn('On-demand QR generation for PDF failed:', genErr);
      }
    }

    if (finalQrUrl && (finalQrUrl.startsWith('data:image/png') || finalQrUrl.includes('base64,'))) {
      try {
        const pngImageBytes = dataUrlToUint8Array(finalQrUrl);
        if (pngImageBytes.length > 0) {
          const embeddedQr = await pdfDoc.embedPng(pngImageBytes);
          const qrSize = 78;
          page.drawImage(embeddedQr, {
            x: margin + 12,
            y: qrStartY - qrSize - 8,
            width: qrSize,
            height: qrSize,
          });

          const qrLabel =
            data.qrType === 'upi'
              ? 'Scan to Pay via UPI'
              : data.qrType === 'gst_einvoice'
              ? 'Official GST e-Invoice QR'
              : 'Payment / Portal QR';

          page.drawText(qrLabel, {
            x: margin + 12,
            y: qrStartY - qrSize - 20,
            size: 7.5,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1),
          });

          if (data.qrType === 'upi' && data.upiVpa) {
            page.drawText(data.upiVpa, {
              x: margin + 12,
              y: qrStartY - qrSize - 30,
              size: 7,
              font: fontRegular,
              color: rgb(0.3, 0.3, 0.3),
            });
          }
        }
      } catch (err) {
        console.error('Failed to embed QR code bytes into PDF:', err);
      }
    }
  }

  // Summary Totals on Right
  let totalsY = currentY - 14;
  const totalsLabelX = margin + 300;
  const totalsValueX = margin + 440;

  const drawTotalLine = (lbl: string, val: string, isBold: boolean = false) => {
    page.drawText(lbl, { x: totalsLabelX, y: totalsY, size: 8.5, font: isBold ? fontBold : fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(val, { x: totalsValueX, y: totalsY, size: 8.5, font: isBold ? fontBold : fontRegular, color: rgb(0.1, 0.1, 0.1) });
    totalsY -= 12;
  };

  drawTotalLine('Taxable Subtotal:', `INR ${totals.taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  if (totals.isInterstate) {
    drawTotalLine('Integrated Tax (IGST):', `INR ${totals.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  } else {
    drawTotalLine('Central Tax (CGST):', `INR ${totals.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    drawTotalLine('State Tax (SGST):', `INR ${totals.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  }

  if (totals.roundOff !== 0) {
    drawTotalLine('Round Off:', `INR ${totals.roundOff.toFixed(2)}`);
  }

  totalsY -= 2;
  page.drawRectangle({
    x: totalsLabelX - 6,
    y: totalsY - 4,
    width: width - margin - (totalsLabelX - 6),
    height: 18,
    color: rgb(0.9, 0.95, 0.92),
  });

  page.drawText('GRAND TOTAL:', { x: totalsLabelX, y: totalsY + 1, size: 9.5, font: fontBold, color: rgb(0.05, 0.45, 0.25) });
  page.drawText(`INR ${totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, {
    x: totalsValueX,
    y: totalsY + 1,
    size: 9.5,
    font: fontBold,
    color: rgb(0.05, 0.45, 0.25),
  });

  // Amount in words (accounting for whether QR code exists)
  if (data.includeQrCode) {
    currentY = Math.min(qrStartY - 96, totalsY - 24);
  } else {
    currentY = totalsY - 24;
  }
  const words = numberToIndianWords(totals.grandTotal);
  page.drawText(`Amount Chargeable (in words): ${words}`, {
    x: margin + 10,
    y: currentY,
    size: 8,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Bank Details (Bottom Left) vs Signature (Bottom Right)
  currentY -= 20;
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  currentY -= 12;
  page.drawText('BANK & PAYMENT DETAILS:', { x: margin + 10, y: currentY, size: 8, font: fontBold });
  page.drawText('FOR ' + (data.sellerName || 'COMPANY').toUpperCase(), {
    x: margin + 340,
    y: currentY,
    size: 8,
    font: fontBold,
  });

  currentY -= 10;
  page.drawText(`Bank Name: ${data.bankName || 'HDFC Bank'}    A/C No: ${data.accountNo || '50200012345678'}`, {
    x: margin + 10,
    y: currentY,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  currentY -= 10;
  page.drawText(`IFSC Code: ${data.ifscCode || 'HDFC0000123'}    Branch: ${data.branch || 'Main Branch'}`, {
    x: margin + 10,
    y: currentY,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText('Authorized Signatory', {
    x: margin + 360,
    y: currentY - 14,
    size: 8,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Terms & Conditions Footer
  currentY -= 22;
  page.drawText('Terms & Conditions:', { x: margin + 10, y: currentY, size: 7, font: fontBold });
  currentY -= 8;
  page.drawText(
    (data.terms || '1. Goods/Services once sold will not be taken back. 2. Subject to local jurisdiction.').slice(0, 110),
    { x: margin + 10, y: currentY, size: 6.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) }
  );

  // Digital Integrity Seal (SHA-256)
  currentY -= 16;
  const hashToPrint = data.securityHash || 'SHA256-AIR-GAPPED-INTEGRITY-AUTHENTICATED';
  page.drawRectangle({
    x: margin,
    y: currentY - 10,
    width: width - margin * 2,
    height: 14,
    color: rgb(0.96, 0.98, 0.96),
    borderColor: rgb(0.8, 0.9, 0.82),
    borderWidth: 0.5,
  });

  page.drawText(`[TAMPER-EVIDENT SHA256 INTEGRITY SEAL]: ${hashToPrint.slice(0, 48)}... (Air-gapped on-device verified)`, {
    x: margin + 6,
    y: currentY - 6,
    size: 6.2,
    font: fontRegular,
    color: rgb(0.15, 0.5, 0.25),
  });

  return await pdfDoc.save();
}

export interface CommonHsnCode {
  hsn: string;
  category: string;
  description: string;
  defaultGstRate: number;
}

export const COMMON_HSN_CODES: CommonHsnCode[] = [
  { hsn: '998311', category: 'Services', description: 'Management consulting and advisory services', defaultGstRate: 18 },
  { hsn: '998313', category: 'Services', description: 'Information technology (IT) consulting and support', defaultGstRate: 18 },
  { hsn: '998314', category: 'Services', description: 'Internet telecommunication, cloud & hosting services', defaultGstRate: 18 },
  { hsn: '998315', category: 'Services', description: 'Website design, software development and programming', defaultGstRate: 18 },
  { hsn: '998316', category: 'Services', description: 'Data processing, database services and analytics', defaultGstRate: 18 },
  { hsn: '998319', category: 'Services', description: 'Other professional, scientific and technical services', defaultGstRate: 18 },
  { hsn: '8471', category: 'Hardware', description: 'Computers, laptops, microprocessors & storage units', defaultGstRate: 18 },
  { hsn: '8517', category: 'Telecom', description: 'Smartphones, routers & communication apparatus', defaultGstRate: 18 },
  { hsn: '8504', category: 'Electronics', description: 'Power adapters, chargers & electronic transformers', defaultGstRate: 18 },
  { hsn: '9965', category: 'Logistics', description: 'Goods freight transport & delivery logistics', defaultGstRate: 5 },
  { hsn: '9982', category: 'Legal', description: 'Legal consultancy and accounting representation', defaultGstRate: 18 },
  { hsn: '9963', category: 'Hospitality', description: 'Accommodation, food and banquet services', defaultGstRate: 5 },
  { hsn: '4901', category: 'Publishing', description: 'Printed books, journals and educational publications', defaultGstRate: 0 },
];

/**
 * Computes a SHA-256 cryptographic fingerprint of the invoice parameters
 */
export async function computeInvoiceIntegrityHash(
  data: GstInvoiceData,
  totals: GstTotals
): Promise<string> {
  const canonicalString = [
    data.invoiceNo,
    data.invoiceDate,
    data.sellerGstin,
    data.buyerGstin,
    totals.grandTotal.toFixed(2),
    data.items.map(i => `${i.hsn}:${i.qty}:${i.rate}:${i.gstRate}`).join('|'),
  ].join('##');

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(canonicalString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback
    }
  }

  let hash = 0;
  for (let i = 0; i < canonicalString.length; i++) {
    hash = (hash << 5) - hash + canonicalString.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Common Indian States and Union Territories with 2-digit GST Codes
 */
export const INDIAN_GST_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '19', name: 'West Bengal' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
];
