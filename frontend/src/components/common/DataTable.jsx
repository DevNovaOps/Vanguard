import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { exportToCSV } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.02,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function DataTable({
  data = [],
  columns = [],
  pageSize = 10,
  searchable = false,
  searchValue = '',
  exportFilename = 'export',
  showExport = true,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleExport = () => {
    const exportData = data.map(row => {
      const obj = {};
      columns.forEach(col => { obj[col.label] = row[col.key]; });
      return obj;
    });
    exportToCSV(exportData, exportFilename);
  };

  return (
    <div className="animate-fade-in">
      {showExport && data.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      )}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={sortKey === col.key ? 'sorted' : ''}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.label}
                  {col.sortable !== false && (
                    <span className="sort-icon">
                      {sortKey === col.key
                        ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                        : <ChevronUp size={12} />
                      }
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ position: 'relative' }}>
            <AnimatePresence mode="popLayout">
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    {columns.map((col, j) => (
                      <td key={`skeleton-${i}-${j}`}>
                        <div className="skeleton" style={{ height: '16px', width: col.width || (j === 0 ? '40%' : '80%'), opacity: 0.8 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr key="empty-row">
                  <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => (
                  <motion.tr
                    key={row.id || row._id || i}
                    onClick={() => onRowClick?.(row)}
                    style={onRowClick ? { cursor: 'pointer' } : {}}
                    variants={rowVariants}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout="position"
                  >
                    {columns.map(col => (
                      <td key={col.key}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="table-pagination">
            <span>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
            </span>
            <div className="table-pagination-btns">
              <button onClick={() => setPage(0)} disabled={page === 0}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>
                    {p + 1}
                  </button>
                );
              })}
              <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

