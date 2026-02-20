import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import {
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
  Clock,
  User,
  FileText,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';

interface AuditLogEntry {
  _id: string;
  user: { email: string; fullName: string; role: string } | null;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  isRollback?: boolean;
  rolledBackFrom?: string;
  timestamp: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500/10 text-green-400 border border-green-500/20',
  update: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  delete: 'bg-red-500/10 text-red-400 border border-red-500/20',
  rollback: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

export default function AuditLogs() {
  const { token } = useAuth();
  const API = import.meta.env.VITE_API_URL ?? '';

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Detail modal
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'all' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSingle = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/auditlogs/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteTarget(null);
      setDeleteId(null);
      fetchLogs();
    } catch {
      setError('Failed to delete log.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/auditlogs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteTarget(null);
      fetchLogs();
    } catch {
      setError('Failed to delete all logs.');
    } finally {
      setDeleting(false);
    }
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (entityFilter) params.entity = entityFilter;
      if (actionFilter) params.action = actionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await axios.get(`${API}/auditlogs`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [token, page, entityFilter, actionFilter, startDate, endDate, API]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const resetFilters = () => {
    setEntityFilter('');
    setActionFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const entityOptions = ['invoice', 'expense', 'payroll', 'bank', 'employee', 'user', 'client', 'vendor'];
  const actionOptions = ['create', 'update', 'delete', 'rollback'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">Track all system changes — admin eyes only</p>
          </div>
        </div>
        <button
          onClick={() => setDeleteTarget('all')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
        >
          <Trash2 size={15} /> Clear All Logs
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
          <Filter size={14} /> Filters
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={entityFilter}
            onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          >
            <option value="">All Entities</option>
            {entityOptions.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>

          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          >
            <option value="">All Actions</option>
            {actionOptions.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPage(1); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            placeholder="Start date"
          />

          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPage(1); }}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            placeholder="End date"
          />
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw size={12} /> Reset filters
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <FileText size={32} className="opacity-30" />
            <p className="text-sm">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map(log => (
                  <tr key={log._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="opacity-50" />
                        {format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm:ss')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="opacity-50 text-muted-foreground" />
                        <span className="text-foreground">{log.user?.fullName || log.user?.email || 'System'}</span>
                        <span className="text-xs text-muted-foreground capitalize">({log.user?.role})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                        {log.isRollback && <RotateCcw size={10} className="mr-1" />}
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-foreground">{log.entity}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.ipAddress || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelected(log)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Eye size={13} /> Details
                        </button>
                        <button
                          onClick={() => { setDeleteId(log._id); setDeleteTarget('single'); }}
                          className="flex items-center gap-1 text-xs text-destructive hover:underline"
                        >
                          <Trash2 size={13} /> Delete
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

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{pagination.total} total records</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2">Page {page} of {pagination.pages}</span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-lg">Log Details</h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Timestamp</p>
                <p className="text-foreground">{format(new Date(selected.timestamp), 'dd MMM yyyy, HH:mm:ss')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">User</p>
                <p className="text-foreground">{selected.user?.fullName || selected.user?.email || 'System'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Action</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ACTION_COLORS[selected.action] ?? ''}`}>
                  {selected.action}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Entity</p>
                <p className="text-foreground capitalize">{selected.entity}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Entity ID</p>
                <p className="text-foreground font-mono text-xs">{selected.entityId}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">IP Address</p>
                <p className="text-foreground font-mono text-xs">{selected.ipAddress || '—'}</p>
              </div>
            </div>

            {selected.beforeSnapshot && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Before Snapshot</p>
                <pre className="bg-muted/40 rounded-lg p-3 text-xs text-foreground overflow-auto max-h-40 whitespace-pre-wrap">
                  {JSON.stringify(selected.beforeSnapshot, null, 2)}
                </pre>
              </div>
            )}

            {selected.afterSnapshot && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">After Snapshot</p>
                <pre className="bg-muted/40 rounded-lg p-3 text-xs text-foreground overflow-auto max-h-40 whitespace-pre-wrap">
                  {JSON.stringify(selected.afterSnapshot, null, 2)}
                </pre>
              </div>
            )}

            {selected.details && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Details</p>
                <pre className="bg-muted/40 rounded-lg p-3 text-xs text-foreground overflow-auto max-h-40 whitespace-pre-wrap">
                  {JSON.stringify(selected.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-destructive" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  {deleteTarget === 'all' ? 'Clear All Logs?' : 'Delete Log?'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {deleteTarget === 'all'
                    ? 'This will permanently delete all audit log entries. This cannot be undone.'
                    : 'This will permanently delete this audit log entry.'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteId(null); }}
                className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteTarget === 'all' ? handleDeleteAll : handleDeleteSingle}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleteTarget === 'all' ? 'Clear All' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
