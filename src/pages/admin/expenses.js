import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBox,
  FaHistory,
  FaUsers,
  FaShoppingCart,
  FaBars,
  FaSignOutAlt,
  FaChartBar,
  FaCog,
  FaUser,
  FaTags,
  FaCalendarAlt,
  FaWallet,
  FaBell,
  FaSearch,
  FaTrash
} from 'react-icons/fa';
import './dashboard.css';
import './spareparts.css';
import './expenses.css';
import logo from '../../images/logo.png';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { getExpenses, deleteExpense } from '../../services/api';
import { PageLoader } from '../../components/LoadingSpinner';
import StyledSelect from '../../components/StyledSelect';
import StyledDateInput from '../../components/StyledDateInput';

function AdminExpenses() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setLoading(false);

        if (parsedUser.userType === 'employee' && parsedUser.department === 'Sales') {
          navigate('/sales/dashboard');
          return;
        }

        if (parsedUser.userType === 'employee' && parsedUser.department === 'Finance') {
          navigate('/finance/dashboard');
          return;
        }
      } catch (error) {
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
      }
    } else {
      setLoading(false);
      setTimeout(() => navigate('/login'), 1000);
    }

    setCurrentDateTime(getCurrentDateTime());
    const dateTimeInterval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 1000);

    const handleDateFormatChange = () => {
      setCurrentDateTime(getCurrentDateTime());
    };
    window.addEventListener('dateFormatChanged', handleDateFormatChange);

    const updateNotificationCount = () => {
      setNotificationCount(getUnviewedOperationsCount());
    };
    updateNotificationCount();
    window.addEventListener('unviewedOperationsChanged', updateNotificationCount);

    return () => {
      clearInterval(dateTimeInterval);
      window.removeEventListener('dateFormatChanged', handleDateFormatChange);
      window.removeEventListener('unviewedOperationsChanged', updateNotificationCount);
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    const loadExpenses = async () => {
      setExpensesLoading(true);
      try {
        const response = await getExpenses();
        if (!active) return;
        setExpenses(response?.success && Array.isArray(response.expenses) ? response.expenses : []);
        if (!response?.success) {
          Swal.fire({
            icon: 'error',
            title: t.error || 'Error',
            text: response?.message || t.failedToLoadExpenses || 'Failed to load expenses.',
            confirmButtonColor: '#511C00'
          });
        }
      } catch (error) {
        if (!active) return;
        setExpenses([]);
        Swal.fire({
          icon: 'error',
          title: t.error || 'Error',
          text: error.message || t.failedToLoadExpenses || 'Failed to load expenses.',
          confirmButtonColor: '#511C00'
        });
      } finally {
        if (active) setExpensesLoading(false);
      }
    };
    loadExpenses();
    return () => {
      active = false;
    };
  }, [user]);

  const expenseDay = (expense) => String(expense?.date || '').slice(0, 10);

  const changeDates = useMemo(() => {
    const days = new Set();
    expenses.forEach((expense) => {
      const day = expenseDay(expense);
      if (day) days.add(day);
    });
    return Array.from(days);
  }, [expenses]);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(expenses.map((expense) => expense.category).filter(Boolean)))
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [expenses]);

  const visibleExpenses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (statusFilter !== 'All' && expense.status !== statusFilter) return false;
      if (categoryFilter !== 'All' && expense.category !== categoryFilter) return false;
      if (filterDate && expenseDay(expense) !== filterDate) return false;
      if (!query) return true;
      const haystack = [expense.description, expense.category, expense.status, expense.amount]
        .filter((value) => value != null && value !== '')
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [expenses, searchTerm, statusFilter, categoryFilter, filterDate]);

  const pendingCount = visibleExpenses.filter((expense) => expense.status === 'Pending').length;
  const paidCount = visibleExpenses.filter((expense) => expense.status === 'Paid').length;
  const totalAmount = visibleExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

  const formatExpenseDate = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
    if (!match) return '—';
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatPrice = (value) => Math.round(Number(value) || 0).toLocaleString('en-US');

  const handleDelete = async (expense) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: expense.description
        ? `Delete "${expense.description}"? This cannot be undone.`
        : 'Delete this expense? This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t.delete || 'Delete',
      cancelButtonText: t.cancel || 'Cancel'
    });
    if (!result.isConfirmed) return;

    try {
      const response = await deleteExpense(expense.id);
      if (response?.success) {
        setExpenses((prev) => prev.filter((row) => row.id !== expense.id));
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Expense deleted.',
          confirmButtonColor: '#511C00',
          timer: 1600,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: t.error || 'Error',
          text: response?.message || 'Failed to delete expense.',
          confirmButtonColor: '#511C00'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: t.error || 'Error',
        text: error.message || 'Failed to delete expense.',
        confirmButtonColor: '#511C00'
      });
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: t.logout || 'Logout',
      text: t.areYouSureLogout || 'Are you sure you want to logout?',
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

  if (loading) {
    return <PageLoader message={t.loading || 'Loading...'} />;
  }

  if (!user) {
    return null;
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
          <Link to="/admin/transactions" className="nav-item">
            <FaCalendarAlt className="nav-icon" />
            <span>Transactions</span>
          </Link>
          <Link to="/admin/expenses" className="nav-item active">
            <FaWallet className="nav-icon" />
            <span>{t.expenses || 'Expenses'}</span>
          </Link>
          <Link to="/admin/reports" className="nav-item">
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
            <h1 className="page-title">{t.expenses || 'Expenses'}</h1>
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
                fontSize: '18px'
              }}
              disabled
              title="New operations count"
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

        <div className="spareparts-content admin-expenses">
          <p className="admin-expenses-hint">Expenses added from the manager expenses page.</p>

          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder={t.searchExpensesPlaceholder || 'Search description, category, amount...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <StyledSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="All">{t.allStatus || 'All Status'}</option>
              <option value="Pending">{t.pending || 'Pending'}</option>
              <option value="Paid">{t.paid || 'Paid'}</option>
            </StyledSelect>
            <StyledSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="status-filter"
            >
              <option value="All">{t.allCategories || 'All Categories'}</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </StyledSelect>
            <label className="admin-expenses-date">
              <span>Date</span>
              <StyledDateInput
                value={filterDate}
                markedDates={expensesLoading ? undefined : changeDates}
                title="Dates with expenses"
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </label>
          </div>

          <div className="stats-grid admin-expenses-stats">
            <article className="stat-card">
              <div className="stat-info">
                <h3 className="stat-title">{t.totalExpenses || 'Total Expenses'}</h3>
                <p className="stat-value">{visibleExpenses.length}</p>
              </div>
            </article>
            <article className="stat-card admin-expenses-stat-pending">
              <div className="stat-info">
                <h3 className="stat-title">{t.pending || 'Pending'}</h3>
                <p className="stat-value">{pendingCount}</p>
              </div>
            </article>
            <article className="stat-card admin-expenses-stat-paid">
              <div className="stat-info">
                <h3 className="stat-title">{t.paid || 'Paid'}</h3>
                <p className="stat-value">{paidCount}</p>
              </div>
            </article>
            <article className="stat-card admin-expenses-stat-amount">
              <div className="stat-info">
                <h3 className="stat-title">{t.totalAmount || 'Total Amount'}</h3>
                <p className="stat-value">TZS {formatPrice(totalAmount)}</p>
              </div>
            </article>
          </div>

          {(expensesLoading || visibleExpenses.length === 0) && (
            <div className="admin-expenses-empty">
              {expensesLoading ? (t.loading || 'Loading...') : (t.noExpensesFound || 'No expenses found')}
            </div>
          )}

          {!expensesLoading && visibleExpenses.length > 0 && (
            <div className="table-container">
              <table className="spareparts-table admin-expenses-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>{t.date || 'Date'}</th>
                    <th>{t.description || 'Description'}</th>
                    <th>{t.category || 'Category'}</th>
                    <th>{t.amount || 'Amount'} (TZS)</th>
                    <th>{t.status || 'Status'}</th>
                    <th>{t.actions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleExpenses.map((expense, index) => (
                    <tr key={expense.id}>
                      <td>{index + 1}</td>
                      <td>{formatExpenseDate(expense.date)}</td>
                      <td className="admin-expenses-desc">{expense.description || '—'}</td>
                      <td>{expense.category || '—'}</td>
                      <td>{formatPrice(expense.amount)}</td>
                      <td>
                        <span className={`admin-expenses-status ${String(expense.status || '').toLowerCase()}`}>
                          {expense.status || '—'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="action-btn delete"
                            title={t.delete || 'Delete'}
                            onClick={() => handleDelete(expense)}
                          >
                            <FaTrash className="action-icon" />
                            <span className="action-text">{t.delete || 'Delete'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminExpenses;
