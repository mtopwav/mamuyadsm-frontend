const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/manager/transactions.js');
let src = fs.readFileSync(file, 'utf8');

const start = src.indexOf('      {showViewModal && selectedPayment && (');
const end = src.indexOf('      {showReceiveModal && selectedPayment && (() => {');
if (start === -1 || end === -1) {
  console.error('markers not found');
  process.exit(1);
}

const replacement = `      {showViewModal && selectedPayment && (() => {
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
                      <span className={\`status-badge \${(selectedPayment.status || '').toLowerCase()}\`}>
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
                    <span className={\`status-badge \${(selectedPayment.status || '').toLowerCase()}\`}>
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
                        const raw = e.target.value.replace(/[^\\d]/g, '');
                        setDiscountValue(raw.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ','));
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
                  <strong>{numericDiscount > 0 ? \`- TZS \${formatPrice(numericDiscount)}\` : \`TZS \${formatPrice(0)}\`}</strong>
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

`;

src = src.slice(0, start) + replacement + src.slice(end);
fs.writeFileSync(file, src);
console.log('patched modals');
