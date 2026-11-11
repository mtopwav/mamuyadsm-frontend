import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaFileInvoice,
  FaReceipt,
  FaMoneyBillWave,
  FaWallet,
  FaChartBar,
  FaBox,
  FaUsers,
  FaCalendarAlt,
  FaSearch,
  FaPlus,
  FaEye,
  FaEdit,
  FaPrint,
  FaCheckCircle,
  FaClock,
  FaTags
} from 'react-icons/fa';
import './manager-layout.css';
import './expenses.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getCurrentDateTime, formatDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import { PageLoader, InlineLoader } from '../../components/LoadingSpinner';
import { getExpenses, createExpense, updateExpense } from '../../services/api';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Salaries',
  'Transport',
  'Supplies',
  'Maintenance',
  'Marketing',
  'Fuel',
  'Communication',
  'Other'
];

const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  description: '',
  category: '',
  amount: '',
  status: 'Pending'
});

function ManagerExpenses() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [expenses, setExpenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        navigate('/login');
        return;
      }
    } else {
      navigate('/login');
      return;
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadExpenses();
  }, [user]);

  const loadExpenses = async () => {
    setDataLoading(true);
    try {
      const res = await getExpenses();
      if (res?.success) {
        setExpenses(Array.isArray(res.expenses) ? res.expenses : []);
      } else {
        setExpenses([]);
        Swal.fire({
          icon: 'error',
          title: t.error || 'Error',
          text: res?.message || t.failedToLoadExpenses || 'Failed to load expenses.',
          confirmButtonColor: '#511C00'
        });
      }
    } catch (err) {
      setExpenses([]);
      Swal.fire({
        icon: 'error',
        title: t.error || 'Error',
        text: err?.message || t.failedToLoadExpenses || 'Failed to load expenses.',
        confirmButtonColor: '#511C00'
      });
    } finally {
      setDataLoading(false);
    }
  };

  const capitalizeName = (name) => {
    if (!name) return '';
    return String(name)
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatPrice = (value) => {
    const n = Number(value);
    if (Number.isNaN(n)) return '0';
    return Math.round(n).toLocaleString('en-US');
  };

  const formatAmountInput = (raw) => {
    const digits = String(raw ?? '').replace(/[^\d]/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('en-US');
  };

  const parseAmountInput = (value) => {
    const cleaned = String(value ?? '').replace(/,/g, '').trim();
    if (!cleaned) return NaN;
    return parseFloat(cleaned);
  };

  const normalizeDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const inTimeRange = (expenseDate) => {
    const d = normalizeDate(expenseDate);
    if (!d) return timeFilter === 'all';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (timeFilter === 'today') return d.getTime() === today.getTime();
    if (timeFilter === 'week') {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return d >= from && d <= today;
    }
    if (timeFilter === 'month') {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return d >= from && d <= today;
    }
    if (timeFilter === 'custom') {
      const from = customDateFrom ? normalizeDate(customDateFrom) : null;
      const to = customDateTo ? normalizeDate(customDateTo) : null;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }
    return true;
  };

  const categoryOptions = useMemo(() => {
    const fromData = expenses.map((e) => e.category).filter(Boolean);
    return Array.from(new Set([...EXPENSE_CATEGORIES, ...fromData])).sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (statusFilter !== 'All' && expense.status !== statusFilter) return false;
      if (categoryFilter !== 'All' && expense.category !== categoryFilter) return false;
      if (!inTimeRange(expense.date || expense.expense_date || expense.created_at)) return false;
      if (!q) return true;
      const haystack = [expense.description, expense.category, expense.status, expense.amount]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [expenses, searchTerm, statusFilter, categoryFilter, timeFilter, customDateFrom, customDateTo]);

  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      const da = new Date(a.date || a.created_at || 0).getTime();
      const db = new Date(b.date || b.created_at || 0).getTime();
      return db - da;
    });
  }, [filteredExpenses]);

  const pendingCount = filteredExpenses.filter((e) => e.status === 'Pending').length;
  const paidCount = filteredExpenses.filter((e) => e.status === 'Paid').length;
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const openAddModal = () => {
    setForm(emptyForm());
    setSelectedExpense(null);
    setShowAddModal(true);
  };

  const openEditModal = (expense) => {
    const rawDate = expense.date || expense.expense_date;
    const dateStr = rawDate ? String(rawDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
    setSelectedExpense(expense);
    setForm({
      date: dateStr,
      description: expense.description || '',
      category: expense.category || '',
      amount: expense.amount != null ? formatAmountInput(expense.amount) : '',
      status: expense.status === 'Paid' ? 'Paid' : 'Pending'
    });
    setShowEditModal(true);
  };

  const openViewModal = (expense) => {
    setSelectedExpense(expense);
    setShowViewModal(true);
  };

  const validateForm = () => {
    if (!form.description.trim()) {
      Swal.fire({
        icon: 'warning',
        title: t.required || 'Required',
        text: t.descriptionRequired || 'Description is required.',
        confirmButtonColor: '#511C00'
      });
      return false;
    }
    if (!form.category.trim()) {
      Swal.fire({
        icon: 'warning',
        title: t.required || 'Required',
        text: t.categoryRequired || 'Category is required.',
        confirmButtonColor: '#511C00'
      });
      return false;
    }
    const amountNum = parseAmountInput(form.amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      Swal.fire({
        icon: 'warning',
        title: t.invalid || 'Invalid',
        text: t.amountMustBePositive || 'Amount must be a positive number.',
        confirmButtonColor: '#511C00'
      });
      return false;
    }
    return true;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateForm() || saving) return;
    setSaving(true);
    try {
      const body = {
        date: form.date || new Date().toISOString().slice(0, 10),
        description: form.description.trim(),
        category: form.category.trim(),
        amount: parseAmountInput(form.amount),
        status: form.status === 'Paid' ? 'Paid' : 'Pending',
        added_by: user?.id ?? null
      };
      const res = await createExpense(body);
      if (res?.success) {
        if (res.expense) {
          setExpenses((prev) => [res.expense, ...prev.filter((row) => row.id !== res.expense.id)]);
        }
        setShowAddModal(false);
        setForm(emptyForm());
        await loadExpenses();
        Swal.fire({
          icon: 'success',
          title: t.success || 'Success',
          text: t.expenseCreated || 'Expense created.',
          confirmButtonColor: '#511C00',
          timer: 1800,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: t.error || 'Error',
          text: res?.message || t.failedToSaveExpense || 'Failed to save expense.',
          confirmButtonColor: '#511C00'
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: t.error || 'Error',
        text: err?.message || t.failedToSaveExpense || 'Failed to save expense.',
        confirmButtonColor: '#511C00'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedExpense?.id || !validateForm() || saving) return;
    setSaving(true);
    try {
      const body = {
        date: form.date || new Date().toISOString().slice(0, 10),
        description: form.description.trim(),
        category: form.category.trim(),
        amount: parseAmountInput(form.amount),
        status: form.status === 'Paid' ? 'Paid' : 'Pending'
      };
      const res = await updateExpense(selectedExpense.id, body);
      if (res?.success) {
        setShowEditModal(false);
        setSelectedExpense(null);
        setForm(emptyForm());
        await loadExpenses();
        Swal.fire({
          icon: 'success',
          title: t.success || 'Success',
          text: t.expenseUpdated || 'Expense updated.',
          confirmButtonColor: '#511C00',
          timer: 1800,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: t.error || 'Error',
          text: res?.message || t.failedToSaveExpense || 'Failed to save expense.',
          confirmButtonColor: '#511C00'
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: t.error || 'Error',
        text: err?.message || t.failedToSaveExpense || 'Failed to save expense.',
        confirmButtonColor: '#511C00'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const rows = sortedExpenses
      .map(
        (expense, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${expense.date ? String(expense.date).slice(0, 10) : '—'}</td>
        <td>${expense.description || '—'}</td>
        <td>${expense.category || '—'}</td>
        <td>TZS ${formatPrice(expense.amount)}</td>
        <td>${expense.status || '—'}</td>
      </tr>`
      )
      .join('');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${t.expenses || 'Expenses'}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
        h1 { color: #511C00; margin-bottom: 4px; }
        .meta { color: #666; margin-bottom: 18px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #511C00; color: #fff; }
        tfoot td { font-weight: bold; }
      </style></head><body>
      <h1>${t.expensesReport || 'Expenses Report'}</h1>
      <div class="meta">${currentDateTime} · ${sortedExpenses.length} ${t.records || 'records'}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>${t.date || 'Date'}</th>
            <th>${t.description || 'Description'}</th>
            <th>${t.category || 'Category'}</th>
            <th>${t.amount || 'Amount'}</th>
            <th>${t.status || 'Status'}</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="6">${t.noExpensesFound || 'No expenses found'}</td></tr>`}</tbody>
        <tfoot>
          <tr>
            <td colspan="4">${t.totalAmount || 'Total Amount'}</td>
            <td colspan="2">TZS ${formatPrice(totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const renderExpenseForm = (onSubmit, title, submitLabel) => (
    <div className="modal-overlay" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
      <div className="modal-content expenses-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="close-btn"
            onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
          >
            ×
          </button>
        </div>
        <form onSubmit={onSubmit} className="expenses-form">
          <div className="form-row">
            <div className="form-group">
              <label>{t.date || 'Date'} *</label>
              <input
                type="date"
                className="manager-form-input"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>{t.status || 'Status'}</label>
              <select
                className="manager-form-input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="Pending">{t.pending || 'Pending'}</option>
                <option value="Paid">{t.paid || 'Paid'}</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>{t.description || 'Description'} *</label>
            <textarea
              className="manager-form-input expenses-textarea"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={t.expenseDescriptionPlaceholder || 'What was this expense for?'}
              rows={3}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t.category || 'Category'} *</label>
              <select
                className="manager-form-input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                required
              >
                <option value="">{t.selectCategory || 'Select category'}</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t.amount || 'Amount'} (TZS) *</label>
              <input
                type="text"
                inputMode="numeric"
                className="manager-form-input"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: formatAmountInput(e.target.value) }))}
                placeholder="1,000"
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
              disabled={saving}
            >
              {t.cancel || 'Cancel'}
            </button>
            <button type="submit" className="submit-btn" disabled={saving}>
              {saving ? (t.saving || 'Saving...') : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

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
            <span>{t.loans}</span>
          </Link>
          <Link to="/manager/expenses" className={'nav-item ' + (location.pathname === '/manager/expenses' ? 'active' : '')}>
            <FaWallet className="nav-icon" />
            <span>{t.expenses}</span>
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
            <h1 className="page-title">{t.managerExpenses || t.expenses}</h1>
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

        <div className="payments-content expenses-page">
          <section className="manager-welcome-section expenses-hero">
            <div className="expenses-hero-text">
              <h2>{t.expensesList || 'Expenses List'}</h2>
              <p>{t.expensesIntro || 'Track business costs, filter by status or category, and keep payment status up to date.'}</p>
            </div>
            <div className="expenses-hero-accent" aria-hidden="true">
              <FaWallet />
            </div>
          </section>

          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchExpensesPlaceholder || 'Search description, category, amount...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter"
              >
                <option value="All">{t.allStatus || 'All Status'}</option>
                <option value="Pending">{t.pending || 'Pending'}</option>
                <option value="Paid">{t.paid || 'Paid'}</option>
              </select>
            </div>
            <div className="filter-box">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="status-filter"
              >
                <option value="All">{t.allCategories || 'All Categories'}</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="filter-box manager-time-filter-group">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="status-filter"
              >
                <option value="all">{t.allTime || 'All time'}</option>
                <option value="today">{t.today || 'Today'}</option>
                <option value="week">{t.last7Days || 'Last 7 days'}</option>
                <option value="month">{t.last30Days || 'Last 30 days'}</option>
                <option value="custom">{t.customRange || 'Custom range'}</option>
              </select>
              {timeFilter === 'custom' && (
                <div className="manager-date-range-inputs" aria-label="Date range">
                  <label className="manager-date-range-label">
                    <span>{t.fromDate || 'From'}</span>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="manager-date-input"
                    />
                  </label>
                  <label className="manager-date-range-label">
                    <span>{t.toDate || 'To'}</span>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="manager-date-input"
                    />
                  </label>
                </div>
              )}
            </div>
            <button type="button" className="add-btn" onClick={openAddModal}>
              <FaPlus /> {t.addExpense || 'Add Expense'}
            </button>
          </div>

          <div className="stats-row manager-stats-row expenses-stats">
            <div className="stat-card expenses-stat-total">
              <div className="stat-info">
                <h3>{t.totalExpenses || 'Total Expenses'}</h3>
                <p className="stat-value">{filteredExpenses.length}</p>
              </div>
            </div>
            <div className="stat-card expenses-stat-pending">
              <div className="stat-info">
                <h3>{t.pending || 'Pending'}</h3>
                <p className="stat-value">{pendingCount}</p>
              </div>
            </div>
            <div className="stat-card expenses-stat-paid">
              <div className="stat-info">
                <h3>{t.paid || 'Paid'}</h3>
                <p className="stat-value">{paidCount}</p>
              </div>
            </div>
            <div className="stat-card expenses-stat-amount">
              <div className="stat-info">
                <h3>{t.totalAmount || 'Total Amount'}</h3>
                <p className="stat-value expenses-amount-value">TZS {formatPrice(totalAmount)}</p>
              </div>
            </div>
          </div>

          <section className="manager-transactions-table-section">
            <div className="manager-section-title-row">
              <h3 className="manager-section-title">{t.expensesList || 'Expenses List'}</h3>
              <span className="manager-filter-summary">
                {searchTerm || statusFilter !== 'All' || categoryFilter !== 'All' || timeFilter !== 'all'
                  ? (t.showingXOfYExpenses || 'Showing {x} of {y} expenses')
                      .replace('{x}', String(filteredExpenses.length))
                      .replace('{y}', String(expenses.length))
                  : (t.showingXExpenses || 'Showing {x} expenses').replace('{x}', String(filteredExpenses.length))}
              </span>
              <button
                type="button"
                onClick={handlePrint}
                className="action-btn print"
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FaPrint className="action-icon" />
                <span className="action-text">{t.print || 'Print'}</span>
              </button>
            </div>

            <div className="table-container">
              <table className="payments-table expenses-table">
                <thead>
                  <tr>
                    <th className="manager-col-actions">{t.actions || 'Actions'}</th>
                    <th>{t.date || 'Date'}</th>
                    <th>{t.description || 'Description'}</th>
                    <th>{t.category || 'Category'}</th>
                    <th>{t.amount || 'Amount'}</th>
                    <th>{t.status || 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    <tr>
                      <td colSpan="6" className="no-data loading-cell">
                        <InlineLoader message={t.loadingExpenses || t.loading || 'Loading...'} size="md" />
                      </td>
                    </tr>
                  ) : sortedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">
                        {t.noExpensesFound || 'No expenses found'}
                      </td>
                    </tr>
                  ) : (
                    sortedExpenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="manager-col-actions">
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="action-btn view"
                              title={t.view || 'View'}
                              onClick={() => openViewModal(expense)}
                            >
                              <FaEye className="action-icon" />
                              <span className="action-text">{t.view || 'View'}</span>
                            </button>
                            <button
                              type="button"
                              className="action-btn edit"
                              title={t.edit || 'Edit'}
                              onClick={() => openEditModal(expense)}
                            >
                              <FaEdit className="action-icon" />
                              <span className="action-text">{t.edit || 'Edit'}</span>
                            </button>
                          </div>
                        </td>
                        <td className="date-cell">
                          {expense.date ? String(expense.date).slice(0, 10) : '—'}
                        </td>
                        <td>
                          <div className="expenses-desc-cell">
                            <span className="expenses-desc-text">{expense.description || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="expenses-category-badge">
                            <FaTags aria-hidden />
                            {expense.category || '—'}
                          </span>
                        </td>
                        <td className="amount-cell">TZS {formatPrice(expense.amount)}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              expense.status === 'Paid' ? 'Paid' : 'Pending'
                            }`}
                          >
                            {expense.status === 'Paid' ? <FaCheckCircle /> : <FaClock />}
                            {expense.status === 'Paid' ? (t.paid || 'Paid') : (t.pending || 'Pending')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {showAddModal && renderExpenseForm(handleCreate, t.addExpense || 'Add Expense', t.addExpense || 'Add Expense')}
      {showEditModal && renderExpenseForm(handleUpdate, t.editExpense || 'Edit Expense', t.save || 'Save')}

      {showViewModal && selectedExpense && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content expenses-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.expenseDetails || 'Expense Details'}</h2>
              <button type="button" className="close-btn" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="expenses-view-body">
              <div className="expenses-view-row">
                <label>{t.date || 'Date'}</label>
                <span>{selectedExpense.date ? String(selectedExpense.date).slice(0, 10) : '—'}</span>
              </div>
              <div className="expenses-view-row">
                <label>{t.description || 'Description'}</label>
                <span>{selectedExpense.description || '—'}</span>
              </div>
              <div className="expenses-view-row">
                <label>{t.category || 'Category'}</label>
                <span>{selectedExpense.category || '—'}</span>
              </div>
              <div className="expenses-view-row">
                <label>{t.amount || 'Amount'}</label>
                <span className="amount-cell">TZS {formatPrice(selectedExpense.amount)}</span>
              </div>
              <div className="expenses-view-row">
                <label>{t.status || 'Status'}</label>
                <span className={`status-badge ${selectedExpense.status === 'Paid' ? 'Paid' : 'Pending'}`}>
                  {selectedExpense.status === 'Paid' ? (t.paid || 'Paid') : (t.pending || 'Pending')}
                </span>
              </div>
              <div className="expenses-view-row">
                <label>{t.createdAt || 'Created'}</label>
                <span>{selectedExpense.created_at ? formatDateTime(selectedExpense.created_at) : '—'}</span>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={() => setShowViewModal(false)}>
                {t.close || 'Close'}
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(selectedExpense);
                }}
              >
                <FaEdit /> {t.edit || 'Edit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerExpenses;
