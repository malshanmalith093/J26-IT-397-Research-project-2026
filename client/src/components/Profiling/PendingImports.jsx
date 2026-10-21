import React from 'react';
import { Send, Trash2, Inbox, RefreshCw } from 'lucide-react';
import { RiskBadge } from './ui';

/**
 * Staff: Component 1 records that were imported WITHOUT sending the advice.
 * The admin can send the advice later (one record or all) or discard a record.
 * Data loading lives in SendAdvicePanel so the tab badge count stays in sync.
 */
const PendingImports = ({ pending, busy, onSend, onSendAll, onDelete, onRefresh }) => (
    <div>
        <div className="adv-toolbar">
            <p className="adv-hint">
                These Component 1 records were imported without sending the advice. Nothing is visible to the
                students yet — send the advice when you are ready, or discard a record.
            </p>
            <div className="adv-toolbar-actions">
                <button className="adv-btn ghost" onClick={onRefresh} disabled={busy}>
                    <RefreshCw size={14} /> Refresh
                </button>
                {pending.length > 0 && (
                    <button
                        className="adv-btn primary"
                        onClick={onSendAll}
                        disabled={busy}
                        data-testid="send-all-pending"
                    >
                        <Send size={16} /> Send all ({pending.length})
                    </button>
                )}
            </div>
        </div>

        {pending.length === 0 ? (
            <div className="adv-empty">
                <Inbox size={36} />
                <h3>No pending records</h3>
                <p>Use “Import only (send later)” on the Bulk import tab to stage Component 1 data here.</p>
            </div>
        ) : (
            <div className="adv-table-wrap">
                <table className="adv-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Risk</th>
                            <th>Course</th>
                            <th>Imported</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {pending.map((p) => (
                            <tr key={p.id} data-testid="pending-row">
                                <td>
                                    <strong>{p.name || '—'}</strong>
                                    <div className="adv-msgs">{p.email}</div>
                                </td>
                                <td><RiskBadge level={p.risk_level} /></td>
                                <td>{p.course_code}</td>
                                <td className="adv-msgs">
                                    {new Date(p.imported_at).toLocaleString()}
                                    {p.source === 'component1' ? ' · from Component 1' : ''}
                                </td>
                                <td className="adv-row-actions">
                                    <button
                                        className="adv-btn small ghost"
                                        title="Discard this record"
                                        onClick={() => onDelete(p.id)}
                                        disabled={busy}
                                        data-testid={`delete-${p.id}`}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button
                                        className="adv-btn small"
                                        onClick={() => onSend(p.id)}
                                        disabled={busy}
                                        data-testid={`send-${p.id}`}
                                    >
                                        <Send size={14} /> Send advice
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

export default PendingImports;
