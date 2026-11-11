import React, { useEffect, useLayoutEffect, useRef, useState, Children } from 'react';
import { createPortal } from 'react-dom';
import './StyledSelect.css';

function readOptions(children) {
  const options = [];
  Children.forEach(children, (child) => {
    if (!child || child.type !== 'option') return;
    const raw = child.props.value;
    options.push({
      value: raw == null ? '' : String(raw),
      label: child.props.children,
      disabled: Boolean(child.props.disabled)
    });
  });
  return options;
}

export default function StyledSelect({
  value,
  onChange,
  className = '',
  id,
  name,
  required,
  disabled,
  children
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const options = readOptions(children);
  const current = String(value ?? '');
  const selected = options.find((opt) => opt.value === current);

  const placeMenu = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuHeight = Math.min(240, options.length * 42 + 16);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 8 && rect.top > spaceBelow;
    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      top: openUp ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
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
  }, [open, options.length]);

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

  const choose = (opt) => {
    if (opt.disabled) return;
    setOpen(false);
    if (onChange) {
      onChange({
        target: { value: opt.value, name },
        currentTarget: { value: opt.value, name }
      });
    }
  };

  return (
    <div className={`styled-select ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`styled-select-trigger ${className}`.trim()}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        <span className="styled-select-value">{selected ? selected.label : ''}</span>
        <span className="styled-select-caret" aria-hidden="true" />
      </button>
      {required ? (
        <input
          className="styled-select-hidden"
          tabIndex={-1}
          aria-hidden="true"
          value={current}
          required
          onChange={() => {}}
        />
      ) : null}
      {open && menuStyle
        ? createPortal(
            <ul
              ref={menuRef}
              className="styled-select-menu"
              role="listbox"
              style={menuStyle}
            >
              {options.map((opt, index) => (
                <li key={`${opt.value}-${index}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={opt.value === current}
                    disabled={opt.disabled}
                    className={`styled-select-option${opt.value === current ? ' selected' : ''}`}
                    onClick={() => choose(opt)}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body
          )
        : null}
    </div>
  );
}
