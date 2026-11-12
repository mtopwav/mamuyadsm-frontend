import React, { useState, useEffect } from 'react';
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
  FaWallet,
  FaChartBar,
  FaBox,
  FaUsers,
  FaCalendarAlt,
  FaPrint,
  FaDownload,
  FaEnvelope,
} from 'react-icons/fa';
import './manager-layout.css';
import './spareparts.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getSpareParts } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import { PageLoader, InlineLoader } from '../../components/LoadingSpinner';
import StyledSelect from '../../components/StyledSelect';

const LOW_STOCK_THRESHOLD = 10;

function ManagerSpareparts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showSoldoutTodayOnly, setShowSoldoutTodayOnly] = useState(false);
  const [spareParts, setSpareParts] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());

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
    setLoading(false);
  }, [navigate]);

  // Fetch spare parts from the database
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setDataLoading(true);
      try {
        const partsRes = await getSpareParts();
        if (cancelled) return;
        if (partsRes?.success && Array.isArray(partsRes.spareParts)) {
          setSpareParts(partsRes.spareParts);
        } else {
          setSpareParts([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading data:', error);
          setSpareParts([]);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to load spare parts from database.',
            confirmButtonColor: '#511C00',
          });
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(t);
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
    if (price == null || price === '') return '0';
    const num = parseFloat(String(price).replace(/,/g, ''));
    return Number.isNaN(num) ? '0' : num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const categoryFilterOptions = [
    ...new Set(spareParts.map((p) => p.category_name).filter(Boolean)),
  ].sort((a, b) => String(a).toLowerCase().localeCompare(String(b).toLowerCase()));

  const filteredParts = spareParts.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (p.part_name && p.part_name.toLowerCase().includes(term)) ||
      (p.part_number && p.part_number.toLowerCase().includes(term)) ||
      (p.category_name && p.category_name.toLowerCase().includes(term)) ||
      (p.brand_name && p.brand_name.toLowerCase().includes(term));
    const matchesCategory = categoryFilter === 'All' || p.category_name === categoryFilter;
    const qty = Number(p.quantity) || 0;
    const matchesLowStock = !showLowStockOnly || qty < LOW_STOCK_THRESHOLD;
    const updatedAt = p.updated_at ? new Date(p.updated_at) : null;
    const now = new Date();
    const isSoldoutToday =
      Number(p.soldout_quantity) > 0 &&
      updatedAt &&
      !Number.isNaN(updatedAt.getTime()) &&
      updatedAt.getFullYear() === now.getFullYear() &&
      updatedAt.getMonth() === now.getMonth() &&
      updatedAt.getDate() === now.getDate();
    const matchesSoldoutToday = !showSoldoutTodayOnly || isSoldoutToday;
    return matchesSearch && matchesCategory && matchesLowStock && matchesSoldoutToday;
  });

  const sortedParts = [...filteredParts].sort((a, b) =>
    String(a.part_name || '').toLowerCase().localeCompare(String(b.part_name || '').toLowerCase())
  );

  const totalParts = spareParts.length;
  const lowStockCount = spareParts.filter((p) => (Number(p.quantity) || 0) < LOW_STOCK_THRESHOLD).length;

  const handleSparepartsReport = (action) => {
    const safe = (v) => String(v ?? '').replace(/</g, '&lt;');
    const logoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl = logoPath
      ? (logoPath.startsWith('http') ? logoPath : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath))
      : window.location.origin + logo;
    const printedAt = new Date().toLocaleString('en-GB');
    const printedBy = safe(user?.full_name || user?.username || 'Manager');
    const categoryLabel = categoryFilter === 'All' ? 'All categories' : capitalizeName(categoryFilter);
    const scopeLabel = showLowStockOnly ? `Low stock only` : 'All stock';

    const rowsHtml =
      sortedParts.length === 0
        ? `<tr><td colspan="7" class="no-data">No spare parts found</td></tr>`
        : sortedParts
            .map((p, idx) => {
              const qty = Number(p.quantity) || 0;
              const isLow = qty < LOW_STOCK_THRESHOLD;
              const qtyAdded = Number(p.quantity_added) || 0;
              return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${safe(capitalizeName(p.part_name || '—'))}</td>
                  <td class="tl">${safe(String(p.part_number || '—').toUpperCase())}</td>
                  <td class="tl">${safe(capitalizeName(p.category_name || '—'))}</td>
                  <td class="tl">${safe(String(p.brand_name || '—').toUpperCase())}</td>
                  <td class="tr">${qtyAdded}</td>
                  <td class="tr ${isLow ? 'qty-low' : ''}">${qty}</td>
                </tr>
              `;
            })
            .join('');

    const totalQty = sortedParts.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
    const lowQtyCount = sortedParts.filter((p) => (Number(p.quantity) || 0) < LOW_STOCK_THRESHOLD).length;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Spare Parts Inventory - Mamuya Auto Spare Parts</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              max-width: 980px;
              margin: 0 auto;
              padding: 24px;
              color: #222;
              font-size: 11px;
              line-height: 1.4;
            }
            .top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 18px;
              padding-bottom: 14px;
              border-bottom: 2px solid #333;
              gap: 16px;
            }
            .left { display: flex; gap: 16px; align-items: flex-start; flex: 1; }
            .logo { max-height: 56px; max-width: 140px; object-fit: contain; }
            .company h2 { margin: 0 0 6px 0; font-size: 1.15rem; font-weight: 800; }
            .company p { margin: 0; color: #444; font-size: 10px; line-height: 1.5; }
            .meta { text-align: right; min-width: 220px; }
            .meta p { margin: 0 0 6px 0; font-size: 11px; }
            .title {
              text-align: center;
              font-size: 1.6rem;
              font-weight: 800;
              margin: 18px 0 14px;
              letter-spacing: 0.05em;
            }
            .subtitle {
              text-align: center;
              margin: 0 0 18px;
              color: #444;
              font-size: 11px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #333;
              font-size: 10px;
            }
            th, td { border: 1px solid #333; padding: 6px 8px; vertical-align: middle; }
            th { background: #f0f0f0; font-weight: 700; text-align: center; }
            .tc { text-align: center; }
            .tr { text-align: right; }
            .tl { text-align: left; }
            .no-data { text-align: center; padding: 18px; color: #6c757d; }
            .qty-low { color: #dc3545; font-weight: 700; }
            .footer {
              margin-top: 20px;
              padding-top: 14px;
              border-top: 1px solid #ccc;
              font-size: 11px;
            }
            .footer-row { margin-bottom: 10px; }
            .footer-row label { display: inline-block; min-width: 220px; font-weight: 700; }
            @media print { body { padding: 16px; } .logo { max-height: 48px; } }
          </style>
        </head>
        <body>
          <div class="top">
            <div class="left">
              <img src="${safe(logoUrl)}" alt="Logo" class="logo" />
              <div class="company">
                <h2>Mamuya Auto Spare Parts</h2>
                <p>Kilimanjaro, Tanzania<br />Phone: +255 22 123 4567</p>
              </div>
            </div>
            <div class="meta">
              <p><strong>Report:</strong> Spare Parts Inventory</p>
              <p><strong>Category:</strong> ${safe(categoryLabel)}</p>
              <p><strong>Scope:</strong> ${safe(scopeLabel)}</p>
              <p><strong>Printed:</strong> ${safe(printedAt)}</p>
              <p><strong>Printed by:</strong> ${printedBy}</p>
            </div>
          </div>

          <h1 class="title">INVENTORY REPORT</h1>
          <p class="subtitle">Showing ${sortedParts.length} item(s)</p>

          <table>
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">Part name</th>
                <th class="tl">Part number</th>
                <th class="tl">Category</th>
                <th class="tl">Brand</th>
                <th class="tr">Quantity added</th>
                <th class="tr">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <div class="footer-row"><label>Total items shown:</label> ${sortedParts.length}</div>
          </div>
        </body>
      </html>
    `;

    if (action === 'download') {
      try {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const day = new Date();
        const stamp = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        link.href = url;
        link.download = `spare-parts-inventory-${stamp}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to download document. Please try again.',
          confirmButtonColor: '#511C00',
        });
      }
      return;
    }

    const reportWindow = window.open('', '_blank', 'width=1100,height=750');
    if (!reportWindow) {
      Swal.fire({
        icon: 'warning',
        title: 'Popup blocked',
        text: 'Please allow popups to print the report.',
        confirmButtonColor: '#511C00',
      });
      return;
    }
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  if (loading && spareParts.length === 0) {
    return <PageLoader message={t.loadingSpareParts || t.loading} />;
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
            <span>Dashboard</span>
          </Link>
          <Link to="/manager/spareparts" className={'nav-item ' + (location.pathname === '/manager/spareparts' ? 'active' : '')}>
            <FaBox className="nav-icon" />
            <span>Spare Parts</span>
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
            <h1 className="page-title">Manager Spare Parts</h1>
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
                placeholder={t.searchSparePart}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <StyledSelect
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="status-filter"
              >
                <option value="All">{t.allCategories}</option>
                {categoryFilterOptions.map((cat) => (
                  <option key={cat} value={cat}>{capitalizeName(cat)}</option>
                ))}
              </StyledSelect>
            </div>
            <button
              type="button"
              className={`manager-low-stock-btn${showLowStockOnly ? ' active' : ''}`}
              onClick={() => setShowLowStockOnly((v) => !v)}
              title={`Show only low stock (quantity < ${LOW_STOCK_THRESHOLD})`}
            >
              Low Stock
            </button>
            <button
              type="button"
              className={`manager-low-stock-btn${showSoldoutTodayOnly ? ' active' : ''}`}
              onClick={() => setShowSoldoutTodayOnly((v) => !v)}
              title="Show only items soldout today"
            >
              Soldout Today
            </button>
          </div>

          <div className="stats-row manager-stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalParts}</h3>
                <p className="stat-value">{totalParts}</p>
              </div>
            </div>
            <div className="stat-card manager-stat-low">
              <div className="stat-info">
                <h3>Low Stock</h3>
                <p className="stat-value">{lowStockCount}</p>
              </div>
            </div>
          </div>

          <section className="manager-transactions-table-section manager-spareparts-section">
            <div className="manager-spareparts-section-header">
              <h3 className="manager-section-title">{t.inventory}</h3>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button type="button" className="action-btn print" onClick={() => handleSparepartsReport('print')}>
                  <FaPrint /> {t.print || 'Print'}
                </button>
                <button type="button" className="action-btn download" onClick={() => handleSparepartsReport('download')}>
                  <FaDownload /> {t.download || 'Download'}
                </button>
              </div>
            </div>
            <div className="table-container">
              <table className="payments-table manager-spareparts-table">
                <thead>
                  <tr>
                    <th className="manager-col-serial">S.No</th>
                    <th>Part Name</th>
                    <th>Part Number</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Quantity Added</th>
                    <th>Quantity</th>
                    <th>Soldout Quantity</th>
                    <th>Wholesale Price (TZS)</th>
                    <th>Retail Price (TZS)</th>
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    <tr>
                      <td colSpan="10" className="no-data loading-cell"><InlineLoader message={t.loadingSpareParts} size="md" /></td>
                    </tr>
                  ) : sortedParts.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="no-data">
                        No spare parts found
                      </td>
                    </tr>
                  ) : (
                    sortedParts.map((p, index) => {
                      const qty = Number(p.quantity) || 0;
                      const qtyClass =
                        qty > 100
                          ? 'manager-qty-high'
                          : qty >= 10
                            ? 'manager-qty-medium'
                            : 'manager-qty-low';
                      return (
                        <tr key={p.id}>
                          <td className="manager-col-serial">{index + 1}</td>
                          <td>{capitalizeName(p.part_name)}</td>
                          <td>{(p.part_number || '—').toUpperCase()}</td>
                          <td>{capitalizeName(p.category_name) || '—'}</td>
                          <td>{(p.brand_name || '—').toUpperCase()}</td>
                          <td className="manager-quantity-added-value">{Number(p.quantity_added) || 0}</td>
                          <td>
                            <span className={qtyClass}>{qty}</span>
                          </td>
                          <td>{Number(p.soldout_quantity) || 0}</td>
                          <td>{formatPrice(p.wholesale_price)}</td>
                          <td>{formatPrice(p.retail_price)}</td>
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

    </div>
  );
}

export default ManagerSpareparts;
