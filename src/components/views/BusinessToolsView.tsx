import React, { useState, useEffect, useRef } from 'react';
import {
  Receipt,
  Building2,
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  Printer,
  ArrowLeft,
  CheckCircle2,
  Percent,
  QrCode,
  Sparkles,
  Copy,
  Check,
  Eye,
  Edit3,
  RefreshCw,
  FileText,
  CreditCard,
  HelpCircle,
  Upload,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { ToolMode } from '../../types';
import confetti from 'canvas-confetti';
import {
  GstInvoiceData,
  GstLineItem,
  calculateGstInvoiceTotals,
  generateQrPayload,
  generateQrDataUrl,
  numberToIndianWords,
  createGstPdfDocument,
  INDIAN_GST_STATES,
  COMMON_HSN_CODES,
  computeInvoiceIntegrityHash,
} from '../../utils/gstInvoiceGenerator';

interface BusinessToolsViewProps {
  initialTool: ToolMode;
  onBackToHome: () => void;
}

const DEFAULT_INVOICE: GstInvoiceData = {
  invoiceType: 'Tax Invoice',
  invoiceNo: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
  placeOfSupply: '',
  reverseCharge: false,
  poNumber: '',

  sellerName: '',
  sellerGstin: '',
  sellerAddress: '',
  sellerState: '',
  sellerStateCode: '',
  sellerEmail: '',
  sellerPhone: '',

  buyerName: '',
  buyerGstin: '',
  buyerAddress: '',
  buyerState: '',
  buyerStateCode: '',
  buyerEmail: '',
  buyerPhone: '',

  items: [
    {
      id: '1',
      desc: '',
      hsn: '',
      qty: 1,
      unit: 'Nos',
      rate: 0,
      discountPct: 0,
      gstRate: 18,
    },
  ],

  bankName: '',
  accountNo: '',
  ifscCode: '',
  accountName: '',
  branch: '',

  includeQrCode: false,
  qrType: 'upi',
  upiVpa: '',
  upiPayeeName: '',
  customQrUrl: '',

  notes: 'Thank you for your business! Payment is requested within 15 days of invoice date.',
  terms: '1. Goods/Services once billed are subject to terms of the service agreement.\n2. In case of delayed payments beyond due date, interest @18% p.a. will be levied.\n3. All disputes subject to the jurisdiction of the seller\'s registered office.',
  signatoryName: '',
};

// GSTIN Validator: 2-digit state + 5-char PAN letters + 4 digits + 1 entity code + 1 Z + 1 check
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const validateGstin = (gstin: string): { valid: boolean; message: string } => {
  if (!gstin) return { valid: false, message: 'GSTIN is required' };
  const g = gstin.trim().toUpperCase();
  if (g.length !== 15) return { valid: false, message: `Must be 15 characters (got ${g.length})` };
  if (!GSTIN_REGEX.test(g)) return { valid: false, message: 'Invalid GSTIN format' };
  return { valid: true, message: 'Valid GSTIN ✓' };
};

// State code → State name mapping for auto-fill
const STATE_CODE_MAP: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
  '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
  '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh (New)',
};


export const BusinessToolsView: React.FC<BusinessToolsViewProps> = ({
  initialTool,
  onBackToHome,
}) => {
  const [activeSubTool, setActiveSubTool] = useState<ToolMode>(initialTool);
  const [invoice, setInvoice] = useState<GstInvoiceData>(DEFAULT_INVOICE);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Sync activeSubTool when initialTool changes from navigation/palette
  useEffect(() => {
    setActiveSubTool(initialTool);
  }, [initialTool]);

  // POS State
  const [posStoreName, setPosStoreName] = useState('ZipStream Express Store');
  const [posUpiVpa, setPosUpiVpa] = useState('expressstore@upi');
  const [posIncludeQr, setPosIncludeQr] = useState(true);
  const [posQrDataUrl, setPosQrDataUrl] = useState('');
  const [posItems, setPosItems] = useState([
    { id: '1', name: 'Arabica Coffee Beans 250g', price: 350, qty: 2 },
    { id: '2', name: 'French Butter Croissant', price: 120, qty: 3 },
    { id: '3', name: 'Artisan Sourdough Loaf', price: 220, qty: 1 },
  ]);

  // Integrity hash state
  const [integrityHash, setIntegrityHash] = useState<string>('');
  const [showHsnSelector, setShowHsnSelector] = useState<number | null>(null);

  // Recalculate totals
  const totals = calculateGstInvoiceTotals(invoice);
  const wordsTotal = numberToIndianWords(totals.grandTotal);

  // Compute integrity hash when invoice or totals change
  useEffect(() => {
    let mounted = true;
    computeInvoiceIntegrityHash(invoice, calculateGstInvoiceTotals(invoice)).then(hash => {
      if (mounted) setIntegrityHash(hash);
    });
    return () => { mounted = false; };
  }, [invoice]);

  // Regenerate GST QR code whenever relevant fields change
  useEffect(() => {
    let isMounted = true;
    if (!invoice.includeQrCode) {
      setQrDataUrl('');
      setIsQrLoading(false);
      return;
    }

    setIsQrLoading(true);
    const payload = generateQrPayload(invoice, totals.grandTotal);
    generateQrDataUrl(payload)
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsQrLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
        if (isMounted) setIsQrLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    invoice.includeQrCode,
    invoice.qrType,
    invoice.upiVpa,
    invoice.upiPayeeName,
    invoice.customQrUrl,
    invoice.sellerGstin,
    invoice.buyerGstin,
    invoice.invoiceNo,
    invoice.invoiceDate,
    totals.grandTotal,
  ]);

  // Generate POS QR Code
  useEffect(() => {
    if (!posIncludeQr) {
      setPosQrDataUrl('');
      return;
    }
    const posTotal = posItems.reduce((acc, i) => acc + i.price * i.qty, 0);
    const upiUri = `upi://pay?pa=${posUpiVpa}&pn=${encodeURIComponent(posStoreName)}&am=${posTotal.toFixed(2)}&tn=POS-BILL&cu=INR`;
    generateQrDataUrl(upiUri).then((url) => setPosQrDataUrl(url));
  }, [posIncludeQr, posStoreName, posUpiVpa, posItems]);

  // Manual Trigger to re-generate QR code
  const handleRegenerateQr = async () => {
    if (!invoice.includeQrCode) return;
    setIsQrLoading(true);
    const payload = generateQrPayload(invoice, totals.grandTotal);
    const url = await generateQrDataUrl(payload);
    setQrDataUrl(url);
    setIsQrLoading(false);
  };

  // Download QR Code PNG directly
  const handleDownloadQrPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${invoice.invoiceNo || 'GST'}_QR_Code.png`;
    link.click();
  };

  // Add Item handler
  const handleAddItem = () => {
    const newItem: GstLineItem = {
      id: Date.now().toString(),
      desc: 'Professional Services / Line Item',
      hsn: '998314',
      qty: 1,
      unit: 'Nos',
      rate: 5000,
      discountPct: 0,
      gstRate: 18,
    };
    setInvoice((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleUpdateItem = (index: number, field: keyof GstLineItem, value: any) => {
    setInvoice((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItem = (id: string) => {
    if (invoice.items.length <= 1) return;
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
  };

  // Download Genuine PDF using pdf-lib with on-demand QR code guarantee
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      let activeQr = qrDataUrl;
      if (invoice.includeQrCode && !activeQr) {
        const payload = generateQrPayload(invoice, totals.grandTotal);
        activeQr = await generateQrDataUrl(payload);
        if (activeQr) setQrDataUrl(activeQr);
      }

      const pdfBytes = await createGstPdfDocument(invoice, activeQr);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNo || 'GST_Invoice'}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      confetti({ particleCount: 35, spread: 60 });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUpiLink = () => {
    const upiUri = generateQrPayload(invoice, totals.grandTotal);
    navigator.clipboard.writeText(upiUri);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Template loader
  const handleLoadTemplate = (type: 'tech' | 'retail' | 'freelance') => {
    if (type === 'tech') {
      setInvoice({
        ...DEFAULT_INVOICE,
        invoiceNo: `INV-TECH-${Math.floor(1000 + Math.random() * 9000)}`,
        items: [
          { id: '1', desc: 'Full-Stack Web Application Engineering', hsn: '998314', qty: 1, unit: 'Project', rate: 75000, discountPct: 0, gstRate: 18 },
          { id: '2', desc: 'Cloud CDN Setup & SSL Hardening', hsn: '998315', qty: 1, unit: 'Setup', rate: 12000, discountPct: 0, gstRate: 18 },
        ],
      });
    } else if (type === 'retail') {
      setInvoice({
        ...DEFAULT_INVOICE,
        invoiceNo: `INV-RET-${Math.floor(1000 + Math.random() * 9000)}`,
        sellerName: 'Krishna Wholesale Trading Corp',
        items: [
          { id: '1', desc: 'Industrial Grade Fasteners (Box of 500)', hsn: '7318', qty: 10, unit: 'Boxes', rate: 1800, discountPct: 2, gstRate: 18 },
          { id: '2', desc: 'Galvanized Steel Wiring 50m', hsn: '7217', qty: 4, unit: 'Rolls', rate: 2400, discountPct: 5, gstRate: 18 },
          { id: '3', desc: 'Copper Grounding Rods', hsn: '7407', qty: 6, unit: 'Pcs', rate: 950, discountPct: 0, gstRate: 18 },
        ],
      });
    } else if (type === 'freelance') {
      setInvoice({
        ...DEFAULT_INVOICE,
        invoiceNo: `INV-DSGN-${Math.floor(1000 + Math.random() * 9000)}`,
        sellerName: 'Studio Aura Design Labs',
        items: [
          { id: '1', desc: 'Brand Identity System & Design Guidelines', hsn: '998391', qty: 1, unit: 'Deliverable', rate: 38000, discountPct: 0, gstRate: 18 },
          { id: '2', desc: 'UI/UX Mobile App Prototyping (Figma)', hsn: '998392', qty: 25, unit: 'Screens', rate: 1200, discountPct: 0, gstRate: 18 },
        ],
      });
    }
  };

  const subTools = [
    {
      id: 'gst_invoice' as ToolMode,
      label: 'GST Tax Invoice',
      icon: Receipt,
      desc: 'Indian GST compliant tax invoice generator with UPI/e-Invoice QR codes & A4 PDF export',
      badge: 'Section 31 CGST',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'pos_billing' as ToolMode,
      label: 'POS Billing Slip',
      icon: QrCode,
      desc: 'Point-of-sale thermal receipt format with instant dynamic UPI payment QR',
      badge: 'Instant QR',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'gst_filing_prep' as ToolMode,
      label: 'GST Filing Prep',
      icon: FileSpreadsheet,
      desc: 'GSTR-1 B2B outward supplies & GSTR-3B tax liability worksheet breakdown',
      badge: 'GSTR-1 & 3B',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
  ];

  const activeToolObj = subTools.find((t) => t.id === activeSubTool) || subTools[0];
  const IconComponent = activeToolObj.icon;

  return (
    <div id="business-tools-container" className="space-y-6 max-w-5xl mx-auto w-full animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 text-[14px] font-semibold text-[#0071e3] dark:text-[#2997ff] hover:opacity-80 transition-opacity cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All 35+ Tools</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11.5px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            GST & UPI QR Engine Active
          </span>
        </div>
      </div>

      {/* Sub-tool Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {subTools.map((tool) => {
          const ToolIcon = tool.icon;
          const isActive = activeSubTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveSubTool(tool.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'bg-white dark:bg-[#1c1c1e] text-[#6e6e73] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] border border-black/[0.06] dark:border-white/[0.08]'
              }`}
            >
              <ToolIcon className="w-4 h-4" />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.1] shadow-xs space-y-6">
        {/* Tool Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {activeToolObj.label}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${activeToolObj.badgeColor}`}>
                  {activeToolObj.badge}
                </span>
              </div>
              <p className="text-[14px] text-[#6e6e73] dark:text-[#8e8e93] mt-0.5">
                {activeToolObj.desc}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {activeSubTool === 'gst_invoice' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-[#f5f5f7] dark:bg-[#252528] p-1 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                <button
                  onClick={() => setViewMode('editor')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer ${
                    viewMode === 'editor'
                      ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-2xs'
                      : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer ${
                    viewMode === 'preview'
                      ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-2xs'
                      : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Tax Invoice Preview</span>
                </button>
              </div>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] text-[13px] font-semibold transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isGeneratingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Download Official PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 1. GST TAX INVOICE */}
        {/* ========================================================================= */}
        {activeSubTool === 'gst_invoice' && (
          <div className="space-y-6">
            {/* Template presets */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-[12.5px] font-bold text-emerald-900 dark:text-emerald-300">
                  Quick Load Business Templates:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLoadTemplate('tech')}
                  className="px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.08] dark:border-white/[0.1] hover:border-emerald-500 cursor-pointer shadow-2xs transition-colors"
                >
                  IT & Consulting
                </button>
                <button
                  onClick={() => handleLoadTemplate('retail')}
                  className="px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.08] dark:border-white/[0.1] hover:border-emerald-500 cursor-pointer shadow-2xs transition-colors"
                >
                  Wholesale & Goods
                </button>
                <button
                  onClick={() => handleLoadTemplate('freelance')}
                  className="px-2.5 py-1 rounded-lg text-[12px] font-semibold bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.08] dark:border-white/[0.1] hover:border-emerald-500 cursor-pointer shadow-2xs transition-colors"
                >
                  Creative Freelance
                </button>
              </div>
            </div>

            {/* QR CODE CONFIGURATION CARD (FEATURE HIGHLIGHT) */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/30 border border-emerald-500/25 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[14.5px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
                      Dynamic Invoice QR Code Engine
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        invoice.includeQrCode
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#86868b]'
                      }`}>
                        {invoice.includeQrCode ? '● QR Code Enabled' : '○ QR Code Disabled'}
                      </span>
                    </h3>
                    <p className="text-[12px] text-[#6e6e73] dark:text-[#8e8e93]">
                      Generate UPI payment QR code (Google Pay, PhonePe, Paytm, BHIM) or official GST e-Invoice IRN data
                    </p>
                  </div>
                </div>

                {/* QR Code Prominent Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setInvoice({ ...invoice, includeQrCode: !invoice.includeQrCode })}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer shadow-xs select-none ${
                    invoice.includeQrCode
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.12] dark:border-white/[0.15] hover:border-emerald-500'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    invoice.includeQrCode ? 'bg-white border-white' : 'border-[#86868b]'
                  }`}>
                    {invoice.includeQrCode && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                  </div>
                  <span>{invoice.includeQrCode ? 'Include QR on Invoice (ON)' : 'Generate QR Code (OFF)'}</span>
                </button>
              </div>

              {!invoice.includeQrCode ? (
                <div className="p-4 rounded-xl bg-white/70 dark:bg-[#1c1c1e]/70 border border-dashed border-emerald-500/30 flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-[12.5px] text-[#6e6e73] dark:text-[#8e8e93]">
                    💡 <strong>QR Code is currently OFF.</strong> Click below if you want your invoice to automatically generate a dynamic UPI payment QR or GST e-Invoice QR code for direct scanning.
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvoice({ ...invoice, includeQrCode: true })}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold shadow-xs cursor-pointer transition-colors shrink-0"
                  >
                    + Generate QR Code Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3 border-t border-emerald-500/20">
                  {/* QR Options */}
                  <div className="md:col-span-2 space-y-3.5">
                    <div>
                      <label className="text-[12px] font-semibold text-[#86868b] block mb-1.5">
                        Choose QR Code Purpose / Payload Type
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setInvoice({ ...invoice, qrType: 'upi' })}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            invoice.qrType === 'upi'
                              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
                              : 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] border-black/[0.08] dark:border-white/[0.1] hover:border-emerald-500'
                          }`}
                        >
                          <div className="text-[12.5px] font-bold">⚡ UPI Payment QR</div>
                          <div className={`text-[10.5px] ${invoice.qrType === 'upi' ? 'text-emerald-100' : 'text-[#86868b]'}`}>
                            Direct payment via GPay, PhonePe, Paytm, BHIM
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInvoice({ ...invoice, qrType: 'gst_einvoice' })}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            invoice.qrType === 'gst_einvoice'
                              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
                              : 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] border-black/[0.08] dark:border-white/[0.1] hover:border-emerald-500'
                          }`}
                        >
                          <div className="text-[12.5px] font-bold">📋 GST e-Invoice</div>
                          <div className={`text-[10.5px] ${invoice.qrType === 'gst_einvoice' ? 'text-emerald-100' : 'text-[#86868b]'}`}>
                            Standard B2B tax authority IRN schema
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInvoice({ ...invoice, qrType: 'custom_url' })}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            invoice.qrType === 'custom_url'
                              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
                              : 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] border-black/[0.08] dark:border-white/[0.1] hover:border-emerald-500'
                          }`}
                        >
                          <div className="text-[12.5px] font-bold">🔗 Custom Link / URL</div>
                          <div className={`text-[10.5px] ${invoice.qrType === 'custom_url' ? 'text-emerald-100' : 'text-[#86868b]'}`}>
                            Razorpay, Stripe, or company portal link
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Specific Inputs based on QR Type */}
                    {invoice.qrType === 'upi' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11.5px] font-semibold text-[#86868b] block mb-1">
                            Seller UPI ID (VPA) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={invoice.upiVpa}
                            onChange={(e) => setInvoice({ ...invoice, upiVpa: e.target.value })}
                            placeholder="e.g. yourbusiness@okhdfcbank"
                            className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[13px] font-mono text-[#1d1d1f] dark:text-[#f5f5f7]"
                          />
                        </div>
                        <div>
                          <label className="text-[11.5px] font-semibold text-[#86868b] block mb-1">
                            Payee Business Display Name
                          </label>
                          <input
                            type="text"
                            value={invoice.upiPayeeName}
                            onChange={(e) => setInvoice({ ...invoice, upiPayeeName: e.target.value })}
                            placeholder="e.g. Apex Cloud Innovations"
                            className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]"
                          />
                        </div>
                      </div>
                    )}

                    {invoice.qrType === 'custom_url' && (
                      <div>
                        <label className="text-[11.5px] font-semibold text-[#86868b] block mb-1">
                          Target Web URL or Payment Portal Link
                        </label>
                        <input
                          type="url"
                          value={invoice.customQrUrl}
                          onChange={(e) => setInvoice({ ...invoice, customQrUrl: e.target.value })}
                          placeholder="https://rzp.io/l/your-link"
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[13px] font-mono text-[#1d1d1f] dark:text-[#f5f5f7]"
                        />
                      </div>
                    )}

                    {invoice.qrType === 'gst_einvoice' && (
                      <div className="text-[12px] text-[#6e6e73] dark:text-[#8e8e93] bg-white/70 dark:bg-[#1c1c1e]/70 p-3 rounded-xl border border-black/[0.04] space-y-1">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">✓ Official B2B GST e-Invoice Schema Active</div>
                        <p>
                          Encodes Seller GSTIN ({invoice.sellerGstin || '27AAACA0000A1Z5'}), Buyer GSTIN ({invoice.buyerGstin || 'Unregistered'}), Invoice No ({invoice.invoiceNo}), Invoice Date ({invoice.invoiceDate}), Total Value (₹{totals.grandTotal.toLocaleString('en-IN')}), and 64-character deterministic IRN hash for official verification.
                        </p>
                      </div>
                    )}

                    {/* QR Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button
                        type="button"
                        onClick={handleRegenerateQr}
                        className="px-3 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.06] transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isQrLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh QR</span>
                      </button>

                      {qrDataUrl && (
                        <>
                          <button
                            type="button"
                            onClick={handleDownloadQrPng}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 text-[12px] font-medium border border-emerald-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download QR (PNG)</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCopyUpiLink}
                            className="px-3 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.06] transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            {copiedUpi ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedUpi ? 'Copied URI' : 'Copy URI'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowRawPayload(!showRawPayload)}
                            className="px-3 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-[12px] font-medium text-[#6e6e73] dark:text-[#a1a1a6] border border-black/[0.06] transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{showRawPayload ? 'Hide Raw Data' : 'Inspect QR Data'}</span>
                          </button>
                        </>
                      )}
                    </div>

                    {showRawPayload && (
                      <div className="p-3 rounded-xl bg-black/90 text-emerald-400 font-mono text-[11px] break-all border border-emerald-500/30">
                        <span className="text-white/60 block text-[10px] mb-1 uppercase tracking-wider font-sans">Decoded QR Code Content:</span>
                        {generateQrPayload(invoice, totals.grandTotal)}
                      </div>
                    )}
                  </div>

                  {/* Live QR Code Preview Panel */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.08] dark:border-white/[0.1] text-center space-y-2.5 shadow-2xs">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Live Generated QR Code
                    </span>

                    {isQrLoading ? (
                      <div className="w-32 h-32 flex flex-col items-center justify-center text-[#86868b] text-[12px] gap-2 border border-dashed border-emerald-500/30 rounded-xl">
                        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                        <span>Generating...</span>
                      </div>
                    ) : qrDataUrl ? (
                      <>
                        <div className="relative group p-1.5 bg-white rounded-xl border border-black/[0.08] shadow-xs">
                          <img
                            src={qrDataUrl}
                            alt={invoice.qrType === 'upi' ? 'UPI payment QR code for invoice' : 'GST e-Invoice QR code payload'}
                            className="w-32 h-32 object-contain"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[12px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] block">
                            {invoice.qrType === 'upi' ? `₹${totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'GST e-Invoice'}
                          </span>
                          <span className="text-[10.5px] text-[#6e6e73] dark:text-[#8e8e93] block">
                            {invoice.qrType === 'upi' ? (invoice.upiVpa || 'merchant@upi') : 'Standard B2B payload'}
                          </span>
                          <button
                            type="button"
                            onClick={handleDownloadQrPng}
                            className="text-[11px] text-[#0071e3] dark:text-[#2997ff] hover:underline inline-flex items-center gap-1 pt-0.5 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Save PNG</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-32 h-32 flex flex-col items-center justify-center text-[#86868b] text-[11px] border border-dashed border-black/10 rounded-xl p-2">
                        <span>Click Refresh to generate</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FORM EDITOR MODE */}
            {viewMode === 'editor' && (
              <div className="space-y-6">
                {/* 1. Header Information & Parties */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08]">
                  {/* Seller Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        Seller Details (Billed By)
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#86868b] block mb-1">Company / Legal Entity Name</label>
                      <input
                        type="text"
                        value={invoice.sellerName}
                        onChange={(e) => setInvoice({ ...invoice, sellerName: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                        placeholder="Company Name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-[#86868b] block mb-1">Seller GSTIN (15 Digits)</label>
                        <input
                          type="text"
                          value={invoice.sellerGstin}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            const code = val.slice(0, 2);
                            const stateName = STATE_CODE_MAP[code] || '';
                            const found = INDIAN_GST_STATES.find(s => s.code === code);
                            setInvoice({
                              ...invoice,
                              sellerGstin: val,
                              sellerStateCode: code || invoice.sellerStateCode,
                              sellerState: found?.name || stateName || invoice.sellerState,
                            });
                          }}
                          maxLength={15}
                          className={`w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border text-[13px] font-mono text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors ${
                            invoice.sellerGstin
                              ? validateGstin(invoice.sellerGstin).valid
                                ? 'border-emerald-400 ring-1 ring-emerald-400/30'
                                : 'border-red-400 ring-1 ring-red-400/20'
                              : 'border-black/[0.08] dark:border-white/[0.1]'
                          }`}
                          placeholder="27AAACA1234A1Z5"
                        />
                        {invoice.sellerGstin && (
                          <p className={`text-[10.5px] mt-1 font-medium ${
                            validateGstin(invoice.sellerGstin).valid ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {validateGstin(invoice.sellerGstin).message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] text-[#86868b] block mb-1">State & State Code</label>
                        <select
                          value={invoice.sellerStateCode}
                          onChange={(e) => {
                            const found = INDIAN_GST_STATES.find((s) => s.code === e.target.value);
                            setInvoice({
                              ...invoice,
                              sellerStateCode: e.target.value,
                              sellerState: found?.name || invoice.sellerState,
                            });
                          }}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12.5px] text-[#1d1d1f] dark:text-[#f5f5f7]"
                        >
                          <option value="">Select State</option>
                          {INDIAN_GST_STATES.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.code} - {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#86868b] block mb-1">Complete Registered Address</label>
                      <textarea
                        value={invoice.sellerAddress}
                        onChange={(e) => setInvoice({ ...invoice, sellerAddress: e.target.value })}
                        rows={2}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12px] text-[#6e6e73] dark:text-[#8e8e93]"
                        placeholder="Street, City, Pin Code"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        value={invoice.sellerEmail}
                        onChange={(e) => setInvoice({ ...invoice, sellerEmail: e.target.value })}
                        placeholder="Email Address"
                        className="w-full p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12px]"
                      />
                      <input
                        type="text"
                        value={invoice.sellerPhone}
                        onChange={(e) => setInvoice({ ...invoice, sellerPhone: e.target.value })}
                        placeholder="Phone Number"
                        className="w-full p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12px]"
                      />
                    </div>
                  </div>

                  {/* Buyer Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        Buyer Details (Billed To)
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#86868b] block mb-1">Buyer / Client Business Name</label>
                      <input
                        type="text"
                        value={invoice.buyerName}
                        onChange={(e) => setInvoice({ ...invoice, buyerName: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                        placeholder="Client Company Name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-[#86868b] block mb-1">Buyer GSTIN (Optional)</label>
                        <input
                          type="text"
                          value={invoice.buyerGstin}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            const code = val.slice(0, 2);
                            const stateName = STATE_CODE_MAP[code] || '';
                            const found = INDIAN_GST_STATES.find(s => s.code === code);
                            setInvoice({
                              ...invoice,
                              buyerGstin: val,
                              buyerStateCode: code || invoice.buyerStateCode,
                              buyerState: found?.name || stateName || invoice.buyerState,
                              placeOfSupply: found ? `${found.name} (${code})` : invoice.placeOfSupply,
                            });
                          }}
                          maxLength={15}
                          className={`w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border text-[13px] font-mono text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors ${
                            invoice.buyerGstin
                              ? validateGstin(invoice.buyerGstin).valid
                                ? 'border-emerald-400 ring-1 ring-emerald-400/30'
                                : 'border-amber-400 ring-1 ring-amber-400/20'
                              : 'border-black/[0.08] dark:border-white/[0.1]'
                          }`}
                          placeholder="07BBBBB5678B2Z6 (or Unregistered)"
                        />
                        {invoice.buyerGstin && (
                          <p className={`text-[10.5px] mt-1 font-medium ${
                            validateGstin(invoice.buyerGstin).valid ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {validateGstin(invoice.buyerGstin).valid ? validateGstin(invoice.buyerGstin).message : 'Unregistered buyer or check GSTIN'}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] text-[#86868b] block mb-1">Place of Supply / State</label>
                        <select
                          value={invoice.buyerStateCode}
                          onChange={(e) => {
                            const found = INDIAN_GST_STATES.find((s) => s.code === e.target.value);
                            setInvoice({
                              ...invoice,
                              buyerStateCode: e.target.value,
                              buyerState: found?.name || invoice.buyerState,
                              placeOfSupply: `${found?.name || 'State'} (${e.target.value})`,
                            });
                          }}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12.5px] text-[#1d1d1f] dark:text-[#f5f5f7]"
                        >
                          <option value="">Select Buyer State</option>
                          {INDIAN_GST_STATES.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.code} - {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#86868b] block mb-1">Buyer Address</label>
                      <textarea
                        value={invoice.buyerAddress}
                        onChange={(e) => setInvoice({ ...invoice, buyerAddress: e.target.value })}
                        rows={2}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12px] text-[#6e6e73] dark:text-[#8e8e93]"
                        placeholder="Street, City, State"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        value={invoice.buyerEmail}
                        onChange={(e) => setInvoice({ ...invoice, buyerEmail: e.target.value })}
                        placeholder="Buyer Contact Email"
                        className="w-full p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12px]"
                      />
                      <input
                        type="text"
                        value={invoice.buyerPhone}
                        onChange={(e) => setInvoice({ ...invoice, buyerPhone: e.target.value })}
                        placeholder="Buyer Phone"
                        className="w-full p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Invoice Meta Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08]">
                  <div>
                    <label className="text-[11.5px] font-semibold text-[#86868b] block mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={invoice.invoiceNo}
                      onChange={(e) => setInvoice({ ...invoice, invoiceNo: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[13px] font-mono font-bold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-[#86868b] block mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={invoice.invoiceDate}
                      onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]"
                    />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-[#86868b] block mb-1">Payment Due Date</label>
                    <input
                      type="date"
                      value={invoice.dueDate}
                      onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]"
                    />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-semibold text-[#86868b] block mb-1">PO / Ref Number</label>
                    <input
                      type="text"
                      value={invoice.poNumber || ''}
                      onChange={(e) => setInvoice({ ...invoice, poNumber: e.target.value })}
                      placeholder="e.g. PO-894"
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]"
                    />
                  </div>
                </div>

                {/* 3. Line Items Table */}
                <div className="space-y-3 p-6 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[14.5px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        Goods & Services Line Items
                      </h3>
                      <p className="text-[12px] text-[#86868b]">
                        Tax breakdown: {totals.isInterstate ? 'Inter-state Supply (IGST Applicable)' : 'Intra-state Supply (CGST 50% + SGST 50%)'}
                      </p>
                    </div>

                    <button
                      onClick={handleAddItem}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Line Item</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12.5px] border-collapse">
                      <thead>
                        <tr className="border-b border-black/[0.08] dark:border-white/[0.1] text-[#86868b] font-semibold">
                          <th className="pb-2 pl-2">Description</th>
                          <th className="pb-2 w-24">HSN/SAC</th>
                          <th className="pb-2 w-16">Qty</th>
                          <th className="pb-2 w-20">Unit</th>
                          <th className="pb-2 w-28">Rate (₹)</th>
                          <th className="pb-2 w-16">Disc %</th>
                          <th className="pb-2 w-24">GST Rate</th>
                          <th className="pb-2 w-28 text-right pr-2">Taxable Total</th>
                          <th className="pb-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                        {invoice.items.map((item, index) => {
                          const raw = item.qty * item.rate;
                          const disc = (raw * (item.discountPct || 0)) / 100;
                          const taxable = raw - disc;
                          return (
                            <tr key={item.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                              <td className="py-2.5 pr-2">
                                <input
                                  type="text"
                                  value={item.desc}
                                  onChange={(e) => handleUpdateItem(index, 'desc', e.target.value)}
                                  className="w-full p-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-[13px] font-medium"
                                  placeholder="Item name & description"
                                />
                              </td>
                              <td className="py-2.5 pr-2 relative">
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={item.hsn}
                                    onChange={(e) => handleUpdateItem(index, 'hsn', e.target.value)}
                                    onFocus={() => setShowHsnSelector(index)}
                                    className="w-full p-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-[12px] font-mono text-[#6e6e73] cursor-pointer"
                                    placeholder="998314"
                                    readOnly
                                  />
                                  {showHsnSelector === index && (
                                    <div className="absolute top-full left-0 z-50 mt-1 w-72 bg-white dark:bg-[#1c1c1e] border border-black/[0.12] dark:border-white/[0.12] rounded-xl shadow-2xl overflow-hidden">
                                      <div className="px-3 py-2 bg-[#fafafc] dark:bg-[#252528] border-b border-black/[0.06] dark:border-white/[0.06]">
                                        <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-wide">Common HSN / SAC Codes</p>
                                      </div>
                                      <div className="max-h-48 overflow-y-auto">
                                        {COMMON_HSN_CODES.map((code) => (
                                          <button
                                            key={code.hsn}
                                            type="button"
                                            onClick={() => {
                                              handleUpdateItem(index, 'hsn', code.hsn);
                                              handleUpdateItem(index, 'gstRate', code.defaultGstRate);
                                              if (!item.desc || item.desc === 'Professional Services / Line Item') {
                                                handleUpdateItem(index, 'desc', code.description);
                                              }
                                              setShowHsnSelector(null);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-[#fafafc] dark:hover:bg-[#252528] transition-colors border-b border-black/[0.04] dark:border-white/[0.04] last:border-0"
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="font-mono text-[11px] font-bold text-[#0071e3] dark:text-[#2997ff] shrink-0">{code.hsn}</span>
                                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">{code.defaultGstRate}% GST</span>
                                            </div>
                                            <p className="text-[11px] text-[#6e6e73] dark:text-[#8e8e93] mt-0.5 leading-tight">{code.description}</p>
                                          </button>
                                        ))}
                                      </div>
                                      <div className="px-3 py-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                                        <button
                                          type="button"
                                          onClick={() => setShowHsnSelector(null)}
                                          className="w-full text-[11px] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors cursor-pointer"
                                        >
                                          Or type custom HSN manually — Close
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="py-2.5 pr-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => handleUpdateItem(index, 'qty', Number(e.target.value))}
                                  className="w-full p-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-[13px] text-center"
                                />
                              </td>
                              <td className="py-2.5 pr-2">
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                                  className="w-full p-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-[12px] text-center"
                                  placeholder="Nos"
                                />
                              </td>
                              <td className="py-2.5 pr-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.rate}
                                  onChange={(e) => handleUpdateItem(index, 'rate', Number(e.target.value))}
                                  className="w-full p-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-[13px] font-mono font-semibold"
                                />
                              </td>
                              <td className="py-2.5 pr-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.discountPct}
                                  onChange={(e) => handleUpdateItem(index, 'discountPct', Number(e.target.value))}
                                  className="w-full p-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-[12px] text-center"
                                />
                              </td>
                              <td className="py-2.5 pr-2">
                                <select
                                  value={item.gstRate}
                                  onChange={(e) => handleUpdateItem(index, 'gstRate', Number(e.target.value))}
                                  className="w-full p-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-[12px] font-bold text-emerald-600"
                                >
                                  <option value="0">0% (Nil)</option>
                                  <option value="5">5% (2.5+2.5)</option>
                                  <option value="12">12% (6+6)</option>
                                  <option value="18">18% (9+9)</option>
                                  <option value="28">28% (14+14)</option>
                                </select>
                              </td>
                              <td className="py-2.5 pr-2 text-right font-mono font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                                ₹{taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 text-center">
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  disabled={invoice.items.length <= 1}
                                  className="text-[#ff3b30] hover:opacity-80 p-1 disabled:opacity-30 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Bank Details & Calculations Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08]">
                  {/* Bank Info */}
                  <div className="space-y-3">
                    <span className="text-[12px] font-bold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      Bank Account & Settlement Details
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-[#86868b] block mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={invoice.bankName}
                          onChange={(e) => setInvoice({ ...invoice, bankName: e.target.value })}
                          className="w-full p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12.5px]"
                          placeholder="HDFC Bank"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#86868b] block mb-1">Account Number</label>
                        <input
                          type="text"
                          value={invoice.accountNo}
                          onChange={(e) => setInvoice({ ...invoice, accountNo: e.target.value })}
                          className="w-full p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12.5px] font-mono"
                          placeholder="50200012345678"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-[#86868b] block mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={invoice.ifscCode}
                          onChange={(e) => setInvoice({ ...invoice, ifscCode: e.target.value.toUpperCase() })}
                          className="w-full p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12.5px] font-mono"
                          placeholder="HDFC0000123"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#86868b] block mb-1">Branch Name</label>
                        <input
                          type="text"
                          value={invoice.branch}
                          onChange={(e) => setInvoice({ ...invoice, branch: e.target.value })}
                          className="w-full p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12.5px]"
                          placeholder="BKC Branch"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#86868b] block mb-1">Authorized Signatory Name</label>
                      <input
                        type="text"
                        value={invoice.signatoryName}
                        onChange={(e) => setInvoice({ ...invoice, signatoryName: e.target.value })}
                        className="w-full p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12.5px]"
                        placeholder="Authorized Signatory"
                      />
                    </div>
                  </div>

                  {/* Calculations Table */}
                  <div className="space-y-2.5 p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-[13px]">
                    <div className="flex justify-between text-[#6e6e73] dark:text-[#8e8e93]">
                      <span>Taxable Value (Subtotal):</span>
                      <span className="font-semibold font-mono text-[#1d1d1f] dark:text-[#f5f5f7]">
                        ₹{totals.taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {totals.isInterstate ? (
                      <div className="flex justify-between text-[#6e6e73] dark:text-[#8e8e93]">
                        <span>Integrated GST (IGST):</span>
                        <span className="font-semibold font-mono text-emerald-600">
                          ₹{totals.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-[#6e6e73] dark:text-[#8e8e93]">
                          <span>Central GST (CGST):</span>
                          <span className="font-semibold font-mono text-emerald-600">
                            ₹{totals.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-[#6e6e73] dark:text-[#8e8e93]">
                          <span>State GST (SGST):</span>
                          <span className="font-semibold font-mono text-emerald-600">
                            ₹{totals.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between text-[#6e6e73] dark:text-[#8e8e93] border-t border-black/[0.04] pt-2">
                      <span>Total Tax Amount:</span>
                      <span className="font-semibold font-mono text-emerald-600">
                        ₹{totals.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {totals.roundOff !== 0 && (
                      <div className="flex justify-between text-[12px] text-[#86868b]">
                        <span>Round Off:</span>
                        <span className="font-mono">{totals.roundOff > 0 ? `+${totals.roundOff}` : totals.roundOff}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t border-black/[0.08] dark:border-white/[0.1] text-[16px] font-bold text-emerald-700 dark:text-emerald-400">
                      <span>Grand Total (INR):</span>
                      <span className="font-mono">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="pt-2 text-[11.5px] text-[#86868b] italic border-t border-black/[0.04]">
                      {wordsTotal}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW MODE (OFFICIAL A4 PRINTABLE TAX INVOICE) */}
            {viewMode === 'preview' && (
              <div
                id="gst-printable-invoice"
                className="max-w-3xl mx-auto bg-white text-[#1d1d1f] p-8 sm:p-10 rounded-2xl border border-black/[0.15] shadow-md font-sans space-y-6"
              >
                {/* Top Title Banner */}
                <div className="text-center pb-4 border-b-2 border-emerald-600 space-y-1">
                  <h1 className="text-2xl font-extrabold tracking-tight text-emerald-800 uppercase">
                    {invoice.invoiceType || 'TAX INVOICE'}
                  </h1>
                  <p className="text-[11px] text-[#6e6e73]">
                    (Issued under Section 31 of CGST Act, 2017 & Rule 46 of CGST Rules, 2017)
                  </p>
                </div>

                {/* Seller & Invoice Meta */}
                <div className="grid grid-cols-2 gap-6 pb-4 border-b border-black/[0.1] text-[12.5px]">
                  {/* Seller info */}
                  <div className="space-y-1">
                    <h2 className="text-[14px] font-bold text-[#1d1d1f]">{invoice.sellerName}</h2>
                    <p className="text-[#6e6e73] whitespace-pre-line text-[11.5px] leading-relaxed">{invoice.sellerAddress}</p>
                    <p className="font-bold text-[12px] pt-1">GSTIN / UIN: <span className="font-mono text-emerald-800">{invoice.sellerGstin}</span></p>
                    <p className="text-[#6e6e73] text-[11.5px]">State Name: <span className="font-semibold text-[#1d1d1f]">{invoice.sellerState} (Code: {invoice.sellerStateCode})</span></p>
                    {invoice.sellerEmail && <p className="text-[#6e6e73] text-[11px]">Email: {invoice.sellerEmail} | Phone: {invoice.sellerPhone}</p>}
                  </div>

                  {/* Invoice Meta Table */}
                  <div className="bg-[#f9fafb] p-3.5 rounded-xl border border-black/[0.08] space-y-1.5 text-[12px]">
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6e6e73]">Invoice Number:</span>
                      <span className="font-mono font-bold text-[#1d1d1f]">{invoice.invoiceNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6e6e73]">Invoice Date:</span>
                      <span>{invoice.invoiceDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6e6e73]">Due Date:</span>
                      <span>{invoice.dueDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6e6e73]">Place of Supply:</span>
                      <span className="font-semibold">{invoice.placeOfSupply}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6e6e73]">Reverse Charge:</span>
                      <span>{invoice.reverseCharge ? 'YES' : 'NO'}</span>
                    </div>
                  </div>
                </div>

                {/* Buyer / Consignee */}
                <div className="p-3.5 rounded-xl bg-[#f0fdf4] border border-emerald-600/20 space-y-1 text-[12px]">
                  <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider block">
                    DETAILS OF RECEIVER / BILLED TO:
                  </span>
                  <div className="flex justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-[13.5px] font-bold text-[#1d1d1f]">{invoice.buyerName}</h3>
                      <p className="text-[#6e6e73] whitespace-pre-line text-[11.5px]">{invoice.buyerAddress}</p>
                    </div>
                    <div className="text-right text-[11.5px] space-y-0.5">
                      <p>Buyer GSTIN: <span className="font-mono font-bold text-[#1d1d1f]">{invoice.buyerGstin || 'Unregistered'}</span></p>
                      <p>State: <span className="font-semibold">{invoice.buyerState} (Code: {invoice.buyerStateCode})</span></p>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-hidden rounded-xl border border-black/[0.12]">
                  <table className="w-full text-left text-[11.5px] border-collapse">
                    <thead>
                      <tr className="bg-emerald-800 text-white font-bold">
                        <th className="p-2.5 text-center w-8">#</th>
                        <th className="p-2.5">Description of Goods / Services</th>
                        <th className="p-2.5 text-center w-16">HSN/SAC</th>
                        <th className="p-2.5 text-center w-14">Qty</th>
                        <th className="p-2.5 text-right w-20">Rate (₹)</th>
                        <th className="p-2.5 text-center w-14">GST %</th>
                        <th className="p-2.5 text-right w-24">Taxable Amt (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.06]">
                      {invoice.items.map((item, idx) => {
                        const raw = item.qty * item.rate;
                        const disc = (raw * (item.discountPct || 0)) / 100;
                        const taxable = raw - disc;
                        return (
                          <tr key={item.id} className="odd:bg-white even:bg-[#fafafa]">
                            <td className="p-2.5 text-center font-bold text-[#6e6e73]">{idx + 1}</td>
                            <td className="p-2.5 font-semibold text-[#1d1d1f]">{item.desc}</td>
                            <td className="p-2.5 text-center font-mono text-[#6e6e73]">{item.hsn}</td>
                            <td className="p-2.5 text-center">{item.qty} {item.unit}</td>
                            <td className="p-2.5 text-right font-mono">{item.rate.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-center font-bold text-emerald-700">{item.gstRate}%</td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              {taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* HSN Summary & Tax Breakdown */}
                <div className="grid grid-cols-12 gap-4 items-start pt-2">
                  {/* Left: QR Code & Bank Info */}
                  <div className="col-span-7 space-y-3">
                    {invoice.includeQrCode ? (
                      <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#fafafa] border border-black/[0.08]">
                        {qrDataUrl ? (
                          <div className="shrink-0 relative group">
                            <img
                              src={qrDataUrl}
                              alt="Printable invoice payment QR code"
                              className="w-22 h-22 object-contain rounded border border-black/[0.08] bg-white p-0.5 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={handleDownloadQrPng}
                              title="Download QR PNG"
                              className="absolute -bottom-1.5 -right-1.5 p-1 bg-emerald-600 text-white rounded-full shadow-xs hover:bg-emerald-700 cursor-pointer transition-transform group-hover:scale-110"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-22 h-22 flex flex-col items-center justify-center rounded border border-dashed border-emerald-500/40 bg-emerald-50 text-[10px] text-emerald-800 text-center p-1 shrink-0">
                            <RefreshCw className="w-4 h-4 animate-spin mb-1 text-emerald-600" />
                            <span>Generating QR...</span>
                          </div>
                        )}
                        <div className="space-y-0.5 text-[11px] flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#1d1d1f]">
                              {invoice.qrType === 'upi' ? '⚡ Instant UPI Payment QR' : 'Official GST e-Invoice QR'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setInvoice({ ...invoice, includeQrCode: false })}
                              className="text-[10px] text-[#86868b] hover:text-red-500 underline cursor-pointer"
                            >
                              Remove QR
                            </button>
                          </div>
                          <p className="text-[#6e6e73]">
                            Scan with GPay, PhonePe, Paytm, Cred or BHIM app to settle ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          {invoice.qrType === 'upi' && (
                            <p className="font-mono text-[10.5px] text-emerald-700 font-semibold">{invoice.upiVpa || 'merchant@upi'}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 rounded-xl border border-dashed border-black/[0.1] bg-[#fafafa] text-[11.5px] text-[#6e6e73]">
                        <span>No QR Code on this invoice.</span>
                        <button
                          type="button"
                          onClick={() => setInvoice({ ...invoice, includeQrCode: true })}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-semibold cursor-pointer shadow-2xs transition-colors"
                        >
                          + Add Dynamic QR Code
                        </button>
                      </div>
                    )}

                    {/* Bank Details */}
                    <div className="p-3 rounded-xl bg-[#fafafa] border border-black/[0.08] text-[11px] space-y-1">
                      <span className="font-bold text-[#1d1d1f] block">Bank Account Details:</span>
                      <p>Bank: <span className="font-semibold">{invoice.bankName}</span> | A/C No: <span className="font-mono font-bold">{invoice.accountNo}</span></p>
                      <p>IFSC: <span className="font-mono font-bold">{invoice.ifscCode}</span> | Branch: <span>{invoice.branch}</span></p>
                    </div>
                  </div>

                  {/* Right: Calculations */}
                  <div className="col-span-5 space-y-2 text-[12px]">
                    <div className="flex justify-between text-[#6e6e73]">
                      <span>Taxable Amount:</span>
                      <span className="font-mono font-semibold text-[#1d1d1f]">₹{totals.taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {totals.isInterstate ? (
                      <div className="flex justify-between text-[#6e6e73]">
                        <span>IGST (Integrated Tax):</span>
                        <span className="font-mono font-semibold text-emerald-800">₹{totals.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-[#6e6e73]">
                          <span>CGST (Central Tax):</span>
                          <span className="font-mono font-semibold text-emerald-800">₹{totals.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[#6e6e73]">
                          <span>SGST (State Tax):</span>
                          <span className="font-mono font-semibold text-emerald-800">₹{totals.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    )}

                    {totals.roundOff !== 0 && (
                      <div className="flex justify-between text-[#86868b] text-[11px]">
                        <span>Round Off:</span>
                        <span className="font-mono">{totals.roundOff}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t-2 border-emerald-800 text-[15px] font-bold text-emerald-900 bg-emerald-50/50 p-2 rounded-lg">
                      <span>Total (INR):</span>
                      <span className="font-mono">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Amount in words */}
                <div className="p-2.5 rounded-lg bg-[#fafafa] border border-black/[0.06] text-[11.5px] font-semibold text-[#1d1d1f]">
                  Amount in words: <span className="italic font-normal">{wordsTotal}</span>
                </div>

                {/* Footer Terms & Signatory */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-black/[0.1] text-[10.5px]">
                  <div className="space-y-1">
                    <span className="font-bold text-[#1d1d1f] block">Terms & Conditions:</span>
                    <p className="text-[#6e6e73] whitespace-pre-line leading-relaxed">{invoice.terms}</p>
                  </div>
                  <div className="text-right space-y-6 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-[#1d1d1f] block">For {invoice.sellerName.toUpperCase()}</span>
                      <span className="text-[#86868b] text-[10px]">Authorized Signature</span>
                    </div>
                    <div className="border-t border-black/20 pt-1">
                      <span className="font-semibold text-[#1d1d1f]">{invoice.signatoryName}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. POS BILLING SLIP */}
        {/* ========================================================================= */}
        {activeSubTool === 'pos_billing' && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-200">
            {/* POS Settings */}
            <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
              <span className="text-[12px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Thermal Receipt Settings
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={posStoreName}
                  onChange={(e) => setPosStoreName(e.target.value)}
                  placeholder="Store Name"
                  className="p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] text-[12px]"
                />
                <input
                  type="text"
                  value={posUpiVpa}
                  onChange={(e) => setPosUpiVpa(e.target.value)}
                  placeholder="UPI ID (VPA)"
                  className="p-2 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] text-[12px] font-mono"
                />
              </div>
            </div>

            {/* Thermal POS Slip */}
            <div className="p-6 rounded-3xl bg-white text-black font-mono text-[12.5px] space-y-4 shadow-md border border-black/[0.1]">
              <div className="text-center space-y-1">
                <h3 className="text-[16px] font-bold tracking-wider uppercase">{posStoreName}</h3>
                <p className="text-[11px] text-neutral-500">TAX INVOICE / POS RECEIPT</p>
                <p className="text-[10.5px] text-neutral-500">{new Date().toLocaleString()}</p>
              </div>

              <div className="border-t border-b border-dashed border-neutral-400 py-3 space-y-2">
                {posItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.qty}x {item.name}</span>
                    <span className="font-bold">₹{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right">
                <div className="flex justify-between font-extrabold text-[15px]">
                  <span>TOTAL AMOUNT:</span>
                  <span>₹{posItems.reduce((acc, i) => acc + i.price * i.qty, 0).toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-neutral-500">Includes CGST + SGST</p>
              </div>

              {posIncludeQr && posQrDataUrl && (
                <div className="pt-2 text-center space-y-2 border-t border-dashed border-neutral-300">
                  <img
                    src={posQrDataUrl}
                    alt="POS thermal receipt quick checkout UPI QR code"
                    className="w-28 h-28 mx-auto p-1 bg-white border border-neutral-300 rounded-lg"
                  />
                  <p className="text-[11px] font-bold">Scan to Pay via Any UPI App</p>
                  <p className="text-[10px] text-neutral-500">{posUpiVpa}</p>
                </div>
              )}

              <div className="text-center text-[10px] text-neutral-500 pt-2">
                *** THANK YOU FOR VISITING ***
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. GST FILING PREP */}
        {/* ========================================================================= */}
        {activeSubTool === 'gst_filing_prep' && (
          <div className="space-y-6 p-6 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] animate-in fade-in duration-200">
            <div>
              <h3 className="text-[16px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                GSTR-1 & GSTR-3B Tax Filing Summary Worksheet
              </h3>
              <p className="text-[12.5px] text-[#86868b] mt-0.5">
                Aggregated HSN summary and output tax liability ready for GST Portal export
              </p>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08]">
                <span className="text-[11.5px] text-[#86868b]">Total Taxable Turnover</span>
                <p className="text-xl font-bold font-mono text-[#1d1d1f] dark:text-[#f5f5f7] mt-1">
                  ₹{totals.taxableSubtotal.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08]">
                <span className="text-[11.5px] text-[#86868b]">Output CGST</span>
                <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                  ₹{totals.cgstTotal.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08]">
                <span className="text-[11.5px] text-[#86868b]">Output SGST</span>
                <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                  ₹{totals.sgstTotal.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08]">
                <span className="text-[11.5px] text-[#86868b]">Output IGST</span>
                <p className="text-xl font-bold font-mono text-blue-600 mt-1">
                  ₹{totals.igstTotal.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* HSN Summary Table */}
            <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden bg-white dark:bg-[#1c1c1e]">
              <div className="p-3.5 bg-[#f5f5f7] dark:bg-[#28282b] border-b border-black/[0.06] dark:border-white/[0.08] font-bold text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                Table 12: HSN-wise Summary of Outward Supplies (GSTR-1)
              </div>
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead>
                  <tr className="border-b border-black/[0.06] text-[#86868b] font-semibold">
                    <th className="p-3">HSN/SAC Code</th>
                    <th className="p-3">Taxable Value</th>
                    <th className="p-3">GST Rate</th>
                    <th className="p-3">CGST Amount</th>
                    <th className="p-3">SGST Amount</th>
                    <th className="p-3">IGST Amount</th>
                    <th className="p-3 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] font-mono">
                  {totals.hsnSummary.map((h, i) => (
                    <tr key={i} className="hover:bg-black/[0.01]">
                      <td className="p-3 font-bold">{h.hsn}</td>
                      <td className="p-3">₹{h.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-emerald-600 font-bold">{h.gstRate}%</td>
                      <td className="p-3">₹{h.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3">₹{h.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3">₹{h.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        ₹{h.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
