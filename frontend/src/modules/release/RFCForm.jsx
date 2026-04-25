import { useState } from 'react';
import { api } from '../../api/client';

const initialState = {
  kreirao_id: '',
  naziv: '',
  tip: 'normalna',
  plan_rollbacka: '',
  procjena_utjecaja: '',
  release_verzija: '',
};

export default function RFCForm({ onCreated }) {
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = {
        kreirao_id: Number(form.kreirao_id),
        naziv: form.naziv,
        tip: form.tip,
        plan_rollbacka: form.plan_rollbacka,
        procjena_utjecaja: form.procjena_utjecaja,
        kreiraj_release: Boolean(form.release_verzija),
        release_kreirao_id: form.release_verzija ? Number(form.kreirao_id) : undefined,
        release_verzija: form.release_verzija || undefined,
      };

      await api.createRfc(payload);
      setForm(initialState);
      setMessage('RFC uspjesno kreiran.');
      onCreated();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel">
      <h3>Create Change Request</h3>
      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Requester ID
          <input name="kreirao_id" value={form.kreirao_id} onChange={onChange} required />
        </label>
        <label>
          Request Title
          <input name="naziv" value={form.naziv} onChange={onChange} required />
        </label>
        <label>
          Change Type
          <select name="tip" value={form.tip} onChange={onChange}>
            <option value="normalna">normalna</option>
            <option value="standardna">standardna</option>
            <option value="hitna">hitna</option>
          </select>
        </label>
        <label>
          Release Version (Optional)
          <input name="release_verzija" value={form.release_verzija} onChange={onChange} />
        </label>
        <label>
          Rollback Plan
          <textarea name="plan_rollbacka" value={form.plan_rollbacka} onChange={onChange} rows={3} />
        </label>
        <label>
          Impact Assessment
          <textarea name="procjena_utjecaja" value={form.procjena_utjecaja} onChange={onChange} rows={3} />
        </label>
        <button className="btn-primary form-action" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Submit Request'}
        </button>
      </form>
      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
