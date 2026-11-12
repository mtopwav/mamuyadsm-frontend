import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBox,
  FaHistory,
  FaUsers,
  FaShoppingCart,
  FaBars,
  FaSignOutAlt,
  FaCog,
  FaUser,
  FaTags,
  FaCalendarAlt,
  FaWallet,
  FaBell,
  FaChartBar,
  FaFileInvoice,
  FaPrint,
  FaMoneyBillWave,
  FaSearch
} from 'react-icons/fa';
import './dashboard.css';
import './reports.css';
import logo from '../../images/logo.png';
import { getCurrentDateTime, formatDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { getPayments, getExpenses } from '../../services/api';
import { PageLoader } from '../../components/LoadingSpinner';
import StyledDateInput from '../../components/StyledDateInput';

const REPORT_PRINT_CSS = `
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
  .tax-inv-table { width: 100%; border-collapse: collapse; margin: 0 0 20px 0; font-size: 10px; border: 1px solid #333; }
  .tax-inv-table th, .tax-inv-table td { border: 1px solid #333; padding: 6px 8px; vertical-align: middle; }
  .tax-inv-table th { background: #f0f0f0; font-weight: 700; text-align: center; font-size: 10px; }
  .tax-inv-table th.tl { text-align: left; }
  .tax-inv-table .tc { text-align: center; }
  .tax-inv-table .tr { text-align: right; }
  .tax-inv-table .tl { text-align: left; }
  .item-qty { color: #c1121f; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .tax-inv-table tbody tr { background: #fff; }
  .tax-inv-footer { margin-top: 28px; font-size: 11px; border-top: 1px solid #ccc; padding-top: 16px; }
  .tax-inv-footer-row { margin-bottom: 12px; }
  .tax-inv-footer-row label { display: inline-block; min-width: 220px; font-weight: 600; }
  .tax-inv-footer-row.earned, .tax-inv-footer-row.earned label { font-weight: 700; }
  .tax-inv-disclaimer { margin-top: 28px; font-style: italic; color: #666; font-size: 10px; }
  @media print { body { padding: 16px; } .tax-inv-logo { max-height: 52px; } }
`;

function AdminReports() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      if (parsedUser.userType !== 'admin') {
        navigate('/login');
        return;
      }
    } catch (error) {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      try {
        const paymentsRes = await getPayments();
        if (paymentsRes?.success) setPayments(paymentsRes.payments || []);
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: t.error || 'Error',
          text: error.message || 'Failed to load reports data.',
          confirmButtonColor: '#511C00'
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate, t.error]);

  useEffect(() => {
    setCurrentDateTime(getCurrentDateTime());
    const interval = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const count = await getUnviewedOperationsCount();
        setNotificationCount(count || 0);
      } catch (error) {
        setNotificationCount(0);
      }
    };
    loadNotifications();
  }, []);

  useEffect(() => {
    const logoSrc = typeof logo === 'string' ? logo : logo?.default ? logo.default : '';
    if (!logoSrc) return;
    const src = logoSrc.startsWith('http')
      ? logoSrc
      : window.location.origin + (logoSrc.startsWith('/') ? logoSrc : '/' + logoSrc);
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
      title: t.logout || 'Logout',
      text: t.confirmLogout || 'Are you sure you want to logout?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t.yesLogout || 'Yes, logout',
      cancelButtonText: t.cancel || 'Cancel'
    });
    if (!result.isConfirmed) return;

    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const reportActions = [
    {
      title: t.transactions || 'Transactions Report',
      description: 'View and export transaction-level analytics.',
      route: '/admin/transactions'
    },
    {
      title: t.sales || 'Sales Performance',
      description: 'Analyze product movement and sales trends.',
      route: '/admin/sales'
    },
    {
      title: t.dashboard || 'Executive Overview',
      description: 'Back to dashboard with key metrics at a glance.',
      route: '/admin/dashboard'
    }
  ];

  const isInDateRange = (dateValue) => {
    if (!dateFrom && !dateTo) return true;
    if (!dateValue) return false;
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return false;
    const dayOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dateFrom && dayOnly < dateFrom) return false;
    if (dateTo && dayOnly > dateTo) return false;
    return true;
  };

  const matchesSearch = (p) => {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) return true;
    return (
      String(p.customer_name || '').toLowerCase().includes(term) ||
      String(p.customer_phone || '').toLowerCase().includes(term) ||
      String(p.payment_method || '').toLowerCase().includes(term) ||
      String(p.payment_type || '').toLowerCase().includes(term) ||
      String(p.sparepart_name || '').toLowerCase().includes(term) ||
      String(p.sparepart_number || '').toLowerCase().includes(term) ||
      String(p.status || '').toLowerCase().includes(term)
    );
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

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount || 0);

  const getStatusLabel = (status) => {
    if (status === 'Approved') return t.approved;
    if (status === 'Pending') return t.pending;
    if (status === 'Rejected') return t.rejected;
    return status || '';
  };

  const toNumPayment = (v) => (v == null || v === '' ? 0 : Number(v)) || 0;

  const getRecordDateForReports = (payment) => {
    if (!payment) return null;
    const isLoan = String(payment?.payment_type ?? '').trim().toLowerCase() === 'loan';
    if (isLoan) return payment.updated_at || payment.created_at;
    if (payment.approved_at || payment.approvedAt || payment.confirmed_at) {
      return payment.approved_at || payment.approvedAt || payment.confirmed_at;
    }
    return payment.created_at;
  };

  const getAmountRemainLoan = (p) => {
    const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    if (dbRemain != null && !Number.isNaN(dbRemain)) return dbRemain;
    const total = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return Math.max(0, total - discount - received);
  };

  const allocateLoanChannelAmounts = (amount, paymentMethod) => {
    const amt = Number(amount) || 0;
    const empty = { cash: 0, bank_transfer: 0, airtel_money: 0, mpesa: 0, mix_by_yas: 0, credit: 0 };
    if (amt <= 0) return empty;
    const m = String(paymentMethod || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (m === 'cash') return { ...empty, cash: amt };
    if (m === 'bank transfer') return { ...empty, bank_transfer: amt };
    if (m === 'airtel money') return { ...empty, airtel_money: amt };
    if (m === 'm-pesa' || m === 'mpesa') return { ...empty, mpesa: amt };
    if (m.includes('mix') && m.includes('yas')) return { ...empty, mix_by_yas: amt };
    if (m === 'credit card' || m === 'credit') return { ...empty, credit: amt };
    return empty;
  };

  const getPaymentChannelsList = (p) => {
    if (!p) return [];
    return [
      { label: t.cash || 'Cash', val: toNumPayment(p.cash) },
      { label: t.bankTransfer || 'Bank Transfer', val: toNumPayment(p.bank_transfer) },
      { label: t.airtelMoney || 'Airtel Money', val: toNumPayment(p.airtel_money) },
      { label: 'M-Pesa', val: toNumPayment(p.mpesa) },
      { label: t.mixByYas || 'Mix by YAS', val: toNumPayment(p.mix_by_yas) }
    ].filter((c) => c.val > 0);
  };

  const paymentMethodForPrintRow = (p) => {
    const isLoan = String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
    if (isLoan && dateFrom && dateTo) {
      const inRange = Number(p?.amount_received_in_range) || 0;
      const method = String(p?.payment_method || '—').trim() || '—';
      if (inRange > 0) return `${method} · ${formatCurrency(inRange)}`;
      return method;
    }
    const ch = getPaymentChannelsList(p);
    if (ch.length >= 2) return ch.map((c) => `${c.label} ${formatCurrency(c.val)}`).join('\n');
    if (ch.length === 1) return `${ch[0].label} · ${formatCurrency(ch[0].val)}`;
    const method = String(p?.payment_method || '—').trim() || '—';
    const amt = Number(p?.amount_received) || 0;
    if (amt > 0) return `${method} · ${formatCurrency(amt)}`;
    return method;
  };

  const amountReceivedSumForPrintRow = (p) => {
    const isLoan = String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
    if (isLoan && dateFrom && dateTo) return Number(p?.amount_received_in_range) || 0;
    const ch = getPaymentChannelsList(p);
    if (ch.length >= 1) return ch.reduce((s, c) => s + c.val, 0);
    return Number(p?.amount_received) || 0;
  };

  const buildPrintSummaryFromApprovedRows = (approvedRows) => {
    const toN = (v) => Number(v) || 0;
    const isLoanT = (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
    const isSalesT = (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'sales';
    const loanReceivedForPrint = (p) =>
      dateFrom && dateTo ? toN(p.amount_received_in_range) : toN(p.amount_received);
    const receiptsSales = approvedRows.filter((p) => isSalesT(p) && p.status !== 'Pending');
    const loanPaidRows = approvedRows.filter((p) => {
      if (p.status !== 'Approved') return false;
      const received = loanReceivedForPrint(p);
      if (received <= 0 || !isLoanT(p)) return false;
      const netDue = Math.max(0, (Number(p.total_amount) || 0) - (Number(p.discount_amount) || 0));
      if (netDue <= 0) return false;
      const remain = getAmountRemainLoan(p);
      if (Number.isNaN(remain)) return false;
      return remain === 0 || remain > 0;
    });
    const cashTotal = receiptsSales.reduce((s, p) => s + toN(p.cash), 0);
    const bankTotal = receiptsSales.reduce((s, p) => s + toN(p.bank_transfer), 0);
    const airtelTotal = receiptsSales.reduce((s, p) => s + toN(p.airtel_money), 0);
    const mpesaTotal = receiptsSales.reduce((s, p) => s + toN(p.mpesa), 0);
    const yasTotal = receiptsSales.reduce((s, p) => s + toN(p.mix_by_yas), 0);
    const loanPaidTotal = loanPaidRows.reduce((s, p) => s + loanReceivedForPrint(p), 0);
    const loanPaidChannels = loanPaidRows.map((p) => {
      const received = loanReceivedForPrint(p);
      if (dateFrom && dateTo && received > 0) return allocateLoanChannelAmounts(received, p.payment_method);
      const base = {
        cash: toN(p.cash),
        bank_transfer: toN(p.bank_transfer),
        airtel_money: toN(p.airtel_money),
        mpesa: toN(p.mpesa),
        mix_by_yas: toN(p.mix_by_yas)
      };
      const channelSum = base.cash + base.bank_transfer + base.airtel_money + base.mpesa + base.mix_by_yas;
      if (received > 0 && channelSum <= 0) return allocateLoanChannelAmounts(received, p.payment_method);
      return { ...base, credit: 0 };
    });
    return {
      cashTotal,
      bankTotal,
      airtelTotal,
      mpesaTotal,
      yasTotal,
      totalDirectSales: cashTotal + bankTotal + airtelTotal + mpesaTotal + yasTotal,
      loanPaidCashTotal: loanPaidChannels.reduce((s, c) => s + c.cash, 0),
      loanPaidBankTotal: loanPaidChannels.reduce((s, c) => s + c.bank_transfer, 0),
      loanPaidAirtelTotal: loanPaidChannels.reduce((s, c) => s + c.airtel_money, 0),
      loanPaidMpesaTotal: loanPaidChannels.reduce((s, c) => s + c.mpesa, 0),
      loanPaidYasTotal: loanPaidChannels.reduce((s, c) => s + c.mix_by_yas, 0),
      loanPaidCreditTotal: loanPaidChannels.reduce((s, c) => s + c.credit, 0),
      loanPaidTotal,
      totalAmount: cashTotal + bankTotal + airtelTotal + mpesaTotal + yasTotal + loanPaidTotal
    };
  };

  const logoSrcForPrint = () => {
    const logoPath = typeof logo === 'string' ? logo : logo?.default ? logo.default : '';
    const logoUrl = logoPath
      ? logoPath.startsWith('http')
        ? logoPath
        : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
      : window.location.origin + logo;
    return logoDataUrl || logoUrl;
  };

  const periodLabel =
    dateFrom && dateTo
      ? `${dateFrom} to ${dateTo}`
      : dateFrom
        ? `From ${dateFrom}`
        : dateTo
          ? `Until ${dateTo}`
          : t.allTime || 'All time';

  const printedBy = (user?.full_name || user?.username || 'Admin').replace(/</g, '&lt;');

  const openPrintWindow = (html) => {
    const w = window.open('', '_blank', 'width=1000,height=700');
    if (!w) {
      Swal.fire({
        icon: 'warning',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the report.',
        confirmButtonColor: '#511C00'
      });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const paymentsInRange = payments.filter((p) => isInDateRange(p.created_at) && matchesSearch(p));

  const handlePrintSalesReport = () => {
    const filteredPayments = paymentsInRange;
    const totalAmount = filteredPayments.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
    const totalCount = filteredPayments.length;
    const pendingCountPrint = filteredPayments.filter((p) => p.status === 'Pending').length;
    const approvedCountPrint = filteredPayments.filter((p) => p.status === 'Approved').length;
    const rejectedCountPrint = filteredPayments.filter((p) => p.status === 'Rejected').length;
    const logoSrc = String(logoSrcForPrint()).replace(/"/g, '&quot;');
    const tableHeader = `
      <thead>
        <tr>
          <th class="tc">S.No</th>
          <th class="tl">${t.date}</th>
          <th class="tl">${t.customer}</th>
          <th class="tl">${t.sparePart}</th>
          <th class="tc">${t.status}</th>
          <th class="tr">${t.totalAmount} (TZS)</th>
        </tr>
      </thead>`;
    const rowsHtml =
      filteredPayments.length === 0
        ? `<tbody><tr><td colspan="6" style="text-align:center;padding:12px;">${t.noData || 'No data'}</td></tr></tbody>`
        : '<tbody>' +
          filteredPayments
            .map((p, idx) => {
              const spareParts =
                p.items && p.items.length > 0
                  ? p.items
                      .map(
                        (item) =>
                          `${capitalizeName(item.sparepart_name || 'Unknown')} (${(item.sparepart_number || 'N/A')
                            .toUpperCase()
                            .replace(/</g, '&lt;')})`
                      )
                      .join('<br />')
                  : (capitalizeName(p.sparepart_name || 'Unknown') || '—').replace(/</g, '&lt;');
              const statusLabel =
                p.status === 'Approved'
                  ? t.approved || 'Approved'
                  : p.status === 'Rejected'
                    ? t.rejected || 'Rejected'
                    : t.pending || 'Pending';
              return `<tr>
                <td class="tc">${idx + 1}</td>
                <td class="tl">${p.created_at ? formatDateTime(p.created_at) : ''}</td>
                <td class="tl">${(p.customer_name || '—').toUpperCase().replace(/</g, '&lt;')}</td>
                <td class="tl">${spareParts}</td>
                <td class="tc">${statusLabel}</td>
                <td class="tr">${formatPrice(p.total_amount)}</td>
              </tr>`;
            })
            .join('') +
          '</tbody>';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Sales Report - Mamuya Auto Spare Parts</title><style>${REPORT_PRINT_CSS}</style></head><body>
      <div class="tax-inv-top">
        <div class="tax-inv-left">
          <img src="${logoSrc}" alt="Logo" class="tax-inv-logo" />
          <div class="tax-inv-company">
            <h2>Mamuya Auto Spare Parts</h2>
            <p class="tax-inv-address">Dar es Salaam, Tanzania<br />Phone: +255 22 123 4567</p>
          </div>
        </div>
        <div class="tax-inv-meta">
          <p><strong>Report:</strong> Sales (All statuses)</p>
          <p><strong>Period:</strong> ${periodLabel}</p>
          <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
          <p><strong>Printed by:</strong> ${printedBy}</p>
        </div>
      </div>
      <h1 class="tax-inv-title">MANAGER SALES REPORT</h1>
      <table class="tax-inv-table">${tableHeader}${rowsHtml}</table>
      <div class="tax-inv-footer">
        <div class="tax-inv-footer-row"><label>Total transactions:</label> ${totalCount}</div>
        <div class="tax-inv-footer-row"><label>Approved:</label> ${approvedCountPrint}</div>
        <div class="tax-inv-footer-row"><label>Pending:</label> ${pendingCountPrint}</div>
        <div class="tax-inv-footer-row"><label>Rejected:</label> ${rejectedCountPrint}</div>
        <div class="tax-inv-footer-row"><label>Total amount (TZS):</label> ${formatPrice(totalAmount)}</div>
      </div>
      <p class="tax-inv-disclaimer">*This is a computer generated sales report, hence no signature is required.*</p>
    </body></html>`;
    openPrintWindow(html);
  };

  const handlePrintTransactionsReport = async () => {
    const timeFiltered = payments.filter((p) => matchesSearch(p) && isInDateRange(getRecordDateForReports(p)));
    const printedRows = timeFiltered.filter((p) => {
      const isVisibleStatus = p.status === 'Approved' || p.status === 'Returned';
      if (!isVisibleStatus) return false;
      const isLoanWithZeroReceived =
        String(p?.payment_type ?? '').trim().toLowerCase() === 'loan' && amountReceivedSumForPrintRow(p) <= 0;
      return !isLoanWithZeroReceived;
    });
    const approvedForSummary = printedRows.filter((p) => p.status === 'Approved');
    const printSummary = buildPrintSummaryFromApprovedRows(approvedForSummary);
    const singleDaySummaryNote =
      dateFrom && dateTo && dateFrom === dateTo
        ? `<div class="tax-inv-footer-row"><label>Summary scope:</label> All approved transactions on ${String(dateFrom).replace(/</g, '&lt;')} (same as listed above).</div>`
        : '';
    const rowsHtml =
      printedRows.length === 0
        ? '<tbody><tr><td colspan="9" style="text-align:center;padding:12px;">No transactions found</td></tr></tbody>'
        : '<tbody>' +
          printedRows
            .map((p, idx) => {
              const items =
                p.items && p.items.length > 0
                  ? p.items
                      .map((item) => {
                        const name = (item.sparepart_name || 'Unknown').replace(/</g, '&lt;');
                        const qty = Number(item.quantity) || 0;
                        return `${name} <span class="item-qty">(${qty})</span>`;
                      })
                      .join('<br />')
                  : `${(p.sparepart_name || '—').replace(/</g, '&lt;')} <span class="item-qty">(${Number(p.quantity) || 0})</span>`;
              const paymentMethodCell = String(paymentMethodForPrintRow(p) || '—')
                .replace(/</g, '&lt;')
                .replace(/\n/g, '<br />');
              const printableStatus =
                p.status === 'Returned' || Number(p.return_amount) > 0 ? 'Returned' : getStatusLabel(p.status);
              const amountRemain =
                p.amount_remain != null
                  ? Math.max(0, Number(p.amount_remain) || 0)
                  : Math.max(0, (Number(p.total_amount) || 0) - (Number(p.discount_amount) || 0) - (Number(p.amount_received) || 0));
              const recordDate = getRecordDateForReports(p);
              return `<tr>
                <td class="tc">${idx + 1}</td>
                <td class="tl">${recordDate ? String(recordDate).replace('T', ' ').slice(0, 16) : ''}</td>
                <td class="tl">${(p.customer_name || '—').toUpperCase().replace(/</g, '&lt;')}</td>
                <td class="tl">${items}</td>
                <td class="tc">${String(p.payment_type || '—').replace(/</g, '&lt;')}</td>
                <td class="tc">${paymentMethodCell}</td>
                <td class="tr">${formatCurrency(amountReceivedSumForPrintRow(p))}</td>
                <td class="tr">${formatCurrency(amountRemain)}</td>
                <td class="tl">${printableStatus}</td>
              </tr>`;
            })
            .join('') +
          '</tbody>';

    let expenses = [];
    let expensesLoadError = '';
    try {
      const expensesResponse = await getExpenses(dateFrom || dateTo ? { from: dateFrom, to: dateTo } : {});
      const rows = Array.isArray(expensesResponse?.expenses)
        ? expensesResponse.expenses
        : Array.isArray(expensesResponse)
          ? expensesResponse
          : [];
      if (expensesResponse?.success === false) {
        expensesLoadError = expensesResponse.message || 'Failed to load expenses';
      } else {
        expenses = rows;
      }
    } catch (error) {
      expensesLoadError = error?.message || 'Failed to load expenses';
    }
    const expenseDateOnly = (expense) => {
      const raw = expense?.date || expense?.expense_date || expense?.created_at;
      if (!raw) return '';
      const text = String(raw);
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
      const parsed = new Date(text);
      if (Number.isNaN(parsed.getTime())) return text.slice(0, 10);
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    };
    const expensesInRange = expenses.filter((expense) => {
      const dateOnly = expenseDateOnly(expense);
      if (!dateOnly) return !dateFrom && !dateTo;
      if (dateFrom && dateOnly < dateFrom) return false;
      if (dateTo && dateOnly > dateTo) return false;
      return true;
    });
    const expensesTotal = expensesInRange.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    const amountEarnedToday = (Number(printSummary.totalAmount) || 0) - expensesTotal;
    const expensesRowsHtml = expensesLoadError
      ? `<tbody><tr><td colspan="6" style="text-align:center;padding:12px;">${String(expensesLoadError).replace(/</g, '&lt;')}</td></tr></tbody>`
      : expensesInRange.length === 0
        ? '<tbody><tr><td colspan="6" style="text-align:center;padding:12px;">No expenses found</td></tr></tbody>'
        : '<tbody>' +
          expensesInRange
            .map(
              (expense, idx) => `<tr>
                <td class="tc">${idx + 1}</td>
                <td class="tl">${expenseDateOnly(expense)}</td>
                <td class="tl">${String(expense.description || '—').replace(/</g, '&lt;')}</td>
                <td class="tl">${String(expense.category || '—').replace(/</g, '&lt;')}</td>
                <td class="tr">${formatCurrency(expense.amount)}</td>
                <td class="tl">${String(expense.status || '—').replace(/</g, '&lt;')}</td>
              </tr>`
            )
            .join('') +
          '</tbody>';
    const logoSrc = String(logoSrcForPrint()).replace(/"/g, '&quot;');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Transactions Report - Mamuya Auto Spare Parts</title><style>${REPORT_PRINT_CSS}</style></head><body>
      <div class="tax-inv-top">
        <div class="tax-inv-left">
          <img src="${logoSrc}" alt="Logo" class="tax-inv-logo" />
          <div class="tax-inv-company">
            <h2>Mamuya Auto Spare Parts</h2>
            <p class="tax-inv-address">Dar es Salaam, Tanzania<br />Phone: +255 22 123 4567</p>
          </div>
        </div>
        <div class="tax-inv-meta">
          <p><strong>Report:</strong> Manager transactions (all payment methods)</p>
          <p><strong>Period:</strong> ${periodLabel}</p>
          <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
          <p><strong>Printed by:</strong> ${printedBy}</p>
        </div>
      </div>
      <h1 class="tax-inv-title">TRANSACTIONS REPORT</h1>
      <table class="tax-inv-table">
        <thead><tr>
          <th class="tc">S.No</th><th class="tl">Date</th><th class="tl">Customer</th><th class="tl">Items</th>
          <th class="tc">Payment type</th><th class="tc">Payment method</th>
          <th class="tr">Amount received (TZS)</th><th class="tr">Amount remain (TZS)</th><th class="tl">Status</th>
        </tr></thead>
        ${rowsHtml}
      </table>
      <h2 style="margin:8px 0 12px;font-size:1.05rem;font-weight:700;letter-spacing:0.04em;">EXPENSES</h2>
      <table class="tax-inv-table">
        <thead><tr>
          <th class="tc">S.No</th><th class="tl">Date</th><th class="tl">Description</th><th class="tl">Category</th>
          <th class="tr">Amount (TZS)</th><th class="tl">Status</th>
        </tr></thead>
        ${expensesRowsHtml}
      </table>
      <div class="tax-inv-footer">
        ${singleDaySummaryNote}
        <div class="tax-inv-footer-row"><label>Direct Sales by Cash (TZS):</label> ${formatCurrency(printSummary.cashTotal)}</div>
        <div class="tax-inv-footer-row"><label>Direct Sales by Bank transfer (TZS):</label> ${formatCurrency(printSummary.bankTotal)}</div>
        <div class="tax-inv-footer-row"><label>Direct Sales by Airtel Money (TZS):</label> ${formatCurrency(printSummary.airtelTotal)}</div>
        <div class="tax-inv-footer-row"><label>Direct Sales by M-Pesa (TZS):</label> ${formatCurrency(printSummary.mpesaTotal)}</div>
        <div class="tax-inv-footer-row"><label>Direct Sales by Mix by YAS (TZS):</label> ${formatCurrency(printSummary.yasTotal)}</div>
        <div class="tax-inv-footer-row"><label>Total Direct Sales (TZS):</label> ${formatCurrency(printSummary.totalDirectSales)}</div>
        <div class="tax-inv-footer-row"><label>Loan paid by Cash (TZS):</label> ${formatCurrency(printSummary.loanPaidCashTotal)}</div>
        <div class="tax-inv-footer-row"><label>Loan paid by Bank transfer (TZS):</label> ${formatCurrency(printSummary.loanPaidBankTotal)}</div>
        <div class="tax-inv-footer-row"><label>Loan paid by Airtel Money (TZS):</label> ${formatCurrency(printSummary.loanPaidAirtelTotal)}</div>
        <div class="tax-inv-footer-row"><label>Loan paid by M-Pesa (TZS):</label> ${formatCurrency(printSummary.loanPaidMpesaTotal)}</div>
        <div class="tax-inv-footer-row"><label>Loan paid by Mix by YAS (TZS):</label> ${formatCurrency(printSummary.loanPaidYasTotal)}</div>
        <div class="tax-inv-footer-row"><label>Loan paid by Credit (TZS):</label> ${formatCurrency(printSummary.loanPaidCreditTotal)}</div>
        <div class="tax-inv-footer-row"><label>Total Loan paid (TZS):</label> ${formatCurrency(printSummary.loanPaidTotal)}</div>
        <div class="tax-inv-footer-row"><label>Total amount received (TZS):</label> ${formatCurrency(printSummary.totalAmount)}</div>
        <div class="tax-inv-footer-row"><label>Total expenses (TZS):</label> ${formatCurrency(expensesTotal)}</div>
        <div class="tax-inv-footer-row earned"><label>Total amount earned Today (TZS):</label> ${formatCurrency(amountEarnedToday)}</div>
      </div>
      <p class="tax-inv-disclaimer">*This is a computer generated transactions report, hence no signature is required.*</p>
    </body></html>`;
    openPrintWindow(html);
  };

  const handlePrintLoansReport = () => {
    const loanRows = paymentsInRange.filter(
      (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'loan'
    );
    const sortedLoanRows = [...loanRows].sort(
      (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
    );
    const totalLoanAmount = sortedLoanRows.reduce(
      (sum, p) => sum + Math.max(0, (Number(p.total_amount) || 0) - (Number(p.discount_amount) || 0)),
      0
    );
    const totalAmountRemain = sortedLoanRows.reduce((sum, p) => sum + getAmountRemainLoan(p), 0);
    const rows =
      sortedLoanRows.length === 0
        ? '<tr><td colspan="8" style="text-align:center">No loans found</td></tr>'
        : sortedLoanRows
            .map(
              (p, idx) =>
                `<tr><td class="tc">${idx + 1}</td><td>${String(p.customer_name || '—').replace(/</g, '&lt;').toUpperCase()}</td><td>${(p.customer_phone || '—').replace(/</g, '&lt;')}</td><td class="tr">${formatPrice((Number(p.total_amount) || 0) - (Number(p.discount_amount) || 0))}</td><td class="tr">${formatPrice(getAmountRemainLoan(p))}</td><td class="tr">${formatPrice(Number(p.amount_received) || 0)}</td><td>${(p.payment_method || '—').replace(/</g, '&lt;')}</td><td>${(p.status || '—').replace(/</g, '&lt;')}</td></tr>`
            )
            .join('');
    const logoSrc = String(logoSrcForPrint()).replace(/"/g, '&quot;');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Loans Report</title><style>${REPORT_PRINT_CSS}</style></head><body>
      <div class="tax-inv-top">
        <div class="tax-inv-left">
          <img src="${logoSrc}" alt="Logo" class="tax-inv-logo" />
          <div class="tax-inv-company">
            <h2>Mamuya Auto Spare Parts</h2>
            <p class="tax-inv-address">Dar es Salaam, Tanzania</p>
            <div class="tax-inv-contact"><span>Tel: +255 757171337</span></div>
          </div>
        </div>
        <div class="tax-inv-meta">
          <p><strong>TRN NO:</strong> 182-150-770</p>
          <p><strong>Report No:</strong> LNS-${new Date().toISOString().slice(0, 10)}</p>
          <p><strong>Period:</strong> ${String(periodLabel).replace(/</g, '&lt;')}</p>
          <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
        </div>
      </div>
      <h1 class="tax-inv-title">LOANS REPORT</h1>
      <table class="tax-inv-table">
        <thead><tr>
          <th>S.No</th><th>Customer</th><th>Phone</th><th>Total (TZS)</th><th>Remain (TZS)</th><th>Received (TZS)</th><th>Payment</th><th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="tax-inv-footer">
        <div class="tax-inv-footer-row"><label>TOTAL LOAN AMOUNT:</label> TZS ${formatPrice(totalLoanAmount)}</div>
        <div class="tax-inv-footer-row"><label>TOTAL AMOUNT REMAIN:</label> TZS ${formatPrice(totalAmountRemain)}</div>
      </div>
      <p class="tax-inv-disclaimer">*This is a computer generated receipt, hence no signature is required.*</p>
    </body></html>`;
    openPrintWindow(html);
  };

  if (loading) {
    return <PageLoader message={t.loading || 'Loading...'} />;
  }

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/admin/dashboard" className="nav-item">
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/admin/categories-brands" className="nav-item">
            <FaTags className="nav-icon" />
            <span>{t.categoriesBrands}</span>
          </Link>
          <Link to="/admin/spareparts" className="nav-item">
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/admin/stock-history" className="nav-item">
            <FaHistory className="nav-icon" />
            <span>{t.stockHistory}</span>
          </Link>
          <Link to="/admin/sales" className="nav-item">
            <FaShoppingCart className="nav-icon" />
            <span>{t.sales}</span>
          </Link>
          <Link to="/admin/employees" className="nav-item">
            <FaUsers className="nav-icon" />
            <span>{t.employees}</span>
          </Link>
          <Link
            to="/admin/transactions"
            className={'nav-item' + (location.pathname === '/admin/transactions' ? ' active' : '')}
          >
            <FaCalendarAlt className="nav-icon" />
            <span>Transactions</span>
          </Link>
          <Link
            to="/admin/expenses"
            className={'nav-item' + (location.pathname === '/admin/expenses' ? ' active' : '')}
          >
            <FaWallet className="nav-icon" />
            <span>{t.expenses || 'Expenses'}</span>
          </Link>
          <Link to="/admin/reports" className="nav-item active">
            <FaChartBar className="nav-icon" />
            <span>{t.reports || 'Reports'}</span>
          </Link>
          <Link to="/admin/settings" className="nav-item">
            <FaCog className="nav-icon" />
            <span>{t.settings}</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.reports || 'Reports'}</h1>
          </div>

          <div className="header-right">
            <div style={{ marginRight: '15px' }}>
              <LanguageSelector />
            </div>
            <div className="date-time-display" style={{
              marginRight: '20px',
              fontSize: '14px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <FaCalendarAlt style={{ fontSize: '16px' }} />
              <span>{currentDateTime}</span>
            </div>
            <button
              className="notification-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'default',
                position: 'relative',
                marginRight: '15px',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '18px',
                transition: 'all 0.3s ease'
              }}
              disabled
              title="New operations count"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.color = '#511C00';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#666';
              }}
            >
              <FaBell />
              {notificationCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '50%',
                    minWidth: '16px',
                    height: '16px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    padding: notificationCount > 9 ? '0 4px' : '0'
                  }}
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <div style={{ marginRight: '15px' }}>
              <ThemeToggle />
            </div>
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{user?.username || 'Admin'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        <div className="dashboard-content admin-reports">
          <section className="admin-reports-hero">
            <div>
              <p className="admin-reports-kicker">Mamuya Auto Spare Parts</p>
              <h2>Operations reports</h2>
              <p>Review totals, then print sales, transactions, or loans for the period you choose.</p>
            </div>
            <div className="admin-reports-period">
              <FaCalendarAlt aria-hidden />
              <span>Showing: {periodLabel}</span>
            </div>
          </section>

          <section className="admin-reports-filters">
            <div className="reports-filter-group reports-filter-search">
              <label className="reports-filter-label">Search</label>
              <div className="admin-reports-search">
                <FaSearch aria-hidden />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Customer, phone, method..."
                />
              </div>
            </div>
            <div className="reports-filter-group">
              <label className="reports-filter-label">From</label>
              <StyledDateInput
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="status-filter"
              />
            </div>
            <div className="reports-filter-group">
              <label className="reports-filter-label">To</label>
              <StyledDateInput
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="status-filter"
              />
            </div>
            <button
              type="button"
              className="admin-reports-clear"
              onClick={() => {
                setSearchTerm('');
                setDateFrom('');
                setDateTo('');
              }}
            >
              Clear
            </button>
          </section>

          <section className="admin-reports-print-grid">
            <article className="admin-reports-print-card admin-reports-print-card--sales">
              <span className="admin-reports-print-icon"><FaShoppingCart aria-hidden /></span>
              <h3>Sales report</h3>
              <p>All sales in the selected period, with status counts and the total amount.</p>
              <button type="button" onClick={handlePrintSalesReport}>
                <FaPrint aria-hidden /> Print sales report
              </button>
            </article>
            <article className="admin-reports-print-card admin-reports-print-card--transactions">
              <span className="admin-reports-print-icon"><FaFileInvoice aria-hidden /></span>
              <h3>Transactions report</h3>
              <p>Approved transactions, expenses, and the amount earned for the same period.</p>
              <button type="button" onClick={handlePrintTransactionsReport}>
                <FaPrint aria-hidden /> Print transactions report
              </button>
            </article>
            <article className="admin-reports-print-card admin-reports-print-card--loans">
              <span className="admin-reports-print-icon"><FaMoneyBillWave aria-hidden /></span>
              <h3>Loans report</h3>
              <p>Loan balances, amount received, and the total still outstanding.</p>
              <button type="button" onClick={handlePrintLoansReport}>
                <FaPrint aria-hidden /> Print loans report
              </button>
            </article>
          </section>

          <section className="admin-reports-links">
            <h3>Open a related page</h3>
            <div className="reports-actions-grid">
              {reportActions.map((action) => (
                <button
                  key={action.route}
                  type="button"
                  className="reports-action-card"
                  onClick={() => navigate(action.route)}
                >
                  <strong>{action.title}</strong>
                  <span>{action.description}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AdminReports;
