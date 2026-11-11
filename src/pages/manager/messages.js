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
  FaEnvelope,
  FaPaperPlane,
  FaMobileAlt,
  FaHistory,
  FaSearch,
  FaEye,
  FaTrashAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt
} from 'react-icons/fa';
import './manager-layout.css';
import './messages.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import { getSmsBalance, getSmsRecipients, sendBulkSms } from '../../services/api';
import { PageLoader } from '../../components/LoadingSpinner';

/** Apply /api/sms/balance (Onfon GET Balance) to the units card. */
function applyUnitsBalanceFromApi(balanceRes, { setSmsUnits, setSmsCredits, setSmsApiReady }) {
  if (!balanceRes) {
    setSmsCredits('—');
    return;
  }

  setSmsApiReady(balanceRes.canSend !== false);

  const unitsRaw = balanceRes.units ?? balanceRes.creditsNumeric;
  const units =
    unitsRaw != null && unitsRaw !== '' && !Number.isNaN(Number(unitsRaw)) ? Number(unitsRaw) : null;

  if (units != null) {
    const n = Math.round(units);
    setSmsUnits(n);
    setSmsCredits(
      balanceRes.unitsDisplay || `${n.toLocaleString('en-US')} ${n === 1 ? 'unit' : 'units'}`
    );
    return;
  }

  if (balanceRes.unitsDisplay) {
    setSmsUnits(null);
    setSmsCredits(balanceRes.unitsDisplay);
    return;
  }

  setSmsUnits(null);
  if (balanceRes.configured === false) {
    setSmsCredits('Not configured');
    setSmsApiReady(false);
  } else if (balanceRes.error) {
    setSmsCredits(balanceRes.error);
  } else if (balanceRes.message) {
    setSmsCredits(balanceRes.message);
  } else {
    setSmsCredits('—');
  }
}

const SMS_TEMPLATES = [
  { id: '', label: 'Custom message' },
  { id: 'payment_reminder', label: 'Payment reminder' },
  { id: 'loan_due', label: 'Loan balance due' },
  { id: 'promo', label: 'Promotion / offer' },
  { id: 'thanks', label: 'Thank you' }
];

const TEMPLATE_BODIES = {
  payment_reminder:
    'Habari Ndugu {Customer name}, Tunakukumbusha kulipa deni lako la TZS {Amount}. Tafadhali lipa ili tuendelee kukuhudumia. Piga 0765713467 kwa mawasiliano zaidi.',
  loan_due:
    'Ndugu {Customer Name} Tunashukuru kwa malipo ya TZS {Amount}. Asante kwa uaminifu wako na kutuchagua Mamuya Auto Spare Parts & Lubricants. Karibu tena.',
  promo:
    'Ofa maalum kutoka Mamuya Auto Spare Parts! Tembelea duka letu leo kwa bei nafuu za spare parts. Karibu sana.',
  thanks: 'Ndugu {Customer name}, Asante kwa kutuchagua Mamuya Auto Spare Parts & Lubricants. Tunathamini mchango na uaminifu wako.'
};

const CAMPAIGNS_STORAGE_KEY = 'mamuya_sms_campaigns';

const MOCK_CAMPAIGNS = [
  {
    id: 101,
    name: 'March loan reminders',
    date: '2026-03-15 09:30',
    recipients: 42,
    sent: 40,
    failed: 2,
    status: 'sent'
  },
  {
    id: 102,
    name: 'Weekend promotion',
    date: '2026-03-18 14:00',
    recipients: 128,
    sent: 0,
    failed: 0,
    status: 'scheduled'
  },
  {
    id: 103,
    name: 'Payment follow-up',
    date: '2026-03-10 11:15',
    recipients: 18,
    sent: 16,
    failed: 2,
    status: 'sent'
  },
  {
    id: 104,
    name: 'Draft – new arrivals',
    date: '2026-03-17 16:45',
    recipients: 0,
    sent: 0,
    failed: 0,
    status: 'draft'
  }
];

const SMS_SINGLE_LIMIT = 160;

function personalizePreview(template, name, amount) {
  const amountStr =
    amount === '' || amount == null
      ? ''
      : typeof amount === 'number'
        ? amount.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : String(amount);
  return String(template)
    .replace(/\{name\}/gi, name || 'Mteja')
    .replace(/\{amount\}/gi, amountStr);
}

function loadStoredCampaigns() {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return MOCK_CAMPAIGNS;
}

function ManagerMessages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());

  const [activeTab, setActiveTab] = useState('compose');
  const [templateId, setTemplateId] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [audience, setAudience] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sendMode, setSendMode] = useState('now');
  const [scheduleAt, setScheduleAt] = useState('');
  const [campaigns, setCampaigns] = useState(loadStoredCampaigns);
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [smsUnits, setSmsUnits] = useState(null);
  const [smsCredits, setSmsCredits] = useState('Loading…');
  const [unitsBalanceLoading, setUnitsBalanceLoading] = useState(false);
  const [sentToday, setSentToday] = useState(0);
  const [failedToday, setFailedToday] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [smsApiReady, setSmsApiReady] = useState(false);

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
    const dateTimeInterval = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(dateTimeInterval);
  }, [navigate]);

  const fetchUnitsBalanceFromApi = async () => {
    setUnitsBalanceLoading(true);
    try {
      const balanceRes = await getSmsBalance();
      applyUnitsBalanceFromApi(balanceRes, { setSmsUnits, setSmsCredits, setSmsApiReady });
      return balanceRes;
    } catch (err) {
      console.error('Onfon balance API error:', err);
      setSmsUnits(null);
      setSmsCredits('Server offline');
      setSmsApiReady(false);
      return null;
    } finally {
      setUnitsBalanceLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadUnitsWithRetry = async (attempt = 0) => {
      if (cancelled) return;
      const result = await fetchUnitsBalanceFromApi();
      if (cancelled) return;
      if (result == null && attempt < 2) {
        setTimeout(() => loadUnitsWithRetry(attempt + 1), 2000);
      }
    };

    const loadRecipients = async () => {
      setRecipientsLoading(true);
      try {
        const recRes = await getSmsRecipients();
        if (!cancelled && recRes.success && Array.isArray(recRes.recipients)) {
          setRecipients(recRes.recipients);
        }
      } catch (err) {
        console.error('SMS recipients load error:', err);
      } finally {
        if (!cancelled) setRecipientsLoading(false);
      }
    };

    setSmsCredits('Loading…');
    loadUnitsWithRetry();
    loadRecipients();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      if (audience === 'loan' && r.group !== 'loan') return false;
      if (audience === 'outstanding' && r.group !== 'outstanding') return false;
      if (audience === 'customers' && r.group === 'loan') return false;
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      );
    });
  }, [audience, searchTerm, recipients]);

  const charCount = messageBody.length;
  const smsParts = Math.max(1, Math.ceil(charCount / SMS_SINGLE_LIMIT) || 1);

  const selectAllChecked =
    filteredRecipients.length > 0 && filteredRecipients.every((r) => selectedIds.has(r.id));

  const toggleRecipient = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRecipients.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRecipients.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const handleTemplateChange = (id) => {
    setTemplateId(id);
    if (id && TEMPLATE_BODIES[id]) {
      setMessageBody(TEMPLATE_BODIES[id]);
    }
  };

  const handleClearCompose = () => {
    setTemplateId('');
    setMessageBody('');
    setCampaignName('');
    setSelectedIds(new Set());
    setSendMode('now');
    setScheduleAt('');
  };

  const handleSendBulk = async () => {
    if (!messageBody.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Message required',
        text: 'Enter the SMS text before sending.',
        confirmButtonColor: '#511C00'
      });
      return;
    }
    if (selectedIds.size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No recipients',
        text: 'Select at least one recipient.',
        confirmButtonColor: '#511C00'
      });
      return;
    }
    if (sendMode === 'schedule' && !scheduleAt) {
      Swal.fire({
        icon: 'warning',
        title: 'Schedule required',
        text: 'Choose date and time for scheduled sending.',
        confirmButtonColor: '#511C00'
      });
      return;
    }

    const selected = recipients.filter((r) => selectedIds.has(r.id));
    const confirm = await Swal.fire({
      icon: 'question',
      title: sendMode === 'now' ? 'Send bulk SMS?' : 'Schedule campaign?',
      html: `Send to <strong>${selected.length}</strong> recipient(s) via Onfon SMS?`,
      showCancelButton: true,
      confirmButtonColor: '#511C00',
      cancelButtonColor: '#6c757d',
      confirmButtonText: sendMode === 'now' ? 'Send now' : 'Schedule'
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await sendBulkSms({
        campaignName: campaignName.trim() || 'Bulk SMS',
        message: messageBody.trim(),
        recipients: selected.map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          amount_remain: r.amount_remain
        })),
        scheduleAt: sendMode === 'schedule' ? scheduleAt : null
      });

      if (res.success) {
        const sent = res.sent ?? selected.length;
        const failed = res.failed ?? 0;
        setSentToday((n) => n + sent);
        setFailedToday((n) => n + failed);

        const entry = {
          id: Date.now(),
          name: campaignName.trim() || 'Bulk SMS',
          date: sendMode === 'schedule' && scheduleAt
            ? scheduleAt.replace('T', ' ')
            : new Date().toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
          recipients: selected.length,
          sent,
          failed,
          status: sendMode === 'schedule' ? 'scheduled' : 'sent'
        };
        setCampaigns((prev) => {
          const next = [entry, ...prev];
          localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(next.slice(0, 50)));
          return next;
        });

        await fetchUnitsBalanceFromApi();

        Swal.fire({
          icon: 'success',
          title: res.scheduled ? 'Scheduled' : 'Sent',
          text: res.message || `SMS processed for ${sent} recipient(s).`,
          confirmButtonColor: '#511C00'
        });
        handleClearCompose();
      } else {
        throw new Error(res.message || res.errorDescription || 'Send failed');
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'SMS failed',
        text: err.message || 'Could not send via Onfon. Check server .env and Onfon credentials.',
        confirmButtonColor: '#511C00'
      });
    } finally {
      setSubmitting(false);
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

  const firstSelected = useMemo(
    () => recipients.find((r) => selectedIds.has(r.id)),
    [recipients, selectedIds]
  );

  const previewText = messageBody.trim()
    ? personalizePreview(
        messageBody,
        firstSelected?.name,
        firstSelected?.amount_remain
      )
    : 'Your message will appear here. Use {name} and {amount} placeholders in templates.';

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
            <button type="button" className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">Bulk SMS</h1>
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
              <span className="user-name">{user?.full_name || user?.username || 'Manager'}</span>
            </div>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        <div className="payments-content">
          <div className="bulk-sms-intro">
            <h2>Bulk SMS management</h2>
            <p>
              Send bulk SMS via{' '}
              <a href="https://www.docs.onfonmedia.co.ke/" target="_blank" rel="noopener noreferrer">
                Onfon SMS Gateway
              </a>
              . Recipients are loaded from customers with valid phone numbers.
              {smsApiReady && (
                <span className="bulk-sms-api-ready"> Onfon SMS is configured — you can send messages.</span>
              )}
            </p>
          </div>

          <div className="bulk-sms-stats">
            <div className="bulk-sms-stat-card">
              <div className="bulk-sms-stat-icon primary">
                <FaUsers />
              </div>
              <div>
                <div className="bulk-sms-stat-label">Selected recipients</div>
                <div className="bulk-sms-stat-value">{selectedIds.size}</div>
              </div>
            </div>
            <div className="bulk-sms-stat-card bulk-sms-stat-card-units">
              <div className="bulk-sms-stat-icon success">
                <FaMobileAlt />
              </div>
              <div className="bulk-sms-stat-units-body">
                <div className="bulk-sms-stat-label-row">
                  <span className="bulk-sms-stat-label">SMS units (Onfon)</span>
                  <button
                    type="button"
                    className="bulk-sms-refresh-units-btn"
                    title="Refresh balance from Onfon API"
                    disabled={unitsBalanceLoading}
                    onClick={() => fetchUnitsBalanceFromApi()}
                  >
                    <FaSyncAlt className={unitsBalanceLoading ? 'spin' : ''} />
                  </button>
                </div>
                <div className="bulk-sms-stat-value bulk-sms-stat-value-units">
                  {unitsBalanceLoading ? 'Loading…' : smsCredits}
                </div>
                {smsUnits != null && !unitsBalanceLoading && (
                  <div className="bulk-sms-stat-units-api">via Onfon balance API</div>
                )}
              </div>
            </div>
            <div className="bulk-sms-stat-card">
              <div className="bulk-sms-stat-icon warning">
                <FaCheckCircle />
              </div>
              <div>
                <div className="bulk-sms-stat-label">Sent this session</div>
                <div className="bulk-sms-stat-value">{sentToday}</div>
              </div>
            </div>
            <div className="bulk-sms-stat-card">
              <div className="bulk-sms-stat-icon danger">
                <FaExclamationTriangle />
              </div>
              <div>
                <div className="bulk-sms-stat-label">Failed this session</div>
                <div className="bulk-sms-stat-value">{failedToday}</div>
              </div>
            </div>
          </div>

          <div className="bulk-sms-tabs">
            <button
              type="button"
              className={`bulk-sms-tab ${activeTab === 'compose' ? 'active' : ''}`}
              onClick={() => setActiveTab('compose')}
            >
              <FaPaperPlane /> Compose &amp; send
            </button>
            <button
              type="button"
              className={`bulk-sms-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <FaHistory /> Campaign history
            </button>
          </div>

          {activeTab === 'compose' ? (
            <div className="bulk-sms-layout">
              <div>
                <div className="bulk-sms-panel" style={{ marginBottom: '20px' }}>
                  <div className="bulk-sms-panel-header">
                    <h3>
                      <FaEnvelope /> Message
                    </h3>
                  </div>
                  <div className="bulk-sms-panel-body">
                    <div className="bulk-sms-field">
                      <label htmlFor="campaign-name">Campaign name</label>
                      <input
                        id="campaign-name"
                        type="text"
                        placeholder="e.g. March payment reminders"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                      />
                    </div>
                    <div className="bulk-sms-field">
                      <label htmlFor="sms-template">Template</label>
                      <select
                        id="sms-template"
                        value={templateId}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                      >
                        {SMS_TEMPLATES.map((tpl) => (
                          <option key={tpl.id || 'custom'} value={tpl.id}>
                            {tpl.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bulk-sms-field">
                      <label htmlFor="sms-body">Message</label>
                      <textarea
                        id="sms-body"
                        placeholder="Type your SMS. Placeholders: {name}, {amount}"
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        maxLength={640}
                      />
                      <div className="bulk-sms-char-row">
                        <span>
                          {charCount} characters · {smsParts} SMS part{smsParts > 1 ? 's' : ''}
                        </span>
                        <span className={charCount > SMS_SINGLE_LIMIT ? 'over-limit' : ''}>
                          {charCount > SMS_SINGLE_LIMIT ? 'Long message (multi-part)' : 'Single SMS'}
                        </span>
                      </div>
                    </div>
                    <div className="bulk-sms-field">
                      <label>When to send</label>
                      <div className="bulk-sms-schedule-row">
                        <label className="bulk-sms-schedule-option">
                          <input
                            type="radio"
                            name="sendMode"
                            checked={sendMode === 'now'}
                            onChange={() => setSendMode('now')}
                          />
                          Send now
                        </label>
                        <label className="bulk-sms-schedule-option">
                          <input
                            type="radio"
                            name="sendMode"
                            checked={sendMode === 'schedule'}
                            onChange={() => setSendMode('schedule')}
                          />
                          Schedule
                        </label>
                        {sendMode === 'schedule' && (
                          <input
                            type="datetime-local"
                            value={scheduleAt}
                            onChange={(e) => setScheduleAt(e.target.value)}
                            style={{ maxWidth: '220px' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bulk-sms-panel">
                  <div className="bulk-sms-panel-header">
                    <h3>
                      <FaUsers /> Recipients
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                      {filteredRecipients.length} shown
                    </span>
                  </div>
                  <div className="bulk-sms-panel-body">
                    <div className="bulk-sms-field">
                      <label>Audience</label>
                      <div className="bulk-sms-audience-chips">
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'customers', label: 'Customers' },
                          { id: 'loan', label: 'Loan customers' },
                          { id: 'outstanding', label: 'Outstanding balance' }
                        ].map((chip) => (
                          <button
                            key={chip.id}
                            type="button"
                            className={`bulk-sms-audience-chip ${audience === chip.id ? 'active' : ''}`}
                            onClick={() => setAudience(chip.id)}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bulk-sms-toolbar">
                      <div className="bulk-sms-search">
                        <FaSearch className="bulk-sms-search-icon" />
                        <input
                          type="text"
                          placeholder="Search name or phone..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <button type="button" className="bulk-sms-btn bulk-sms-btn-ghost" onClick={toggleSelectAll}>
                        {selectAllChecked ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="bulk-sms-recipients-table-wrap">
                      <table className="bulk-sms-recipients-table">
                        <thead>
                          <tr>
                            <th className="tc">
                              <input
                                type="checkbox"
                                checked={selectAllChecked}
                                onChange={toggleSelectAll}
                                aria-label="Select all"
                              />
                            </th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Group</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipientsLoading ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                                Loading recipients…
                              </td>
                            </tr>
                          ) : filteredRecipients.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                                No recipients match this filter.
                              </td>
                            </tr>
                          ) : (
                            filteredRecipients.map((r) => (
                              <tr key={r.id}>
                                <td className="tc">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(r.id)}
                                    onChange={() => toggleRecipient(r.id)}
                                    aria-label={`Select ${r.name}`}
                                  />
                                </td>
                                <td>{r.name}</td>
                                <td>{r.phone}</td>
                                <td style={{ textTransform: 'capitalize' }}>{r.group}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="bulk-sms-actions">
                      <button
                        type="button"
                        className="bulk-sms-btn bulk-sms-btn-primary"
                        onClick={handleSendBulk}
                        disabled={submitting || !smsApiReady}
                      >
                        <FaPaperPlane />
                        {submitting
                          ? 'Sending…'
                          : sendMode === 'now'
                            ? 'Send bulk SMS'
                            : 'Schedule campaign'}
                      </button>
                      <button type="button" className="bulk-sms-btn bulk-sms-btn-ghost" onClick={handleClearCompose}>
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bulk-sms-panel">
                <div className="bulk-sms-panel-header">
                  <h3>
                    <FaMobileAlt /> Preview
                  </h3>
                </div>
                <div className="bulk-sms-panel-body" style={{ padding: 0 }}>
                  <div className="bulk-sms-preview">
                    <div className="bulk-sms-preview-label">SMS preview</div>
                    <div className="bulk-sms-phone-mock">{previewText}</div>
                    <div className="bulk-sms-preview-meta">
                      <p>
                        <strong>From:</strong> Mamuya Auto
                      </p>
                      <p>
                        <strong>Recipients:</strong> {selectedIds.size} selected
                      </p>
                      <p>
                        <strong>Est. parts:</strong> {selectedIds.size * smsParts} SMS segment(s)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bulk-sms-panel bulk-sms-history-panel">
              <div className="bulk-sms-panel-header">
                <h3>
                  <FaHistory /> Past campaigns
                </h3>
                <button type="button" className="bulk-sms-btn bulk-sms-btn-secondary" onClick={() => setActiveTab('compose')}>
                  <FaPaperPlane /> New campaign
                </button>
              </div>
              <div className="bulk-sms-panel-body" style={{ padding: 0 }}>
                <table className="bulk-sms-history-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Date</th>
                      <th>Recipients</th>
                      <th>Sent</th>
                      <th>Failed</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.date}</td>
                        <td>{c.recipients}</td>
                        <td>{c.sent}</td>
                        <td>{c.failed}</td>
                        <td>
                          <span className={`bulk-sms-status ${c.status}`}>{c.status}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="bulk-sms-icon-btn"
                            title="View"
                            onClick={() =>
                              Swal.fire({
                                icon: 'info',
                                title: c.name,
                                html: `<p><strong>Date:</strong> ${c.date}</p><p><strong>Recipients:</strong> ${c.recipients}</p><p><strong>Sent:</strong> ${c.sent} · <strong>Failed:</strong> ${c.failed}</p><p><strong>Status:</strong> ${c.status}</p>`,
                                confirmButtonColor: '#511C00'
                              })
                            }
                          >
                            <FaEye />
                          </button>
                          <button
                            type="button"
                            className="bulk-sms-icon-btn"
                            title="Delete"
                            onClick={() => {
                              setCampaigns((prev) => {
                                const next = prev.filter((x) => x.id !== c.id);
                                localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(next));
                                return next;
                              });
                            }}
                          >
                            <FaTrashAlt />
                          </button>
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
    </div>
  );
}

export default ManagerMessages;
