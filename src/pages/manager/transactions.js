import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaSearch,
  FaFileInvoice,
  FaReceipt,
  FaMoneyBillWave,
  FaChartBar,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaBox,
  FaEye,
  FaCalendarAlt,
  FaCreditCard,
  FaEdit,
  FaPrint,
  FaDownload,
  FaEnvelope
} from 'react-icons/fa';
import './manager-layout.css';
import './transactions.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getPayments, updatePaymentStatus, getSpareParts, apiRequest, deletePayment, updatePaymentDetails } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import { PageLoader } from '../../components/LoadingSpinner';

function ManagerTransactions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // Default to 'All' so all payments from the database are visible initially
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editableItems, setEditableItems] = useState([]);
  const [discountValue, setDiscountValue] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [spareparts, setSpareparts] = useState([]);
  const [newSpareSearch, setNewSpareSearch] = useState('');
  const [newSpareQuantity, setNewSpareQuantity] = useState('');
  const [showNewSpareDropdown, setShowNewSpareDropdown] = useState(false);
  const [selectedNewSpareId, setSelectedNewSpareId] = useState('');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveAmountInput, setReceiveAmountInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState('');
  const [splitCashInput, setSplitCashInput] = useState('');
  const [splitBankInput, setSplitBankInput] = useState('');
  const [splitAirtelInput, setSplitAirtelInput] = useState('');
  const [splitMpesaInput, setSplitMpesaInput] = useState('');
  const [splitYasInput, setSplitYasInput] = useState('');
  const [sparepartIdInput, setSparepartIdInput] = useState('');
  const [receiveSaving, setReceiveSaving] = useState(false);
  const receiveSaveInFlightRef = useRef(false);

  const normalizePriceType = (value) => String(value || '').trim().toLowerCase();
  const getSparePriceByType = (spare, priceType) => {
    const type = normalizePriceType(priceType);
    const retail = parseFloat(spare?.retail_price);
    const wholesale = parseFloat(spare?.wholesale_price);
    if (type === 'wholesale') {
      if (Number.isFinite(wholesale)) return wholesale;
      if (Number.isFinite(retail)) return retail;
      return 0;
    }
    // Default to retail for retail/empty/unknown price types.
    if (Number.isFinite(retail)) return retail;
    if (Number.isFinite(wholesale)) return wholesale;
    return 0;
  };

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const allowed =
          parsedUser.userType === 'admin' ||
          (parsedUser.userType === 'employee' &&
            (parsedUser.department === 'Manager' || parsedUser.department === 'Administration'));
        if (!allowed) {
          setLoading(false);
          navigate('/login');
          return;
        }
      } catch (error) {
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
    } else {
      setLoading(false);
      setTimeout(() => navigate('/login'), 1000);
      return;
    }

    // Load transactions from database (payments table) via GET /api/payments
    const loadPayments = async () => {
      try {
        const response = await getPayments();
        if (response.success && response.payments) setPayments(response.payments);
      } catch (error) {
        console.error('Error loading payments:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load transactions.',
          confirmButtonColor: '#511C00'
        });
      } finally {
        setLoading(false);
      }
    };

    // Load spare parts for add-spare-part input in modal
    const loadSpareparts = async () => {
      try {
        const response = await getSpareParts();
        if (response.success && response.spareParts) {
          setSpareparts(response.spareParts);
        }
      } catch (error) {
        console.error('Error loading spare parts for manager transactions:', error);
      }
    };

    loadPayments();
    loadSpareparts();

    const t = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(t);
  }, [navigate]);

  // Load logo as data URL for printing (same approach as sales/payments)
  useEffect(() => {
    if (typeof logo !== 'string' || !logo) return;
    const src = logo.startsWith('http')
      ? logo
      : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo);
    fetch(src)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => setLogoDataUrl(reader.result);
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Logout',
      text: 'Are you sure you want to logout?',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatWithCommas = (val) => {
    const s = String(val || '').replace(/[^\d.]/g, '');
    if (!s) return '';
    const parts = s.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? intPart + '.' + parts[1].slice(0, 2) : intPart;
  };

  const parseCommaNumber = (val) => {
    const s = String(val || '').replace(/,/g, '');
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  };

  function mergePaymentChannelTotals(payment, paymentMethod, addAmount) {
    const add = Number(addAmount) || 0;
    let cash = Number(payment.cash) || 0;
    let bank_transfer = Number(payment.bank_transfer) || 0;
    let airtel_money = Number(payment.airtel_money) || 0;
    let mpesa = Number(payment.mpesa) || 0;
    let mix_by_yas = Number(payment.mix_by_yas) || 0;
    const m = String(paymentMethod || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    if (m === 'cash') cash += add;
    else if (m === 'bank transfer') bank_transfer += add;
    else if (m === 'airtel money') airtel_money += add;
    else if (m === 'm-pesa' || m === 'mpesa') mpesa += add;
    else if (m.includes('mix') && m.includes('yas')) mix_by_yas += add;
    return { cash, bank_transfer, airtel_money, mpesa, mix_by_yas };
  }

  const getAmountRemain = (p) => {
    const dbRemain = p?.amount_remain != null ? Number(p.amount_remain) : null;
    if (dbRemain != null && !Number.isNaN(dbRemain)) return dbRemain;
    const total = getPaymentTotalAmount(p);
    const received = Number(p?.amount_received) || 0;
    return Math.max(0, total - received);
  };

  // Helpers for printable invoice (same style as sales/payments)
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-TZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDateInvoice = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const numberToWords = (n) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const num = Math.floor(parseFloat(n) || 0);
    if (num === 0) return 'Zero';
    const g = (x) => {
      if (x < 20) return ones[x];
      if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
      return ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + g(x % 100) : '');
    };
    if (num < 1000) return g(num);
    if (num < 1000000) return g(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + g(num % 1000) : '');
    if (num < 1000000000) return g(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + numberToWords(num % 1000000) : '');
    return g(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 ? ' ' + numberToWords(num % 1000000000) : '');
  };

  // Calculate total amount from price × quantity, minus any stored discount_amount.
  // Uses items if present, else single line (quantity * unit_price or total_amount from DB).
  const getPaymentTotalAmount = (payment) => {
    if (!payment) return 0;

    let baseTotal;

    if (payment.items && payment.items.length > 0) {
      baseTotal = payment.items.reduce((sum, item) => {
        const qty = parseInt(item.quantity, 10) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const lineTotal = parseFloat(item.total_amount);
        const safeLineTotal = Number.isFinite(lineTotal) ? lineTotal : qty * unitPrice;
        return sum + safeLineTotal;
      }, 0);
    } else {
      const qty = parseInt(payment.quantity, 10) || 0;
      const unitPrice = parseFloat(payment.unit_price) || 0;
      const fromDb = parseFloat(payment.total_amount);
      baseTotal = Number.isFinite(fromDb) ? fromDb : qty * unitPrice;
    }

    const discount = parseFloat(payment.discount_amount) || 0;
    return Math.max(0, baseTotal - discount);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  };

  // Build simple printable HTML for a single transaction row
  // Build printable invoice / receipt HTML identical in style to sales/payments.js
  const getPrintHtml = (payment, mode = 'invoice') => {
    if (!payment) return '';

    const isReceipt = mode === 'receipt';
    const totalAmount = (() => {
      if (payment.items && payment.items.length > 0) {
        return payment.items.reduce((sum, item) => {
          const qty = Number(item.quantity) || 0;
          const unit = Number(item.unit_price) || 0;
          const itemTotal =
            item.total_amount != null && item.total_amount !== undefined
              ? Number(item.total_amount) || 0
              : qty * unit;
          return sum + itemTotal;
        }, 0);
      }
      const qty = Number(payment.quantity) || 0;
      const unit = Number(payment.unit_price) || 0;
      return qty * unit;
    })();

    const dateStr = formatDateInvoice(payment.created_at);
    const trnNo = '182-150-770';
    const invNum = `${isReceipt ? 'RCPT' : 'PAY'}-${payment.id}`;
    const customerName = (payment.customer_name || '—').toUpperCase().replace(/</g, '&lt;');
    const customerPhone = (payment.customer_phone || '—').replace(/</g, '&lt;');

    let items = [];
    if (payment.items && payment.items.length > 0) {
      items = payment.items;
    } else {
      items = [{
        part_name: payment.sparepart_name || '—',
        part_number: payment.sparepart_number || '—',
        quantity: payment.quantity || 1,
        unit_price: payment.unit_price || 0,
        total_amount: parseFloat(payment.unit_price || 0) * (parseInt(payment.quantity || 1, 10) || 1)
      }];
    }

    const hasItems = items.length > 0;
    const subTotal = hasItems
      ? items.reduce((s, it) => s + (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity, 10) || 1), 0)
      : totalAmount;
    const discountAmt = parseFloat(payment.discount_amount) || 0;
    const totalAmountFinal = Math.max(0, subTotal - discountAmt);
    let amountReceived = Number(payment.amount_received) || 0;
    let amountRemain = Math.max(0, totalAmountFinal - amountReceived);

    // Human-readable label for printed "Amount received by ..." row
    const rawPaymentMethod = String(payment.payment_method || '').trim();
    const normalizedPaymentMethod = rawPaymentMethod.toLowerCase();
    const paymentMethodLabel = (() => {
      if (!rawPaymentMethod) return '—';
      if (normalizedPaymentMethod.includes('cash')) return 'Cash';
      if (normalizedPaymentMethod.includes('bank')) return 'Bank';
      if (normalizedPaymentMethod.includes('airtel')) return 'Airtel money';
      if (/m\s*-?\s*pesa/.test(normalizedPaymentMethod)) return 'M -pesa';
      if (normalizedPaymentMethod.includes('mix') || normalizedPaymentMethod.includes('yas')) return 'Mix by Yas';
      return rawPaymentMethod;
    })();

    const cashBreakdown = Number(payment?.cash) || 0;
    const bankBreakdown = Number(payment?.bank_transfer) || 0;
    const airtelBreakdown = Number(payment?.airtel_money) || 0;
    const mpesaBreakdown = Number(payment?.mpesa) || 0;
    const yasBreakdown = Number(payment?.mix_by_yas) || 0;

    const channelSegments = [
      { label: 'cash', value: cashBreakdown },
      { label: 'bank transfer', value: bankBreakdown },
      { label: 'Airtel money', value: airtelBreakdown },
      { label: 'M -pesa', value: mpesaBreakdown },
      { label: 'Mix by Yas', value: yasBreakdown },
    ].filter((s) => Number(s.value) > 0);

    const isMultiMethodTransaction = channelSegments.length > 1;
    const totalFromChannels = channelSegments.reduce((sum, s) => sum + Number(s.value || 0), 0);

    const amountReceivedRowLabel = isMultiMethodTransaction
      ? channelSegments
          .map((s, idx) =>
            idx === 0
              ? `Amount received by ${s.label}: ${formatCurrency(s.value)}`
              : `and amount received by ${s.label}: ${formatCurrency(s.value)}`
          )
          .join(' ')
      : `Amount received by ${paymentMethodLabel}`;

    if (isMultiMethodTransaction) {
      amountReceived = totalFromChannels > 0 ? totalFromChannels : amountReceived;
      amountRemain = Math.max(0, totalAmountFinal - amountReceived);
    }

    const logoUrl = typeof logo === 'string' && logo
      ? (logo.startsWith('http') ? logo : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo))
      : '';
    const logoSrc = logoDataUrl || logoUrl;
    const logoImg = logoSrc ? `<img src="${String(logoSrc).replace(/"/g, '&quot;')}" alt="Logo" class="tax-inv-logo" />` : '';

    const itemRows = hasItems
      ? items.map((it, i) => {
          const qty = parseInt(it.quantity, 10) || 1;
          const rate = parseFloat(it.unit_price) || 0;
          const amount = rate * qty;
          return `<tr>
            <td class="tc">${i + 1}</td>
            <td>${(it.part_name || it.sparepart_name || '—').replace(/</g, '&lt;')}</td>
            <td>${String(it.part_number || it.sparepart_number || '—').toUpperCase().replace(/</g, '&lt;')}</td>
            <td class="tr">${qty}</td>
            <td class="tr">${formatCurrency(rate)}</td>
            <td>PCS</td>
            <td class="tr">${formatCurrency(amount)}</td>
            <td class="tr">${formatCurrency(amount)}</td>
          </tr>`;
        }).join('')
      : `<tr>
          <td class="tc">1</td>
          <td>—</td>
          <td>—</td>
          <td class="tr">1</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
          <td>PCS</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
        </tr>`;

    const amountInWords = numberToWords(Math.floor(totalAmountFinal)) + ' TZS Only';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${isReceipt ? 'Receipt' : 'Invoice'} ${invNum}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color: #222; font-size: 11px; line-height: 1.4; }
    .tax-inv-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #333; }
    .tax-inv-left { display: flex; align-items: flex-start; gap: 20px; flex: 1; }
    .tax-inv-logo { max-height: 60px; max-width: 140px; object-fit: contain; }
    .tax-inv-company { flex: 1; }
    .tax-inv-company h2 { margin: 0 0 10px 0; font-size: 1.15rem; font-weight: 700; color: #111; letter-spacing: 0.02em; }
    .tax-inv-address { margin: 0; color: #444; font-size: 10px; line-height: 1.5; }
    .tax-inv-contact { margin-top: 8px; font-size: 10px; color: #555; }
    .tax-inv-contact span { margin-right: 16px; }
    .tax-inv-meta { text-align: right; min-width: 180px; }
    .tax-inv-meta p { margin: 0 0 6px 0; font-size: 11px; }
    .tax-inv-title { text-align: center; font-size: 1.6rem; font-weight: 700; margin: 24px 0; letter-spacing: 0.05em; }
    .tax-inv-customer { margin-bottom: 18px; padding: 8px 0; }
    .tax-inv-customer strong { display: inline-block; min-width: 130px; font-size: 11px; }
    .tax-inv-table { width: 100%; border-collapse: collapse; margin: 0 0 20px 0; font-size: 10px; border: 1px solid #333; }
    .tax-inv-table th, .tax-inv-table td { border: 1px solid #333; padding: 6px 8px; vertical-align: middle; }
    .tax-inv-table th { background: #f0f0f0; font-weight: 700; text-align: center; font-size: 10px; }
    .tax-inv-table th.tl { text-align: left; }
    .tax-inv-table th .sub { display: block; font-weight: 400; font-size: 9px; color: #444; margin-top: 1px; }
    .tax-inv-table .tc { text-align: center; }
    .tax-inv-table .tr { text-align: right; }
    .tax-inv-table .tl { text-align: left; }
    .tax-inv-table tbody tr { background: #fff; }
    .tax-inv-table .total-row td { font-weight: 600; background: #f0f0f0; }
    .tax-inv-table .total-row.total-first td { border-top: 2px solid #333; }
    .tax-inv-table .total-final td { font-weight: 700; font-size: 11px; background: #e8e8e8; }
    .tax-inv-table .col-labels td { border: 1px solid #333; border-top: none; background: #fff; font-size: 9px; color: #444; padding: 4px 8px; text-align: right; }
    .tax-inv-footer { margin-top: 28px; font-size: 11px; border-top: 1px solid #ccc; padding-top: 16px; }
    .tax-inv-footer-row { margin-bottom: 12px; }
    .tax-inv-footer-row label { display: inline-block; min-width: 180px; font-weight: 600; }
    .tax-inv-disclaimer { margin-top: 28px; font-style: italic; color: #666; font-size: 10px; }
    @media print { body { padding: 16px; } .tax-inv-logo { max-height: 52px; } }
  </style>
</head>
<body>
  <div class="tax-inv-top">
    <div class="tax-inv-left">
      ${logoImg}
      <div class="tax-inv-company">
        <h2>Mamuya Auto Spare Parts</h2>
        <p class="tax-inv-address">Dar es Salaam, Tanzania</p>
        <div class="tax-inv-contact">
          <span>Tel: +255 757171337</span>
        </div>
      </div>
    </div>
    <div class="tax-inv-meta">
      <p><strong>TRN NO:</strong> ${(trnNo).replace(/</g, '&lt;')}</p>
      <p><strong>${isReceipt ? 'Receipt' : 'Invoice'} No:</strong> ${invNum}</p>
      <p><strong>Date:</strong> ${dateStr}</p>
    </div>
  </div>

  <h1 class="tax-inv-title">${isReceipt ? 'RECEIPT' : 'INVOICE'}</h1>

  <div class="tax-inv-customer">
    <strong>Customer Name:</strong> ${customerName}<br />
    <strong>Phone:</strong> ${customerPhone}
  </div>

  <table class="tax-inv-table">
    <thead>
      <tr>
        <th style="width:4%">Sr.No.</th>
        <th style="width:22%" class="tl">Description</th>
        <th style="width:11%" class="tl">Part No.</th>
        <th style="width:7%">Quantity</th>
        <th style="width:10%"><span>Price</span><span class="sub">TZS</span></th>
        <th style="width:6%">Per</th>
        <th style="width:11%"><span>Amount</span><span class="sub">TZS</span></th>
        <th style="width:12%"><span>Total Amount</span><span class="sub">TZS</span></th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row total-first">
        <td colspan="7" class="tr" style="font-weight:600;">Sub Total</td>
        <td class="tr">${formatCurrency(subTotal)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Discount</td>
        <td class="tr">-${formatCurrency(discountAmt)}</td>
      </tr>
      ${isReceipt ? `
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">${String(amountReceivedRowLabel).replace(/</g, '&lt;')}</td>
        <td class="tr">${formatCurrency(amountReceived)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Amount Remain</td>
        <td class="tr">${formatCurrency(amountRemain)}</td>
      </tr>` : ''}
      <tr class="total-row total-final">
        <td colspan="7" class="tr" style="font-weight:700;">${isReceipt ? 'Total Received' : 'Total'}</td>
        <td class="tr">${isReceipt ? formatCurrency(amountReceived) : formatCurrency(totalAmountFinal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="tax-inv-footer">
    <div class="tax-inv-footer-row"><label>TOTAL AMOUNT IN WORDS :</label> ${amountInWords}</div>
  </div>

  <p class="tax-inv-disclaimer">*This is a computer generated ${isReceipt ? 'receipt' : 'invoice'}, hence no signature is required.*</p>
</body>
</html>`;
  };

  const handlePrintRow = (payment) => {
    const html = getPrintHtml(payment, payment.status === 'Approved' ? 'receipt' : 'invoice');
    if (!html) return;

    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) {
      Swal.fire({
        icon: 'warning',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the invoice.',
        confirmButtonColor: '#511C00'
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    const trigger = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };

    if (printWindow.document.readyState === 'complete') {
      setTimeout(trigger, 100);
    } else {
      printWindow.onload = () => setTimeout(trigger, 100);
    }
  };

  const handleDownloadRow = (payment) => {
    const html = getPrintHtml(payment, payment.status === 'Approved' ? 'receipt' : 'invoice');
    if (!html) return;

    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${payment.status === 'Approved' ? 'receipt' : 'invoice'}-${payment.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to download document. Please try again.',
        confirmButtonColor: '#511C00'
      });
    }
  };

  const buildEditableItemsFromPayment = (payment) => {
    if (payment.items && payment.items.length > 0) {
      return payment.items.map((it) => ({
        sparepart_id: it.sparepart_id,
        sparepart_name: it.sparepart_name || 'Unknown',
        sparepart_number: it.sparepart_number || 'N/A',
        quantity: parseInt(it.quantity, 10) || 1,
        unit_price: parseFloat(it.unit_price || it.price || 0),
        total_amount:
          parseFloat(it.total_amount) ||
          (parseFloat(it.unit_price || it.price || 0) * (parseInt(it.quantity, 10) || 1)),
      }));
    }
    return [
      {
        sparepart_id: payment.sparepart_id,
        sparepart_name: payment.sparepart_name || 'Unknown',
        sparepart_number: payment.sparepart_number || 'N/A',
        quantity: parseInt(payment.quantity, 10) || 1,
        unit_price: parseFloat(payment.unit_price || payment.price || 0),
        total_amount:
          parseFloat(payment.total_amount) ||
          (parseFloat(payment.unit_price || payment.price || 0) * (parseInt(payment.quantity, 10) || 1)),
      },
    ];
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const handleEdit = (payment) => {
    setEditableItems(buildEditableItemsFromPayment(payment));
    setDiscountValue(
      payment && payment.discount_amount != null
        ? String(payment.discount_amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        : ''
    );
    setNewSpareSearch('');
    setNewSpareQuantity('');
    setSelectedNewSpareId('');
    setShowNewSpareDropdown(false);
    setSelectedPayment(payment);
    setShowEditModal(true);
  };

  const handleReceiveMoney = (payment) => {
    receiveSaveInFlightRef.current = false;
    setSelectedPayment(payment);
    setReceiveAmountInput('0');
    const pm = String(payment?.payment_method || '').trim();
    if (!pm || pm === 'Loan' || pm === 'Mixed') {
      setPaymentMethodInput('');
    } else {
      setPaymentMethodInput(pm);
    }
    setSplitCashInput('');
    setSplitBankInput('');
    setSplitAirtelInput('');
    setSplitMpesaInput('');
    setSplitYasInput('');
    setSparepartIdInput(
      payment?.sparepart_id != null
        ? String(payment.sparepart_id)
        : payment?.items?.[0]?.sparepart_id != null
        ? String(payment.items[0].sparepart_id)
        : ''
    );
    setShowReceiveModal(true);
  };

  const handlePayFullRemainder = () => {
    if (!selectedPayment) return;
    const remain = getAmountRemain(selectedPayment);
    setReceiveAmountInput(String(remain));
    setSplitCashInput('');
    setSplitBankInput('');
    setSplitAirtelInput('');
    setSplitMpesaInput('');
    setSplitYasInput('');
  };

  const getReceiveAddingTotal = () =>
    parseCommaNumber(receiveAmountInput) +
    parseCommaNumber(splitCashInput) +
    parseCommaNumber(splitBankInput) +
    parseCommaNumber(splitAirtelInput) +
    parseCommaNumber(splitMpesaInput) +
    parseCommaNumber(splitYasInput);

  const getReceiveSparePartsLabel = (payment) => {
    if (payment?.items?.length > 0) {
      return payment.items
        .map((item) => capitalizeName(item.sparepart_name || 'Unknown'))
        .join(', ');
    }
    return capitalizeName(payment?.sparepart_name || '—');
  };

  const handleSaveReceiveMoney = async () => {
    if (!selectedPayment) return;
    if (receiveSaveInFlightRef.current || receiveSaving) return;
    receiveSaveInFlightRef.current = true;

    const splitCash = parseCommaNumber(splitCashInput);
    const splitBank = parseCommaNumber(splitBankInput);
    const splitAirtel = parseCommaNumber(splitAirtelInput);
    const splitMpesa = parseCommaNumber(splitMpesaInput);
    const splitYas = parseCommaNumber(splitYasInput);
    const splitTotal = splitCash + splitBank + splitAirtel + splitMpesa + splitYas;
    const manualAmount = parseCommaNumber(receiveAmountInput);
    const addAmount = manualAmount + splitTotal;

    if (addAmount <= 0) {
      receiveSaveInFlightRef.current = false;
      Swal.fire({
        icon: 'warning',
        title: t.invalidAmount || 'Invalid amount',
        text: t.enterAmountTZS || 'Enter amount (TZS)',
        confirmButtonColor: '#511C00',
      });
      return;
    }

    const currentRemain = getAmountRemain(selectedPayment);
    if (addAmount > currentRemain) {
      receiveSaveInFlightRef.current = false;
      Swal.fire({
        icon: 'warning',
        title: t.invalidAmount || 'Invalid amount',
        text: `Amount cannot exceed remaining balance (TZS ${formatPrice(currentRemain)}).`,
        confirmButtonColor: '#511C00',
      });
      return;
    }

    if (manualAmount > 0 && !String(paymentMethodInput || '').trim()) {
      receiveSaveInFlightRef.current = false;
      Swal.fire({
        icon: 'warning',
        title: t.invalidPaymentMethod || 'Invalid payment method',
        text: t.selectPaymentMethod || 'Please select a payment method.',
        confirmButtonColor: '#511C00',
      });
      return;
    }

    const previousReceived = Number(selectedPayment.amount_received) || 0;
    const newReceivedTotal = previousReceived + addAmount;
    const amountRemain = Math.max(0, currentRemain - addAmount);
    const splitMethodsUsed = [
      splitCash > 0 ? 'Cash' : null,
      splitBank > 0 ? 'Bank Transfer' : null,
      splitAirtel > 0 ? 'Airtel Money' : null,
      splitMpesa > 0 ? 'M-Pesa' : null,
      splitYas > 0 ? 'Mix By Yas' : null,
    ].filter(Boolean);
    const selectedMethod = String(paymentMethodInput || '').trim();
    const methodsUsed = [
      ...(manualAmount > 0 && selectedMethod ? [selectedMethod] : []),
      ...splitMethodsUsed,
    ];
    const uniqueMethods = Array.from(new Set(methodsUsed));
    const effectivePaymentMethod =
      uniqueMethods.length > 1
        ? 'Mixed'
        : uniqueMethods[0] || selectedMethod || String(selectedPayment.payment_method || '').trim();

    const baseChannelTotals =
      manualAmount > 0
        ? mergePaymentChannelTotals(selectedPayment, selectedMethod, manualAmount)
        : {
            cash: Number(selectedPayment.cash) || 0,
            bank_transfer: Number(selectedPayment.bank_transfer) || 0,
            airtel_money: Number(selectedPayment.airtel_money) || 0,
            mpesa: Number(selectedPayment.mpesa) || 0,
            mix_by_yas: Number(selectedPayment.mix_by_yas) || 0,
          };

    const channelTotals = {
      cash: baseChannelTotals.cash + splitCash,
      bank_transfer: baseChannelTotals.bank_transfer + splitBank,
      airtel_money: baseChannelTotals.airtel_money + splitAirtel,
      mpesa: baseChannelTotals.mpesa + splitMpesa,
      mix_by_yas: baseChannelTotals.mix_by_yas + splitYas,
    };

    const sparepartIdValue =
      sparepartIdInput != null && String(sparepartIdInput).trim()
        ? parseInt(String(sparepartIdInput), 10)
        : null;

    setReceiveSaving(true);
    try {
      const response = await updatePaymentDetails(selectedPayment.id, {
        amount_received: newReceivedTotal,
        amount_remain: amountRemain,
        payment_method: effectivePaymentMethod,
        sparepart_id: sparepartIdValue,
        payment_type: String(selectedPayment.payment_type || '').trim() || null,
        confirmed_by_cashier_id: user?.id || null,
        cash: channelTotals.cash,
        bank_transfer: channelTotals.bank_transfer,
        airtel_money: channelTotals.airtel_money,
        mpesa: channelTotals.mpesa,
        mix_by_yas: channelTotals.mix_by_yas,
      });
      if (!response.success) throw new Error(response.message || 'Failed to update');

      const refreshResponse = await getPayments();
      if (refreshResponse.success && refreshResponse.payments) {
        setPayments(refreshResponse.payments);
        const updated = refreshResponse.payments.find((p) => p.id === selectedPayment.id);
        if (updated) setSelectedPayment(updated);
      }

      setReceiveAmountInput('');
      setSplitCashInput('');
      setSplitBankInput('');
      setSplitAirtelInput('');
      setSplitMpesaInput('');
      setSplitYasInput('');
      setPaymentMethodInput('');
      setShowReceiveModal(false);

      Swal.fire({
        icon: 'success',
        title: t.saved || 'Saved',
        text: 'Payment received successfully.',
        confirmButtonColor: '#511C00',
        timer: 2800,
        timerProgressBar: true,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: t.error || 'Error',
        text: error.message || 'Failed to record payment.',
        confirmButtonColor: '#511C00',
      });
    } finally {
      setReceiveSaving(false);
      receiveSaveInFlightRef.current = false;
    }
  };

  const handleEditableItemQuantityChange = (index, value) => {
    const raw = String(value).replace(/\D/g, '');
    const qty = raw === '' ? '' : Math.max(1, parseInt(raw, 10) || 1);
    setEditableItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              quantity: qty,
              total_amount: (parseFloat(item.unit_price) || 0) * (qty === '' ? 0 : qty)
            }
          : item
      )
    );
  };

  const handleRemoveEditableItem = (index) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEditableItems = async () => {
    if (!selectedPayment || editSaving) return;

    if (!editableItems || editableItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'At least one spare part is required.',
        confirmButtonColor: '#511C00'
      });
      return;
    }

    const normalizedItems = editableItems.map((item) => {
      const qty = parseInt(item.quantity, 10) || 1;
      const unit = parseFloat(item.unit_price) || 0;
      return {
        sparepart_id: item.sparepart_id,
        quantity: qty,
        unit_price: unit,
        total_amount: unit * qty,
        sparepart_name: item.sparepart_name,
        sparepart_number: item.sparepart_number
      };
    });

    const totalQuantity = normalizedItems.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0);
    const totalAmount = normalizedItems.reduce((sum, it) => sum + (parseFloat(it.total_amount) || 0), 0);
    const discountNum = parseFloat(String(discountValue || '0').replace(/,/g, '')) || 0;
    const finalTotalAmount = Math.max(0, totalAmount - discountNum);

    setEditSaving(true);
    try {
      const response = await apiRequest(`/payments/${selectedPayment.id}`, {
        method: 'PUT',
        body: {
          items_json: normalizedItems,
          quantity: totalQuantity,
          total_amount: finalTotalAmount,
          discount_amount: discountNum
        }
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to update sale details');
      }

      const paymentsResponse = await getPayments();
      if (paymentsResponse.success && paymentsResponse.payments) {
        setPayments(paymentsResponse.payments);
        const updated = paymentsResponse.payments.find((p) => p.id === selectedPayment.id);
        if (updated) {
          setSelectedPayment(updated);

          // Rebuild editable items list from updated payment so modal reflects DB changes
          let itemsForEdit;
          if (updated.items && updated.items.length > 0) {
            itemsForEdit = updated.items.map((it) => ({
              sparepart_id: it.sparepart_id,
              sparepart_name: it.sparepart_name || 'Unknown',
              sparepart_number: it.sparepart_number || 'N/A',
              quantity: parseInt(it.quantity, 10) || 1,
              unit_price: parseFloat(it.unit_price || it.price || 0),
              total_amount:
                parseFloat(it.total_amount) ||
                (parseFloat(it.unit_price || it.price || 0) * (parseInt(it.quantity, 10) || 1))
            }));
          } else {
            itemsForEdit = [
              {
                sparepart_id: updated.sparepart_id,
                sparepart_name: updated.sparepart_name || 'Unknown',
                sparepart_number: updated.sparepart_number || 'N/A',
                quantity: parseInt(updated.quantity, 10) || 1,
                unit_price: parseFloat(updated.unit_price || updated.price || 0),
                total_amount:
                  parseFloat(updated.total_amount) ||
                  (parseFloat(updated.unit_price || updated.price || 0) *
                    (parseInt(updated.quantity, 10) || 1))
              }
            ];
          }
          setEditableItems(itemsForEdit);
        }
      }

      setShowEditModal(false);

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Sale details updated successfully.',
        confirmButtonColor: '#511C00',
        timer: 2600,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error('Error updating sale details (manager):', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update sale details. Please try again.',
        confirmButtonColor: '#511C00'
      });
    } finally {
      setEditSaving(false);
    }
  };

  // Handlers for "add new spare part" input inside modal
  const handleNewSpareSearchChange = (value) => {
    setNewSpareSearch(value);
    setShowNewSpareDropdown(true);
    setSelectedNewSpareId('');
  };

  const handleNewSpareSelect = (part) => {
    setSelectedNewSpareId(part.id);
    setNewSpareSearch(part.part_name || '');
    setShowNewSpareDropdown(false);
  };

  const handleAddNewSpareToPayment = async () => {
    if (!selectedPayment) return;

    const qtyNum = parseInt(String(newSpareQuantity).replace(/\D/g, ''), 10) || 0;
    const searchName = (newSpareSearch || '').trim();

    if (qtyNum <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Quantity must be greater than 0.',
        confirmButtonColor: '#511C00'
      });
      return;
    }

    const selectedSpare = spareparts.find((sp) => String(sp.id) === String(selectedNewSpareId));

    let itemToAdd;

    if (selectedSpare) {
      const unitPrice = getSparePriceByType(selectedSpare, selectedPayment?.price_type);

      itemToAdd = {
        sparepart_id: selectedSpare.id,
        sparepart_name: selectedSpare.part_name || 'Unknown',
        sparepart_number: selectedSpare.part_number || 'N/A',
        quantity: qtyNum,
        unit_price: unitPrice
      };
    } else if (searchName) {
      itemToAdd = {
        sparepart_id: null,
        sparepart_name: searchName,
        sparepart_number: 'N/A',
        quantity: qtyNum,
        unit_price: 0
      };
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please type spare part name or select it from the list.',
        confirmButtonColor: '#511C00'
      });
      return;
    }

    // Normalize existing items (prefer modal state so newly added/edited rows are included immediately)
    const existingItems =
      editableItems && editableItems.length > 0
        ? editableItems.map((it) => {
            const qty = parseInt(it.quantity, 10) || 1;
            const unit = parseFloat(it.unit_price || 0);
            const total = parseFloat(it.total_amount);
            return {
              sparepart_id: it.sparepart_id,
              quantity: qty,
              unit_price: unit,
              total_amount: Number.isFinite(total) ? total : qty * unit,
              sparepart_name: it.sparepart_name,
              sparepart_number: it.sparepart_number
            };
          })
        : [
            {
              sparepart_id: selectedPayment.sparepart_id,
              quantity: parseInt(selectedPayment.quantity, 10) || 1,
              unit_price: parseFloat(selectedPayment.unit_price || selectedPayment.price || 0),
              total_amount:
                parseFloat(selectedPayment.total_amount) ||
                (parseFloat(selectedPayment.unit_price || selectedPayment.price || 0) *
                  (parseInt(selectedPayment.quantity, 10) || 1)),
              sparepart_name: selectedPayment.sparepart_name,
              sparepart_number: selectedPayment.sparepart_number
            }
          ];

    const qtyNew = parseInt(itemToAdd.quantity, 10) || 1;
    const unitNew = parseFloat(itemToAdd.unit_price) || 0;
    const itemToAddWithTotal = {
      ...itemToAdd,
      total_amount: unitNew * qtyNew
    };

    const allItems = [...existingItems, itemToAddWithTotal];

    const totalQuantity = allItems.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0);
    const totalAmount = allItems.reduce((sum, it) => sum + (parseFloat(it.total_amount) || 0), 0);

    try {
      const response = await apiRequest(`/payments/${selectedPayment.id}`, {
        method: 'PUT',
        body: {
          items_json: allItems,
          quantity: totalQuantity,
          total_amount: totalAmount
        }
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to update payment with new spare part');
      }

      const paymentsResponse = await getPayments();
      if (paymentsResponse.success && paymentsResponse.payments) {
        setPayments(paymentsResponse.payments);
        const updated = paymentsResponse.payments.find((p) => p.id === selectedPayment.id);
        if (updated) {
          // Keep the modal fields in sync even if backend payload omits expanded items list.
          setSelectedPayment({
            ...updated,
            items: updated.items && updated.items.length > 0 ? updated.items : allItems,
            quantity: updated.quantity ?? totalQuantity,
            total_amount: updated.total_amount ?? totalAmount,
          });
          setEditableItems(
            (updated.items && updated.items.length > 0
              ? updated.items
              : allItems
            ).map((it) => {
              const qty = parseInt(it.quantity, 10) || 1;
              const unit = parseFloat(it.unit_price || it.price || 0);
              const lineTotal = parseFloat(it.total_amount);
              return {
                sparepart_id: it.sparepart_id,
                sparepart_name: it.sparepart_name || 'Unknown',
                sparepart_number: it.sparepart_number || 'N/A',
                quantity: qty,
                unit_price: unit,
                total_amount: Number.isFinite(lineTotal) ? lineTotal : qty * unit,
              };
            })
          );
        } else {
          // Optimistic fallback so the added spare appears in modal immediately.
          setSelectedPayment((prev) =>
            prev
              ? { ...prev, items: allItems, quantity: totalQuantity, total_amount: totalAmount }
              : prev
          );
          setEditableItems(allItems);
        }
      }

      setNewSpareSearch('');
      setNewSpareQuantity('');
      setSelectedNewSpareId('');
      setShowNewSpareDropdown(false);

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Spare part added to this sale successfully.',
        confirmButtonColor: '#511C00'
      });
    } catch (error) {
      console.error('Error adding spare part to payment (manager):', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add spare part to this sale. Please try again.',
        confirmButtonColor: '#511C00'
      });
    }
  };

  const performStatusChange = async (payment, newStatus, discountInfo, paymentType) => {
    const actionText = newStatus === 'Approved' ? 'approve' : 'reject';
    try {
      const approverId = user?.id;
      const response = await updatePaymentStatus(payment.id, newStatus, approverId, {
        payment_type: paymentType,
      });
      if (!response.success) throw new Error(response.message || 'Failed to update status');

      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? {
                ...p,
                status: newStatus,
                payment_type: paymentType ?? p.payment_type,
                approved_by: approverId,
                approver_name: user?.full_name || user?.username,
                approved_at: new Date().toISOString()
              }
            : p
        )
      );

      const { addUnviewedOperation } = await import('../../utils/notifications');
      addUnviewedOperation(payment.id, newStatus === 'Approved' ? 'payment_approved' : 'payment_rejected', {
        customerName: payment.customer_name,
        amount: getPaymentTotalAmount(payment),
        approverName: user?.full_name || user?.username,
        discountInfo:
          newStatus === 'Approved'
            ? discountInfo || { status: 'none', amount: 0 }
            : undefined,
      });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Transaction ${actionText}d successfully.`,
        confirmButtonColor: '#511C00'
      });
      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update transaction status.',
        confirmButtonColor: '#511C00'
      });
      return false;
    }
  };

  const handleChangeStatus = async (payment, newStatus) => {
    const actionText = newStatus === 'Approved' ? 'approve' : 'cancel this order';

    // For rejection (cancel order), delete transaction from database after confirmation
    if (newStatus !== 'Approved') {
      const result = await Swal.fire({
        icon: 'question',
        title: 'Cancel Order',
        text: 'Are you sure you want to cancel this order?',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, cancel order',
      });

      if (!result.isConfirmed) return;

      try {
        const res = await deletePayment(payment.id);
        if (!res.success) {
          throw new Error(res.message || 'Failed to cancel order');
        }
        // Remove from local state
        setPayments((prev) => prev.filter((p) => p.id !== payment.id));
        Swal.fire({
          icon: 'success',
          title: 'Cancelled',
          text: 'Transaction has been cancelled and removed.',
          confirmButtonColor: '#511C00'
        });
      } catch (error) {
        console.error('Error cancelling (deleting) payment:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to cancel order. Please try again.',
          confirmButtonColor: '#511C00'
        });
      }
      return;
    }

    // For approval, ask manager to select only payment type.
    const { value: selectedPaymentType, isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Approve Transaction',
      html: `
        <div style="text-align:left;">
          <label for="manager-payment-type" style="display:block;margin-bottom:6px;font-weight:600;color:#511C00;">
            Payment type
          </label>
          <select
            id="manager-payment-type"
            class="swal2-select"
            style="box-sizing:border-box;width:100%;margin:0;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;"
          >
            <option value="">-- Select payment type --</option>
            <option value="Sales">Sales</option>
            <option value="Loan">Loan</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${actionText}`,
      focusConfirm: false,
      preConfirm: () => {
        const el = document.getElementById('manager-payment-type');
        const val = el ? el.value : '';
        if (!val) {
          Swal.showValidationMessage('Please select payment type');
          return;
        }
        return val;
      }
    });

    if (!isConfirmed || !selectedPaymentType) return;

    await performStatusChange(payment, newStatus, { status: 'none', amount: 0 }, selectedPaymentType);
  };

  const handleDeleteApproved = async (payment) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Transaction',
      text: 'Are you sure you want to delete this approved transaction?',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;

    try {
      const res = await deletePayment(payment.id);
      if (!res.success) {
        throw new Error(res.message || 'Failed to delete transaction');
      }
      setPayments((prev) => prev.filter((p) => p.id !== payment.id));
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Approved transaction deleted successfully.',
        confirmButtonColor: '#511C00'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to delete transaction.',
        confirmButtonColor: '#511C00'
      });
    }
  };

  const isLoanPayment = (payment) =>
    String(payment?.payment_type ?? '').trim().toLowerCase() === 'loan';

  /** Same basis as manager reports: loans use last activity; others use approval/confirmation when set. */
  const getRecordDateForTransactions = (payment) => {
    if (!payment) return null;
    if (isLoanPayment(payment)) {
      return payment.updated_at || payment.created_at;
    }
    if (payment.approved_at || payment.approvedAt || payment.confirmed_at) {
      return payment.approved_at || payment.approvedAt || payment.confirmed_at;
    }
    return payment.created_at;
  };

  const isPaymentInDateRange = (payment) => {
    if (!dateFrom && !dateTo) return true;
    const recordDate = getRecordDateForTransactions(payment);
    if (!recordDate) return false;
    const d = new Date(recordDate);
    if (isNaN(d.getTime())) return false;
    const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dateFrom && dateOnly < dateFrom) return false;
    if (dateTo && dateOnly > dateTo) return false;
    return true;
  };

  const paymentsInDateRange = payments.filter((p) => !isLoanPayment(p) && isPaymentInDateRange(p));

  // Filter payments from database by calendar range, search and status
  const filteredPayments = payments.filter((payment) => {
    if (isLoanPayment(payment)) return false;
    if (!isPaymentInDateRange(payment)) return false;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (payment.customer_name && payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && payment.customer_phone.includes(searchTerm)) ||
      (payment.sparepart_name && payment.sparepart_name.toLowerCase().includes(term)) ||
      (payment.sparepart_number && payment.sparepart_number?.toLowerCase().includes(term));

    // Use database values directly
    const total = getPaymentTotalAmount(payment);
    const receivedFromDB = Number(payment.amount_received) || 0;
    const amountRemainFromDB = payment.amount_remain != null ? Number(payment.amount_remain) : null;
    const amountRemain = amountRemainFromDB != null
      ? amountRemainFromDB
      : Math.max(0, total - receivedFromDB);
    
    const displayApproved = payment.status === 'Approved' || (payment.status === 'Pending' && amountRemain === 0);
    const displayPending = payment.status === 'Pending' && amountRemain !== 0;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Approved' && displayApproved) ||
      (statusFilter === 'Pending' && displayPending) ||
      (statusFilter === 'Rejected' && payment.status === 'Rejected');

    return matchesSearch && matchesStatus;
  });

  const pendingCount = paymentsInDateRange.filter((p) => {
    if (p.status !== 'Pending') return false;
    const total = getPaymentTotalAmount(p);
    const received = Number(p.amount_received) || 0;
    return total - received !== 0;
  }).length;
  const approvedCount = paymentsInDateRange.filter((p) => p.status === 'Approved').length;
  const rejectedCount = paymentsInDateRange.filter((p) => p.status === 'Rejected').length;

  // For the Sales Details modal: compute base total (before discount) and final total (after discount)
  const baseTotalForModal = selectedPayment
    ? (editableItems && editableItems.length
        ? editableItems.reduce(
            (sum, it) =>
              sum + ((parseFloat(it.unit_price) || 0) * (parseInt(it.quantity, 10) || 0)),
            0
          )
        : (() => {
            const qty = parseInt(selectedPayment.quantity, 10) || 0;
            const unitPrice = parseFloat(selectedPayment.unit_price) || 0;
            const fromDb = parseFloat(selectedPayment.total_amount);
            return Number.isFinite(fromDb) ? fromDb : qty * unitPrice;
          })())
    : 0;

  const numericDiscount = parseFloat(String(discountValue || '0').replace(/,/g, '')) || 0;
  const finalTotalForModal = Math.max(0, baseTotalForModal - numericDiscount);

  if (loading) {
    return <PageLoader message={t.loading || 'Loading...'} />;
  }

  if (!user) return null;

  return (
    <div className="payments-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/manager/dashboard" className={'nav-item ' + (location.pathname === '/manager/dashboard' ? 'active' : '')}>
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/manager/spareparts" className={'nav-item ' + (location.pathname === '/manager/spareparts' ? 'active' : '')}>
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/manager/customers-info" className={'nav-item ' + (location.pathname === '/manager/customers-info' ? 'active' : '')}>
            <FaUsers className="nav-icon" />
            <span>{t.customerInfo}</span>
          </Link>
          <Link to="/manager/generate-sales" className={'nav-item ' + (location.pathname === '/manager/generate-sales' ? 'active' : '')}>
            <FaFileInvoice className="nav-icon" />
            <span>{t.generateSales}</span>
          </Link>
          <Link to="/manager/transactions" className={'nav-item ' + (location.pathname === '/manager/transactions' ? 'active' : '')}>
            <FaReceipt className="nav-icon" />
            <span>{t.transactions}</span>
          </Link>
          <Link to="/manager/loans" className={'nav-item ' + (location.pathname === '/manager/loans' ? 'active' : '')}>
            <FaMoneyBillWave className="nav-icon" />
            <span>Loans</span>
          </Link>
          <Link to="/manager/reports" className={'nav-item ' + (location.pathname === '/manager/reports' ? 'active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="payments-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">{t.managerTransactions}</h1>
          </div>
          <div className="header-right">
            <div className="manager-date-time">
              <FaCalendarAlt />
              <span>{currentDateTime}</span>
            </div>
            <ThemeToggle />
            <LanguageSelector />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Manager')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        <div className="payments-content">
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchPlaceholderManager}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
                <option value="All">{t.allStatus}</option>
                <option value="Pending">{t.pending}</option>
                <option value="Approved">{t.approved}</option>
                <option value="Rejected">{t.rejected}</option>
              </select>
            </div>
            <div className="manager-transactions-date-filters">
              <label className="manager-date-filter-label">
                <FaCalendarAlt aria-hidden />
                <span>{t.fromDate || 'From'}</span>
              </label>
              <input
                type="date"
                className="manager-date-filter-input"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                title={t.fromDate || 'From date'}
              />
              <label className="manager-date-filter-label">
                <span>{t.toDate || 'To'}</span>
              </label>
              <input
                type="date"
                className="manager-date-filter-input"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                title={t.toDate || 'To date'}
              />
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  className="manager-date-filter-clear"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  {t.clearDates || t.clear || 'Clear dates'}
                </button>
              )}
            </div>
          </div>

          <div className="stats-row manager-stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.pendingApproval}</h3>
                <p className="stat-value">{pendingCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.approved}</h3>
                <p className="stat-value">{approvedCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.rejected}</h3>
                <p className="stat-value">{rejectedCount}</p>
              </div>
            </div>
          </div>

          <section className="manager-transactions-table-section">
            <h3 className="manager-section-title">{t.transactions}</h3>
            <div className="table-container">
              <table className="payments-table">
              <thead>
                <tr>
                  <th>{t.actions}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.quantity}</th>
                  <th>{t.unitPrice}</th>
                  <th>{t.totalAmount}</th>
                  <th>Discount</th>
                  <th>{t.paymentType || 'Payment type'}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.amountReceived}</th>
                  <th>{t.amountRemain}</th>
                  <th>{t.status}</th>
                  <th>{t.date}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="no-data">
                      {t.noTransactionsFound}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => {
                    // Use database values directly
                    const total = getPaymentTotalAmount(payment);
                    const receivedFromDB = Number(payment.amount_received) || 0;
                    const amountRemainFromDB = payment.amount_remain != null ? Number(payment.amount_remain) : null;

                    // Calculate amount remain: use database value if available, otherwise calculate
                    const amountRemain = amountRemainFromDB != null
                      ? amountRemainFromDB
                      : Math.max(0, total - receivedFromDB);

                    const displayStatus =
                      payment.status === 'Rejected'
                        ? 'Rejected'
                        : payment.status === 'Approved' || amountRemain === 0
                        ? 'Approved'
                        : 'Pending';
                    const needsApproval = payment.status === 'Pending' && amountRemain !== 0;

                    return (
                      <tr key={payment.id}>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view" title={t.details} onClick={() => handleView(payment)}>
                              <FaEye className="action-icon" />
                              <span className="action-text">{t.view}</span>
                            </button>
                            {payment.status === 'Approved' && amountRemain > 0 && (
                              <button
                                className="action-btn receive"
                                title={t.receiveMoney || 'Receive Money'}
                                onClick={() => handleReceiveMoney(payment)}
                              >
                                <FaMoneyBillWave className="action-icon" />
                                <span className="action-text">{t.receiveMoney || 'Receive Money'}</span>
                              </button>
                            )}
                            {payment.status === 'Pending' && (
                              <button
                                className="action-btn print"
                                title="Print Invoice"
                                onClick={() => handlePrintRow(payment)}
                              >
                                <FaPrint className="action-icon" />
                                <span className="action-text">Print Invoice</span>
                              </button>
                            )}
                            {payment.status === 'Approved' && (
                              <button
                                className="action-btn print"
                                title="Print Receipt"
                                onClick={() => handlePrintRow(payment)}
                              >
                                <FaPrint className="action-icon" />
                                <span className="action-text">Print Receipt</span>
                              </button>
                            )}
                            {payment.status === 'Approved' && (
                              <button
                                className="action-btn reject"
                                title="Delete transaction"
                                onClick={() => handleDeleteApproved(payment)}
                              >
                                <FaTimesCircle className="action-icon" />
                                <span className="action-text">Delete</span>
                              </button>
                            )}
                            <button
                              className="action-btn view"
                              title={payment.status === 'Approved' ? 'Download Receipt' : 'Download Invoice'}
                              onClick={() => handleDownloadRow(payment)}
                            >
                              <FaDownload className="action-icon" />
                              <span className="action-text">
                                {payment.status === 'Approved' ? 'Download Receipt' : 'Download Invoice'}
                              </span>
                            </button>
                            {payment.status === 'Rejected' && (
                              <button
                                className="action-btn reject"
                                title="Cancel order"
                                onClick={() => handleChangeStatus(payment, 'Rejected')}
                              >
                                <FaTimesCircle className="action-icon" />
                                <span className="action-text">Cancel order</span>
                              </button>
                            )}
                            {needsApproval && (
                              <>
                                <button
                                  className="action-btn approve"
                                  title={t.approve}
                                  onClick={() => handleChangeStatus(payment, 'Approved')}
                                >
                                  <FaCheckCircle className="action-icon" />
                                  <span className="action-text">{t.approve}</span>
                                </button>
                                <button
                                  className="action-btn edit"
                                  title="Edit"
                                  onClick={() => handleEdit(payment)}
                                >
                                  <FaEdit className="action-icon" />
                                  <span className="action-text">Edit</span>
                                </button>
                                <button
                                  className="action-btn reject"
                                  title="Cancel order"
                                  onClick={() => handleChangeStatus(payment, 'Rejected')}
                                >
                                  <FaTimesCircle className="action-icon" />
                                  <span className="action-text">Cancel order</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="customer-info">
                            <FaUsers className="info-icon" />
                            <div>
                              <div className="info-name">{capitalizeName(payment.customer_name)}</div>
                              <div className="info-detail">{payment.customer_phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {payment.items && payment.items.length > 0 ? (
                            <div>
                              {payment.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="part-info"
                                  style={{ marginBottom: idx < payment.items.length - 1 ? '8px' : '0' }}
                                >
                                  <FaBox className="info-icon" />
                                  <div>
                                    <div className="info-name">{capitalizeName(item.sparepart_name || 'Unknown')}</div>
                                    <div className="info-detail">
                                      {(item.sparepart_number || 'N/A').toUpperCase()} - Qty: {item.quantity}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="part-info">
                              <FaBox className="info-icon" />
                              <div>
                                <div className="info-name">{capitalizeName(payment.sparepart_name || 'Unknown')}</div>
                                <div className="info-detail">{payment.sparepart_number?.toUpperCase()}</div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          {payment.items && payment.items.length > 0
                            ? payment.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)
                            : payment.quantity}
                        </td>
                        <td>
                          {payment.items && payment.items.length > 0
                            ? payment.items.map((item, idx) => (
                                <div key={idx} style={{ marginBottom: idx < payment.items.length - 1 ? '5px' : '0' }}>
                                  TZS {formatPrice(item.unit_price)}
                                </div>
                              ))
                            : `TZS ${formatPrice(payment.unit_price)}`}
                        </td>
                        <td className="amount-cell">TZS {formatPrice(total)}</td>
                        <td className="amount-cell">
                          {payment.discount_amount != null
                            ? `TZS ${formatPrice(payment.discount_amount)}`
                            : '—'}
                        </td>
                        <td>
                          <span className="payment-method-badge">
                            {String(payment.payment_type || '').trim() || '—'}
                          </span>
                        </td>
                        <td>
                          <span className="payment-method-badge">{payment.payment_method || '—'}</span>
                        </td>
                        <td className="amount-cell">
                          {payment.amount_received != null ? `TZS ${formatPrice(payment.amount_received)}` : '—'}
                        </td>
                        <td className="amount-cell">
                          {amountRemainFromDB != null
                            ? `TZS ${formatPrice(amountRemainFromDB)}`
                            : `TZS ${formatPrice(Math.max(0, amountRemain))}`}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              displayStatus === 'Approved' ? 'approved' : displayStatus === 'Rejected' ? 'rejected' : 'pending'
                            }`}
                          >
                            {displayStatus === 'Approved' && <FaCheckCircle />}
                            {displayStatus === 'Rejected' && <FaTimesCircle />}
                            {displayStatus === 'Pending' && <FaClock />}
                            {displayStatus === 'Approved' ? t.approved : displayStatus === 'Rejected' ? t.rejected : t.pending}
                          </span>
                        </td>
                        <td>{formatDateTime(payment.created_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {showViewModal && selectedPayment && (() => {
        const viewItems =
          selectedPayment.items && selectedPayment.items.length > 0
            ? selectedPayment.items
            : [
                {
                  sparepart_name: selectedPayment.sparepart_name,
                  sparepart_number: selectedPayment.sparepart_number,
                  quantity: selectedPayment.quantity,
                  unit_price: selectedPayment.unit_price,
                  total_amount: selectedPayment.total_amount,
                },
              ];
        const viewTotal = getPaymentTotalAmount(selectedPayment);

        return (
          <div className="modal-overlay transaction-view-overlay" onClick={() => setShowViewModal(false)}>
            <div className="modal-content transaction-view-modal" onClick={(e) => e.stopPropagation()}>
              <div className="transaction-edit-header transaction-view-header">
                <div className="transaction-edit-header-text">
                  <div className="transaction-edit-header-icon">
                    <FaEye />
                  </div>
                  <div>
                    <h2>{t.details || 'Transaction Details'}</h2>
                    <p>#{selectedPayment.id} · {formatDateTime(selectedPayment.created_at)}</p>
                  </div>
                </div>
                <button type="button" className="close-btn" onClick={() => setShowViewModal(false)} aria-label="Close">
                  ×
                </button>
              </div>
              <div className="transaction-edit-body">
                <div className="transaction-edit-grid">
                  <section className="transaction-edit-panel">
                    <h3 className="transaction-edit-panel-title"><FaUser /> {t.customer}</h3>
                    <div className="transaction-edit-info-row">
                      <span>{t.customer}</span>
                      <strong>{capitalizeName(selectedPayment.customer_name || '—')}</strong>
                    </div>
                    <div className="transaction-edit-info-row">
                      <span>{t.phone || 'Phone'}</span>
                      <strong>{selectedPayment.customer_phone || '—'}</strong>
                    </div>
                    <div className="transaction-edit-info-row">
                      <span>{t.paymentType || 'Payment type'}</span>
                      <strong>{String(selectedPayment.payment_type || '').trim() || '—'}</strong>
                    </div>
                    <div className="transaction-edit-info-row">
                      <span>{t.paymentMethod}</span>
                      <strong>{selectedPayment.payment_method || '—'}</strong>
                    </div>
                    <div className="transaction-edit-info-row">
                      <span>{t.status || 'Status'}</span>
                      <span className={`status-badge ${(selectedPayment.status || '').toLowerCase()}`}>
                        {selectedPayment.status || '—'}
                      </span>
                    </div>
                  </section>
                  <section className="transaction-edit-panel transaction-edit-panel--items">
                    <h3 className="transaction-edit-panel-title"><FaBox /> {t.sparePart || 'Spare parts'}</h3>
                    <div className="transaction-view-items">
                      {viewItems.map((item, idx) => (
                        <div key={idx} className="transaction-view-item">
                          <div>
                            <strong>{capitalizeName(item.sparepart_name || 'Unknown')}</strong>
                            <span>{(item.sparepart_number || 'N/A').toUpperCase()}</span>
                          </div>
                          <div className="transaction-view-item-meta">
                            <span>Qty: {item.quantity}</span>
                            <span>TZS {formatPrice(item.unit_price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="transaction-edit-summary-strip">
                      <div><span>Total</span><strong>TZS {formatPrice(viewTotal)}</strong></div>
                      <div><span>Received</span><strong>TZS {formatPrice(selectedPayment.amount_received || 0)}</strong></div>
                      <div><span>{t.amountRemain || 'Remain'}</span><strong>TZS {formatPrice(getAmountRemain(selectedPayment))}</strong></div>
                    </div>
                  </section>
                </div>
              </div>
              <div className="transaction-edit-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowViewModal(false)}>
                  {t.close || 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showEditModal && selectedPayment && (
        <div
          className="modal-overlay transaction-edit-overlay"
          onClick={() => {
            if (!editSaving) setShowEditModal(false);
          }}
        >
          <div className="modal-content transaction-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="transaction-edit-header">
              <div className="transaction-edit-header-text">
                <div className="transaction-edit-header-icon">
                  <FaEdit />
                </div>
                <div>
                  <h2>{t.edit || 'Edit Transaction'}</h2>
                  <p>#{selectedPayment.id} · {formatDateTime(selectedPayment.created_at)}</p>
                </div>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => {
                  if (!editSaving) setShowEditModal(false);
                }}
                disabled={editSaving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="transaction-edit-body">
              <div className="transaction-edit-grid">
                <section className="transaction-edit-panel">
                  <h3 className="transaction-edit-panel-title"><FaUser /> Customer &amp; order</h3>
                  <div className="transaction-edit-info-row">
                    <span>{t.customer}</span>
                    <strong>{capitalizeName(selectedPayment.customer_name || '—')}</strong>
                  </div>
                  <div className="transaction-edit-info-row">
                    <span>{t.phone || 'Phone'}</span>
                    <strong>{selectedPayment.customer_phone || '—'}</strong>
                  </div>
                  <div className="transaction-edit-info-row">
                    <span>{t.paymentType || 'Payment type'}</span>
                    <strong>{String(selectedPayment.payment_type || '').trim() || '—'}</strong>
                  </div>
                  <div className="transaction-edit-info-row">
                    <span>{t.status || 'Status'}</span>
                    <span className={`status-badge ${(selectedPayment.status || '').toLowerCase()}`}>
                      {selectedPayment.status || '—'}
                    </span>
                  </div>
                  <div className="transaction-edit-field">
                    <label htmlFor="transaction-discount">Discount (TZS)</label>
                    <input
                      id="transaction-discount"
                      type="text"
                      className="transaction-edit-input"
                      value={discountValue}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        setDiscountValue(raw.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
                      }}
                      placeholder="0"
                    />
                  </div>
                </section>

                <section className="transaction-edit-panel transaction-edit-panel--items">
                  <h3 className="transaction-edit-panel-title"><FaBox /> Line items</h3>
                  <div className="transaction-edit-items">
                    {editableItems.map((item, idx) => (
                      <div key={idx} className="transaction-edit-item">
                        <div className="transaction-edit-item-info">
                          <strong>{capitalizeName(item.sparepart_name || 'Unknown')}</strong>
                          <span>{(item.sparepart_number || 'N/A').toUpperCase()} · TZS {formatPrice(item.unit_price)}</span>
                        </div>
                        <div className="transaction-edit-item-actions">
                          <label>Qty</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="transaction-edit-input transaction-edit-input--qty"
                            value={item.quantity}
                            onChange={(e) => handleEditableItemQuantityChange(idx, e.target.value)}
                          />
                          {editableItems.length > 1 && (
                            <button
                              type="button"
                              className="transaction-edit-remove-btn"
                              onClick={() => handleRemoveEditableItem(idx)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="transaction-edit-add-part">
                    <label>Add spare part</label>
                    <div className="transaction-edit-search-wrap">
                      <FaSearch className="transaction-edit-search-icon" />
                      <input
                        type="text"
                        className="transaction-edit-input"
                        placeholder="Search spare part"
                        value={newSpareSearch}
                        onChange={(e) => handleNewSpareSearchChange(e.target.value)}
                        onFocus={() => setShowNewSpareDropdown(true)}
                      />
                      {showNewSpareDropdown && newSpareSearch && (
                        <div className="transaction-edit-dropdown">
                          {spareparts
                            .filter((sp) => {
                              const alreadyInPayment =
                                editableItems &&
                                editableItems.some(
                                  (it) => it.sparepart_id && String(it.sparepart_id) === String(sp.id)
                                );
                              if (alreadyInPayment) return false;
                              const searchLower = newSpareSearch.toLowerCase();
                              return (
                                (sp.part_name && sp.part_name.toLowerCase().includes(searchLower)) ||
                                (sp.part_number && sp.part_number.toLowerCase().includes(searchLower)) ||
                                (sp.brand_name && sp.brand_name.toLowerCase().includes(searchLower)) ||
                                (sp.category && sp.category.toLowerCase().includes(searchLower)) ||
                                (sp.category_name && sp.category_name.toLowerCase().includes(searchLower))
                              );
                            })
                            .slice(0, 8)
                            .map((sp) => (
                              <button
                                key={sp.id}
                                type="button"
                                className="transaction-edit-dropdown-item"
                                onClick={() => handleNewSpareSelect(sp)}
                              >
                                <span>{capitalizeName(sp.part_name)}</span>
                                <small>{sp.part_number || 'N/A'} · TZS {formatPrice(getSparePriceByType(sp, selectedPayment?.price_type))}</small>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="transaction-edit-add-row">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="transaction-edit-input transaction-edit-input--qty"
                        placeholder="Qty"
                        value={newSpareQuantity}
                        onChange={(e) => setNewSpareQuantity(e.target.value)}
                      />
                      <button type="button" className="transaction-edit-add-btn" onClick={handleAddNewSpareToPayment}>
                        Add spare part
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              <div className="transaction-edit-summary-table">
                <div className="transaction-edit-summary-row">
                  <span>Base total</span>
                  <strong>TZS {formatPrice(baseTotalForModal)}</strong>
                </div>
                <div className="transaction-edit-summary-row">
                  <span>Discount</span>
                  <strong>{numericDiscount > 0 ? `- TZS ${formatPrice(numericDiscount)}` : `TZS ${formatPrice(0)}`}</strong>
                </div>
                <div className="transaction-edit-summary-row transaction-edit-summary-row--final">
                  <span>Final total</span>
                  <strong>TZS {formatPrice(finalTotalForModal)}</strong>
                </div>
              </div>
            </div>

            <div className="transaction-edit-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  if (!editSaving) setShowEditModal(false);
                }}
                disabled={editSaving}
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                className="transaction-edit-save-btn"
                onClick={handleSaveEditableItems}
                disabled={editSaving}
              >
                <FaEdit />
                {editSaving ? (t.saving || 'Saving...') : (t.save || 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiveModal && selectedPayment && (() => {
        const totalAmount = getPaymentTotalAmount(selectedPayment);
        const currentReceived = Number(selectedPayment.amount_received) || 0;
        const currentRemain = getAmountRemain(selectedPayment);
        const addingAmount = getReceiveAddingTotal();
        const newRemain = Math.max(0, currentRemain - addingAmount);
        const progressPct = totalAmount > 0
          ? Math.min(100, ((currentReceived + addingAmount) / totalAmount) * 100)
          : 0;
        const isFullyPaidPreview = newRemain === 0 && addingAmount > 0;

        return (
        <div
          className="modal-overlay receive-money-overlay"
          onClick={() => {
            if (!receiveSaving) setShowReceiveModal(false);
          }}
        >
          <div className="modal-content receive-money-modal" onClick={(e) => e.stopPropagation()}>
            <div className="receive-money-header">
              <div className="receive-money-header-text">
                <div className="receive-money-header-icon">
                  <FaMoneyBillWave />
                </div>
                <div>
                  <h2>{t.receiveMoney || 'Receive Money'}</h2>
                  <p>Transaction #{selectedPayment.id} · {formatDateTime(selectedPayment.created_at)}</p>
                </div>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => {
                  if (!receiveSaving) setShowReceiveModal(false);
                }}
                disabled={receiveSaving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="receive-money-body">
              <div className="receive-money-progress-wrap">
                <div className="receive-money-progress-labels">
                  <span>Payment progress</span>
                  <span>{Math.round(progressPct)}%</span>
                </div>
                <div className="receive-money-progress-track">
                  <div
                    className={`receive-money-progress-fill${isFullyPaidPreview ? ' receive-money-progress-fill--complete' : ''}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="receive-money-grid">
                <section className="receive-money-panel">
                  <h3 className="receive-money-panel-title"><FaUser /> Customer &amp; order</h3>
                  <div className="receive-money-info-row">
                    <span>{t.customer}</span>
                    <strong>{capitalizeName(selectedPayment.customer_name || '—')}</strong>
                  </div>
                  <div className="receive-money-info-row">
                    <span>{t.phone || 'Phone'}</span>
                    <strong>{selectedPayment.customer_phone || '—'}</strong>
                  </div>
                  <div className="receive-money-info-row">
                    <span>{t.sparePart || 'Spare parts'}</span>
                    <strong>{getReceiveSparePartsLabel(selectedPayment)}</strong>
                  </div>
                  <div className="receive-money-info-row">
                    <span>{t.paymentType || 'Payment type'}</span>
                    <strong>{String(selectedPayment.payment_type || '').trim() || '—'}</strong>
                  </div>
                  <div className="receive-money-info-row">
                    <span>{t.status || 'Status'}</span>
                    <span className={`status-badge ${(selectedPayment.status || '').toLowerCase()}`}>
                      {selectedPayment.status || '—'}
                    </span>
                  </div>
                </section>

                <section className="receive-money-panel receive-money-panel--payment">
                  <h3 className="receive-money-panel-title"><FaCreditCard /> Payment entry</h3>

                  <div className="receive-money-field">
                    <label htmlFor="receive-payment-method">{t.paymentMethod || 'Payment Method'}</label>
                    <select
                      id="receive-payment-method"
                      value={paymentMethodInput}
                      onChange={(e) => setPaymentMethodInput(e.target.value)}
                      className="receive-money-input"
                    >
                      <option value="">{t.selectPaymentMethod || 'Select Payment Method'}</option>
                      <option value="Cash">Cash</option>
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Mix By Yas">Mix By Yas</option>
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit Card">Credit Card</option>
                    </select>
                  </div>

                  <div className="receive-money-field">
                    <div className="receive-money-field-head">
                      <label htmlFor="receive-amount-add">{t.amountReceived || 'Amount'} ({t.add || 'Add'})</label>
                      <button
                        type="button"
                        className="receive-money-link-btn"
                        onClick={handlePayFullRemainder}
                        disabled={receiveSaving || currentRemain <= 0}
                      >
                        Pay full balance
                      </button>
                    </div>
                    <div className="receive-money-amount-wrap">
                      <span className="receive-money-currency">TZS</span>
                      <input
                        id="receive-amount-add"
                        type="text"
                        inputMode="decimal"
                        className="receive-money-input receive-money-input--amount"
                        value={formatWithCommas(receiveAmountInput)}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d.]/g, '');
                          const parts = v.split('.');
                          const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                          setReceiveAmountInput(filtered);
                        }}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="receive-money-field">
                    <label>Split payment <span className="receive-money-optional">(optional)</span></label>
                    <div className="receive-money-split-grid">
                      {[
                        { key: 'cash', label: 'Cash', value: splitCashInput, setter: setSplitCashInput },
                        { key: 'bank', label: 'Bank Transfer', value: splitBankInput, setter: setSplitBankInput },
                        { key: 'airtel', label: 'Airtel Money', value: splitAirtelInput, setter: setSplitAirtelInput },
                        { key: 'mpesa', label: 'M-Pesa', value: splitMpesaInput, setter: setSplitMpesaInput },
                        { key: 'yas', label: 'Mix By Yas', value: splitYasInput, setter: setSplitYasInput },
                      ].map(({ key, label, value, setter }) => (
                        <div key={key} className="receive-money-split-item">
                          <span>{label}</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="receive-money-input"
                            placeholder="0"
                            value={value}
                            onChange={(e) => setter(e.target.value.replace(/[^\d.]/g, ''))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {isFullyPaidPreview && (
                    <div className="receive-money-notice receive-money-notice--success">
                      <FaCheckCircle /> This payment will fully settle the transaction balance.
                    </div>
                  )}
                </section>
              </div>
            </div>

            <div className="receive-money-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  if (!receiveSaving) setShowReceiveModal(false);
                }}
                disabled={receiveSaving}
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                className="receive-money-save-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveReceiveMoney();
                }}
                disabled={receiveSaving || addingAmount <= 0}
              >
                <FaMoneyBillWave />
                {receiveSaving ? (t.saving || 'Saving...') : `${t.receiveMoney || 'Receive Money'} · TZS ${formatPrice(addingAmount)}`}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

export default ManagerTransactions;
