import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCalendarAlt } from 'react-icons/fa';
import './StyledDateInput.css';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function parseDate(value) {
  if (!value) return null;
  const datePart = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

function toISODate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseTime(value) {
  const match = /T(\d{2}):(\d{2})/.exec(String(value || ''));
  if (!match) return { hour: '00', minute: '00' };
  return { hour: match[1], minute: match[2] };
}

function formatDisplay(value, withTime) {
  const date = parseDate(value);
  if (!date) return '';
  const label = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  if (!withTime) return label;
  const { hour, minute } = parseTime(value);
  return `${label}, ${hour}:${minute}`;
}

function sameDay(a, b) {
  return a && b
    && a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function buildCells(year, month) {
  const first = new Date(year, month, 1);
  const lead = first.getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i += 1) {
    cells.push({ date: new Date(year, month, 1 - (lead - i)), outside: true });
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push({ date: new Date(year, month, day), outside: false });
  }
  while (cells.length % 7 !== 0) {
    const previous = cells[cells.length - 1].date;
    const next = new Date(previous);
    next.setDate(previous.getDate() + 1);
    cells.push({ date: next, outside: true });
  }
  return cells;
}

export default function StyledDateInput({
  value,
  onChange,
  className = '',
  id,
  name,
  required,
  disabled,
  min,
  max,
  title,
  withTime = false
}) {
  const selected = parseDate(value);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const [view, setView] = useState(() => ({
    year: (selected || today).getFullYear(),
    month: (selected || today).getMonth()
  }));
  const [time, setTime] = useState(() => parseTime(value));
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const minDate = min ? String(min).slice(0, 10) : '';
  const maxDate = max ? String(max).slice(0, 10) : '';

  const emit = (next) => {
    if (onChange) {
      onChange({
        target: { value: next, name },
        currentTarget: { value: next, name }
      });
    }
  };

  const isBlocked = (date) => {
    const iso = toISODate(date);
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  };

  const placeMenu = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 304;
    const height = withTime ? 420 : 360;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < height && rect.top > spaceBelow;
    setMenuStyle({
      position: 'fixed',
      left,
      width,
      top: openUp ? Math.max(8, rect.top - height - 6) : rect.bottom + 6,
      zIndex: 5000
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    placeMenu();
    const onReflow = () => placeMenu();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open, withTime]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const cells = useMemo(
    () => buildCells(view.year, view.month),
    [view.year, view.month]
  );

  const openCalendar = () => {
    if (disabled) return;
    const base = selected || today;
    setView({ year: base.getFullYear(), month: base.getMonth() });
    setTime(parseTime(value));
    setOpen((prev) => !prev);
  };

  const shiftMonth = (delta) => {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const chooseDay = (date) => {
    if (isBlocked(date)) return;
    const iso = toISODate(date);
    if (withTime) {
      const hour = String(time.hour || '00').padStart(2, '0').slice(-2);
      const minute = String(time.minute || '00').padStart(2, '0').slice(-2);
      emit(`${iso}T${hour}:${minute}`);
      return;
    }
    emit(iso);
    setOpen(false);
  };

  const applyTime = (nextTime) => {
    const base = selected || today;
    const hour = String(nextTime.hour).padStart(2, '0').slice(-2);
    const minute = String(nextTime.minute).padStart(2, '0').slice(-2);
    setTime({ hour, minute });
    if (!isBlocked(base)) emit(`${toISODate(base)}T${hour}:${minute}`);
  };

  return (
    <div className={`styled-date ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        title={title}
        disabled={disabled}
        className={`styled-date-trigger ${className}`.trim()}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openCalendar}
      >
        <span className={value ? 'styled-date-value' : 'styled-date-placeholder'}>
          {value ? formatDisplay(value, withTime) : (withTime ? 'Select date and time' : 'Select date')}
        </span>
        <FaCalendarAlt className="styled-date-icon" aria-hidden="true" />
      </button>
      {required ? (
        <input
          className="styled-date-hidden"
          tabIndex={-1}
          aria-hidden="true"
          value={value || ''}
          required
          onChange={() => {}}
        />
      ) : null}
      {open && menuStyle
        ? createPortal(
            <div ref={menuRef} className="styled-date-popover" style={menuStyle} role="dialog">
              <div className="styled-date-header">
                <button type="button" className="styled-date-nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
                <span className="styled-date-month">{MONTHS[view.month]} {view.year}</span>
                <button type="button" className="styled-date-nav" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
              </div>
              <div className="styled-date-weekdays">
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="styled-date-grid">
                {cells.map((cell) => {
                  const blocked = isBlocked(cell.date);
                  const active = sameDay(cell.date, selected);
                  const isToday = sameDay(cell.date, today);
                  const className = [
                    'styled-date-day',
                    cell.outside ? 'outside' : '',
                    active ? 'selected' : '',
                    isToday ? 'today' : ''
                  ].filter(Boolean).join(' ');
                  return (
                    <button
                      key={toISODate(cell.date)}
                      type="button"
                      className={className}
                      disabled={blocked}
                      onClick={() => chooseDay(cell.date)}
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}
              </div>
              {withTime ? (
                <div className="styled-date-time">
                  <span>Time</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    aria-label="Hour"
                    value={time.hour}
                    onChange={(event) => {
                      const hour = event.target.value.replace(/[^\d]/g, '').slice(0, 2);
                      const next = { ...time, hour };
                      setTime(next);
                      if (hour.length === 2) {
                        const clamped = String(Math.min(23, Number(hour))).padStart(2, '0');
                        applyTime({ ...next, hour: clamped });
                      }
                    }}
                    onBlur={() => {
                      const hour = String(Math.min(23, Number(time.hour || 0))).padStart(2, '0');
                      applyTime({ ...time, hour });
                    }}
                  />
                  <span>:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    aria-label="Minute"
                    value={time.minute}
                    onChange={(event) => {
                      const minute = event.target.value.replace(/[^\d]/g, '').slice(0, 2);
                      const next = { ...time, minute };
                      setTime(next);
                      if (minute.length === 2) {
                        const clamped = String(Math.min(59, Number(minute))).padStart(2, '0');
                        applyTime({ ...next, minute: clamped });
                      }
                    }}
                    onBlur={() => {
                      const minute = String(Math.min(59, Number(time.minute || 0))).padStart(2, '0');
                      applyTime({ ...time, minute });
                    }}
                  />
                </div>
              ) : null}
              <div className="styled-date-footer">
                {!required ? (
                  <button type="button" className="styled-date-link" onClick={() => { emit(''); setOpen(false); }}>
                    Clear
                  </button>
                ) : <span />}
                <button
                  type="button"
                  className="styled-date-link"
                  onClick={() => {
                    if (!isBlocked(today)) chooseDay(today);
                  }}
                >
                  Today
                </button>
                {withTime ? (
                  <button type="button" className="styled-date-done" onClick={() => setOpen(false)}>
                    Done
                  </button>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
