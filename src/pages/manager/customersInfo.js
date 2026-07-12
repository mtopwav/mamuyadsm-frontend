import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBox,
  FaUsers,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrashAlt,
  FaPhone,
  FaIdCard,
  FaMapMarkerAlt,
  FaFileInvoice,
  FaReceipt,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaChartBar,
  FaEnvelope
} from 'react-icons/fa';
import './manager-layout.css';
import './customersInfo.css';
import logo from '../../images/logo.png';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { useTranslation } from '../../utils/useTranslation';
import { PageLoader } from '../../components/LoadingSpinner';

function ManagerCustomersInfo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

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
        console.error('Error parsing user data:', error);
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

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await getCustomers();
        if (response.success && response.customers) {
          const formatted = response.customers.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            address: c.address,
            paymentMethod: c.payment_method,
            registeredDate: c.created_at || c.registered_date || c.registeredDate
          }));
          setCustomers(formatted);
        }
      } catch (error) {
        console.error('Error loading customers:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load customers. Please try again.',
          confirmButtonColor: '#511C00'
        });
      }
    };
    loadCustomers();
    const dateTimeInterval = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(dateTimeInterval);
  }, []);

  if (loading) {
    return <PageLoader message={t.loading || 'Loading...'} />;
  }

  if (!user) return null;

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
    return name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const capitalizeAddress = (address) => {
    if (!address) return '';
    return address.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setAddingCustomer(true);
    try {
      if (!formData.name || !formData.phone || !formData.address) {
        Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Name, Phone, and Address are required.', confirmButtonColor: '#511C00' });
        setAddingCustomer(false);
        return;
      }
      const nameParts = formData.name.trim().split(/\s+/).filter(p => p.length > 0);
      if (nameParts.length < 2 || nameParts.length > 3) {
        Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please enter full name with 2 or 3 names.', confirmButtonColor: '#511C00' });
        setAddingCustomer(false);
        return;
      }
      let phoneNumber = formData.phone.trim();
      if (!phoneNumber.startsWith('+255')) {
        if (phoneNumber.startsWith('255')) phoneNumber = '+' + phoneNumber;
        else if (phoneNumber.startsWith('0')) phoneNumber = '+255' + phoneNumber.substring(1);
        else phoneNumber = '+255' + phoneNumber;
      }
      const phoneDigits = phoneNumber.substring(4);
      if (phoneDigits.length !== 9) {
        Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Phone must have exactly 9 digits after +255.', confirmButtonColor: '#511C00' });
        setAddingCustomer(false);
        return;
      }
      const response = await addCustomer({
        name: formData.name.trim(),
        phone: phoneNumber,
        address: formData.address.trim()
      });
      if (response.success) {
        const newCustomer = {
          id: response.customer.id,
          name: response.customer.name,
          phone: response.customer.phone,
          address: response.customer.address,
          paymentMethod: response.customer.payment_method,
          registeredDate: response.customer.created_at || response.customer.registered_date
        };
        setCustomers([newCustomer, ...customers]);
        Swal.fire({ icon: 'success', title: 'Success!', text: 'Customer added successfully.', confirmButtonColor: '#511C00', timer: 2000, showConfirmButton: false });
        setFormData({ name: '', phone: '', address: '' });
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to add customer.', confirmButtonColor: '#511C00' });
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    let phoneDisplay = customer.phone || '';
    if (phoneDisplay.startsWith('+255')) phoneDisplay = phoneDisplay.substring(4);
    else if (phoneDisplay.startsWith('255')) phoneDisplay = phoneDisplay.substring(3);
    else if (phoneDisplay.startsWith('0')) phoneDisplay = phoneDisplay.substring(1);
    setFormData({
      name: customer.name || '',
      phone: '+255' + phoneDisplay,
      address: customer.address || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = async (customer) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: t.delete || 'Delete Customer',
      text: `Are you sure you want to delete "${capitalizeName(customer.name)}"?`,
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t.delete || 'Yes, delete',
      cancelButtonText: t.cancel || 'Cancel'
    });
    if (!result.isConfirmed) return;

    try {
      const response = await deleteCustomer(customer.id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete customer');
      }
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      if (editingCustomer?.id === customer.id) {
        setShowEditModal(false);
        setEditingCustomer(null);
      }
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Customer deleted successfully.',
        confirmButtonColor: '#511C00',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error deleting customer:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to delete customer.',
        confirmButtonColor: '#511C00'
      });
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    setUpdatingCustomer(true);
    try {
      if (!formData.name || !formData.phone || !formData.address) {
        Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Name, Phone, and Address are required.', confirmButtonColor: '#511C00' });
        setUpdatingCustomer(false);
        return;
      }
      const nameParts = formData.name.trim().split(/\s+/).filter(p => p.length > 0);
      if (nameParts.length < 2 || nameParts.length > 3) {
        Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please enter full name with 2 or 3 names.', confirmButtonColor: '#511C00' });
        setUpdatingCustomer(false);
        return;
      }
      let phoneNumber = formData.phone.trim();
      if (!phoneNumber.startsWith('+255')) {
        if (phoneNumber.startsWith('255')) phoneNumber = '+' + phoneNumber;
        else if (phoneNumber.startsWith('0')) phoneNumber = '+255' + phoneNumber.substring(1);
        else phoneNumber = '+255' + phoneNumber;
      }
      const phoneDigits = phoneNumber.substring(4);
      if (phoneDigits.length !== 9) {
        Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Phone must have exactly 9 digits after +255.', confirmButtonColor: '#511C00' });
        setUpdatingCustomer(false);
        return;
      }
      const response = await updateCustomer(editingCustomer.id, {
        name: formData.name.trim(),
        phone: phoneNumber,
        address: formData.address.trim()
      });
      if (response.success) {
        const updatedCustomer = {
          id: response.customer.id,
          name: response.customer.name,
          phone: response.customer.phone,
          address: response.customer.address,
          paymentMethod: response.customer.payment_method,
          registeredDate: response.customer.created_at || response.customer.registered_date || editingCustomer.registeredDate
        };
        setCustomers(customers.map(c => (c.id === editingCustomer.id ? updatedCustomer : c)));
        Swal.fire({ icon: 'success', title: 'Success!', text: 'Customer updated successfully.', confirmButtonColor: '#511C00', timer: 2000, showConfirmButton: false });
        setFormData({ name: '', phone: '', address: '' });
        setEditingCustomer(null);
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to update customer.', confirmButtonColor: '#511C00' });
    } finally {
      setUpdatingCustomer(false);
    }
  };

  const filteredCustomers = searchTerm.trim()
    ? customers.filter(c => {
        const term = searchTerm.toLowerCase();
        return (c.name && c.name.toLowerCase().includes(term)) || (c.phone && c.phone.includes(searchTerm)) || (c.address && c.address.toLowerCase().includes(term));
      })
    : customers;

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
            <h1 className="page-title">{t.customerInfo}</h1>
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
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="add-btn" onClick={() => setShowAddModal(true)}>
              <FaPlus /> {t.addCustomer}
            </button>
          </div>

          <div className="stats-row manager-stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.customers}</h3>
                <p className="stat-value">{customers.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.searchResults || 'Showing'}</h3>
                <p className="stat-value">{filteredCustomers.length}</p>
              </div>
            </div>
          </div>

          <section className="manager-customers-section">
            <h3 className="manager-section-title">{t.customerInfo}</h3>
            <p className="manager-customers-count">
              {filteredCustomers.length === customers.length
                ? `${customers.length} customer${customers.length === 1 ? '' : 's'}`
                : `Showing ${filteredCustomers.length} of ${customers.length} customers`}
            </p>
            <div className="table-container">
              <table className="payments-table manager-customers-table">
                <thead>
                  <tr>
                    <th className="manager-col-id">#</th>
                    <th>{t.name}</th>
                    <th>{t.phone}</th>
                    <th>{t.address}</th>
                    <th>{t.date}</th>
                    <th className="manager-col-actions">{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">
                        {t.noCustomersFound}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer, index) => (
                      <tr key={customer.id}>
                        <td className="manager-col-id">{index + 1}</td>
                        <td>
                          <div className="customer-info-cell">
                            <FaIdCard className="info-icon" />
                            <div>
                              <div className="info-name">{capitalizeName(customer.name)}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="customer-info-cell">
                            <FaPhone className="info-icon" />
                            <span>{customer.phone}</span>
                          </div>
                        </td>
                        <td className="address-cell">
                          <div className="customer-info-cell">
                            <FaMapMarkerAlt className="info-icon" />
                            <span>{capitalizeAddress(customer.address)}</span>
                          </div>
                        </td>
                        <td className="date-cell">{formatDateTime(customer.registeredDate || customer.created_at)}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="action-btn edit"
                              title={t.editCustomer}
                              onClick={() => handleEdit(customer)}
                            >
                              <FaEdit className="action-icon" />
                              <span className="action-text">{t.edit}</span>
                            </button>
                            <button
                              className="action-btn delete"
                              title={t.delete || 'Delete customer'}
                              onClick={() => handleDelete(customer)}
                            >
                              <FaTrashAlt className="action-icon" />
                              <span className="action-text">{t.delete || 'Delete'}</span>
                            </button>
                          </div>
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

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.addCustomer}</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddCustomer} className="customer-form">
              <div className="form-group">
                <label>{t.fullName} *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter Customer name" />
              </div>
              <div className="form-group">
                <label>{t.phone} *</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '5px', overflow: 'hidden' }}>
                  <span style={{ padding: '12px 15px', background: '#f8f9fa', borderRight: '1px solid #ddd', color: '#2c3e50', fontWeight: '500', whiteSpace: 'nowrap' }}>+255</span>
                  <input
                    type="tel"
                    required
                    maxLength={9}
                    value={formData.phone.startsWith('+255') ? formData.phone.substring(4) : formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: '+255' + e.target.value.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="712345678"
                    style={{ flex: 1, border: 'none', padding: '12px 15px', outline: 'none' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t.address} *</label>
                <input type="text" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={t.address} />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)} disabled={addingCustomer}>{t.cancel}</button>
                <button type="submit" className="submit-btn" disabled={addingCustomer}>{addingCustomer ? t.loading : t.addCustomer}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingCustomer && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.editCustomer}</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateCustomer} className="customer-form">
              <div className="form-group">
                <label>{t.fullName} *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter Customer name" />
              </div>
              <div className="form-group">
                <label>{t.phone} *</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '5px', overflow: 'hidden' }}>
                  <span style={{ padding: '12px 15px', background: '#f8f9fa', borderRight: '1px solid #ddd', color: '#2c3e50', fontWeight: '500', whiteSpace: 'nowrap' }}>+255</span>
                  <input
                    type="tel"
                    required
                    maxLength={9}
                    value={formData.phone.startsWith('+255') ? formData.phone.substring(4) : formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: '+255' + e.target.value.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="712345678"
                    style={{ flex: 1, border: 'none', padding: '12px 15px', outline: 'none' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t.address} *</label>
                <input type="text" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={t.address} />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)} disabled={updatingCustomer}>{t.cancel}</button>
                <button type="submit" className="submit-btn" disabled={updatingCustomer}>{updatingCustomer ? t.loading : t.editCustomer}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerCustomersInfo;
