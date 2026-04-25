import { useState } from 'react';
import { api } from '../../api/client';

export default function CABSession({ onUpdated }) {
  const [rfcId, setRfcId] = useState('');
  const [cabOdluka, setCabOdluka] = useState('odobreno');
  const [odobrioId, setOdobrioId] = useState('');
  const [message, setMessage] = useState('');

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
      <h3>CAB Review</h3>
      <form className="form-grid compact" onSubmit={submit}>
        <label>
          Request ID
          <input value={rfcId} onChange={(event) => setRfcId(event.target.value)} required />
        </label>
        <label>
          Decision
          <select value={cabOdluka} onChange={(event) => setCabOdluka(event.target.value)}>
            <option value="odobreno">odobreno</option>
            <option value="odbijeno">odbijeno</option>
            <option value="odgodeno">odgodeno</option>
          </select>
        </label>
        <label>
          Approved By (User ID)
          <input value={odobrioId} onChange={(event) => setOdobrioId(event.target.value)} />
        </label>
        <div className="action-row">
          <button className="btn-primary" type="submit">Save CAB Decision</button>
        </div>
      </form>
      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
