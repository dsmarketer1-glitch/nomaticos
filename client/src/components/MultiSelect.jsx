import { useState, useRef, useEffect } from 'react';

export default function MultiSelect({ options, selected, onChange, placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const removeOption = (opt, e) => {
    e.stopPropagation();
    onChange(selected.filter(s => s !== opt));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected items / trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[44px] flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-input border cursor-pointer transition-colors duration-200"
        style={{
          backgroundColor: 'var(--bg-input)',
          borderColor: isOpen ? 'var(--accent)' : 'var(--border-default)',
          color: 'var(--text-primary)',
        }}
      >
        {selected.length === 0 ? (
          <span style={{ color: 'var(--text-muted)' }} className="text-sm">{placeholder}</span>
        ) : (
          selected.map(opt => (
            <span
              key={opt}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-xs font-medium"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--accent)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              {opt}
              <button
                onClick={(e) => removeOption(opt, e)}
                className="ml-0.5 hover:opacity-70 text-xs"
              >
                ✕
              </button>
            </span>
          ))
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-input border shadow-xl z-50 max-h-[240px] overflow-y-auto animate-fadeIn"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
          }}
        >
          {options.map(opt => {
            const isSelected = selected.includes(opt);
            return (
              <div
                key={opt}
                onClick={() => toggleOption(opt)}
                className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors text-sm hover:bg-white/5"
                style={{ color: 'var(--text-primary)' }}
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center border transition-all duration-150 shrink-0"
                  style={{
                    backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border-default)',
                  }}
                >
                  {isSelected && (
                    <span className="text-white text-[10px] font-bold">✓</span>
                  )}
                </div>
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
