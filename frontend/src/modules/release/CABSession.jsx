import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

export default function CABSession({ onUpdated }) {
  const [rfcId, setRfcId] = useState('');
  const [cabOdluka, setCabOdluka] = useState('odobreno');
  const [odobrioId, setOdobrioId] = useState('');
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

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

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await api.updateCabDecision(rfcId, {
        cab_odluka: cabOdluka,
        odobrio_id: odobrioId ? Number(odobrioId) : undefined,
      });
      setMessage('CAB odluka azurirana.');
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="panel">
      <h3 className="section-title">CAB Approval</h3>
      <form className="form-grid compact" onSubmit={submit}>
        <label>
          RFC ID (from table)
          <input value={rfcId} onChange={(event) => setRfcId(event.target.value)} placeholder="e.g., 18" required />
        </label>
        <label>
          Decision
          <select value={cabOdluka} onChange={(event) => setCabOdluka(event.target.value)}>
            <option value="odobreno">Approved</option>
            <option value="odbijeno">Rejected</option>
            <option value="odgodeno">Deferred</option>
          </select>
        </label>
        <label>
          Approved By
          <select value={odobrioId} onChange={(event) => setOdobrioId(event.target.value)} disabled={usersLoading}>
            <option value="">{usersLoading ? 'Loading users...' : 'Select approver'}</option>
            {approverOptions.map((user) => (
              <option key={user.value} value={user.value}>{user.label}</option>
            ))}
          </select>
        </label>
        <div className="action-row">
          <button className="btn-primary" type="submit">Save Approval</button>
        </div>
      </form>
      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
