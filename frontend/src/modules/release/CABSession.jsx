import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '../../api/client';

const translations = {
  bs: {
    title: 'CAB odobrenje',
    rfcLabel: 'RFC (na čekanju CAB-a)',
    rfcLoading: 'Učitavanje RFC-ova...',
    rfcSelect: 'Odaberi RFC',
    decision: 'Odluka',
    approved: 'Odobreno',
    rejected: 'Odbijeno',
    deferred: 'Odgođeno',
    approvedBy: 'Odobrio',
    usersLoading: 'Učitavanje korisnika...',
    selectApprover: 'Odaberi odobravatelja',
    save: 'Spremi odobrenje',
    updated: 'CAB odluka ažurirana.',
  },
  en: {
    title: 'CAB Approval',
    rfcLabel: 'RFC (pending CAB)',
    rfcLoading: 'Loading RFCs...',
    rfcSelect: 'Select RFC',
    decision: 'Decision',
    approved: 'Approved',
    rejected: 'Rejected',
    deferred: 'Deferred',
    approvedBy: 'Approved By',
    usersLoading: 'Loading users...',
    selectApprover: 'Select approver',
    save: 'Save Approval',
    updated: 'CAB decision updated.',
  },
};

export default function CABSession({ onUpdated, language = 'en' }) {
  const t = translations[language] || translations.en;
  const [rfcId, setRfcId] = useState('');
  const [cabOdluka, setCabOdluka] = useState('odobreno');
  const [odobrioId, setOdobrioId] = useState('');
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [rfcs, setRfcs] = useState([]);
  const [rfcsLoading, setRfcsLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadUsers = async () => {
      try {
        const data = await api.getUsers();
        if (alive) {
          setUsers(data.filter((user) => user.status === 'aktivan'));
        }
      } catch (error) {
        if (alive) {
          setMessage(error.message);
        }
      } finally {
        if (alive) {
          setUsersLoading(false);
        }
      }
    };

    loadUsers();

    const loadRfcs = async () => {
      try {
        // Prefer dedicated pending endpoint if available
        const data = await (api.getPendingRfcs ? api.getPendingRfcs() : api.getRfcs());
        if (alive) {
          setRfcs(Array.isArray(data) ? data.filter((r) => (r.cab_odluka || 'na_cekanju') === 'na_cekanju') : []);
        }
      } catch (error) {
        if (alive) setMessage(error.message);
      } finally {
        if (alive) setRfcsLoading(false);
      }
    };

    loadRfcs();

    return () => {
      alive = false;
    };
  }, []);

  const approverOptions = useMemo(() => {
    return users.map((user) => ({
      value: String(user.id),
      label: `${user.ime} ${user.prezime} · ${user.email}`,
    }));
  }, [users]);

  const rfcOptions = useMemo(() => {
    return rfcs.map((r) => ({ value: String(r.id), label: `#${r.id} · ${r.naziv}` }));
  }, [rfcs]);

  const getRoleFromToken = () => {
    try {
      const token = authStorage.getToken();
      if (!token) return { role: null, id: null, name: '' };
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const decoded = JSON.parse(atob(padded));
      return { role: decoded?.uloga || decoded?.role || null, id: decoded?.id || decoded?.userId || null, name: `${decoded?.ime || ''} ${decoded?.prezime || ''}`.trim() };
    } catch (e) {
      return { role: null, id: null, name: '' };
    }
  };

  const currentUser = getRoleFromToken();

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await api.updateCabDecision(rfcId, {
        cab_odluka: cabOdluka,
        odobrio_id: odobrioId ? Number(odobrioId) : Number(currentUser.id),
      });
      setMessage(t.updated);
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="panel">
      <h3 className="section-title">{t.title}</h3>
      <form className="form-grid compact" onSubmit={submit}>
        <label>
          {t.rfcLabel}
          <select value={rfcId} onChange={(event) => setRfcId(event.target.value)} disabled={rfcsLoading} required>
            <option value="">{rfcsLoading ? t.rfcLoading : t.rfcSelect}</option>
            {rfcOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label>
          {t.decision}
          <select value={cabOdluka} onChange={(event) => setCabOdluka(event.target.value)}>
            <option value="odobreno">{t.approved}</option>
            <option value="odbijeno">{t.rejected}</option>
            <option value="odgodeno">{t.deferred}</option>
          </select>
        </label>
        <label>
          {t.approvedBy}
          {currentUser.role === 'admin' ? (
            <select value={odobrioId || String(currentUser.id)} onChange={(event) => setOdobrioId(event.target.value)} disabled={usersLoading}>
              <option value="">{usersLoading ? t.usersLoading : t.selectApprover}</option>
              {approverOptions.map((user) => (
                <option key={user.value} value={user.value}>{user.label}</option>
              ))}
            </select>
          ) : (
            <input value={currentUser.name || ''} readOnly />
          )}
        </label>
        <div className="action-row">
          <button className="btn-primary" type="submit">{t.save}</button>
        </div>
      </form>
      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
