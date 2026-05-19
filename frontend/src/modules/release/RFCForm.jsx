import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

const translations = {
  bs: {
    title: 'Kreiraj zahtjev za promjenu',
    requester: 'Podnosilac zahtjeva',
    requesterLoading: 'Učitavanje korisnika...',
    requesterSelect: 'Odaberi podnosioca',
    requestTitle: 'Naziv zahtjeva',
    changeType: 'Tip promjene',
    normal: 'Normalna',
    standard: 'Standardna',
    emergency: 'Hitna',
    releaseVersion: 'Verzija release-a (opcionalno)',
    rollbackPlan: 'Plan rollback-a',
    impact: 'Procjena utjecaja',
    saving: 'Spremanje...',
    submit: 'Pošalji promjenu',
    success: 'RFC je uspješno kreiran.',
  },
  en: {
    title: 'Create Change Request',
    requester: 'Requester',
    requesterLoading: 'Loading users...',
    requesterSelect: 'Select requester',
    requestTitle: 'Request Title',
    changeType: 'Change Type',
    normal: 'Normal',
    standard: 'Standard',
    emergency: 'Emergency',
    releaseVersion: 'Release Version (Optional)',
    rollbackPlan: 'Rollback Plan',
    impact: 'Impact Assessment',
    saving: 'Saving...',
    submit: 'Submit Change',
    success: 'RFC successfully created.',
  },
};

const initialState = {
  kreirao_id: '',
  naziv: '',
  tip: 'normalna',
  plan_rollbacka: '',
  procjena_utjecaja: '',
  release_verzija: '',
};

export default function RFCForm({ onCreated, language = 'en' }) {
  const t = translations[language] || translations.en;
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
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

  const requesterOptions = useMemo(() => {
    return users.map((user) => ({
      value: String(user.id),
      label: `${user.ime} ${user.prezime} · ${user.email}`,
    }));
  }, [users]);

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
      setMessage(t.success);
      onCreated();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel">
      <h3 className="section-title">{t.title}</h3>
      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          {t.requester}
          <select name="kreirao_id" value={form.kreirao_id} onChange={onChange} required disabled={usersLoading}>
            <option value="">{usersLoading ? t.requesterLoading : t.requesterSelect}</option>
            {requesterOptions.map((user) => (
              <option key={user.value} value={user.value}>{user.label}</option>
            ))}
          </select>
        </label>
        <label>
          {t.requestTitle}
          <input name="naziv" value={form.naziv} onChange={onChange} required />
        </label>
        <label>
          {t.changeType}
          <select name="tip" value={form.tip} onChange={onChange}>
            <option value="normalna">{t.normal}</option>
            <option value="standardna">{t.standard}</option>
            <option value="hitna">{t.emergency}</option>
          </select>
        </label>
        <label>
          {t.releaseVersion}
          <input name="release_verzija" value={form.release_verzija} onChange={onChange} />
        </label>
        <label>
          {t.rollbackPlan}
          <textarea name="plan_rollbacka" value={form.plan_rollbacka} onChange={onChange} rows={3} />
        </label>
        <label>
          {t.impact}
          <textarea name="procjena_utjecaja" value={form.procjena_utjecaja} onChange={onChange} rows={3} />
        </label>
        <button className="btn-primary form-action" type="submit" disabled={saving}>
          {saving ? t.saving : t.submit}
        </button>
      </form>
      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
