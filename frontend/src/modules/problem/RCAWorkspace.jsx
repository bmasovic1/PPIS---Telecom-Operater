import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

const translations = {
  bs: {
    title: 'Analiza uzroka',
    lookup: 'Pretraga problema',
    loading: 'Učitavanje problema...',
    select: 'Odaberi problem',
    method: 'RCA metoda',
    rootCause: 'Uzrok',
    status: 'Status',
    new: 'Novo',
    investigating: 'Istraživanje',
    workaround: 'Aktivan workaround',
    rcaDone: 'RCA završen',
    fixInProgress: 'Fix u toku',
    resolved: 'Riješen',
    closed: 'Zatvoren',
    updateAnalysis: 'Ažuriraj analizu',
    updateStatus: 'Ažuriraj status',
    rcaUpdated: 'RCA ažuriran.',
    statusUpdated: 'Status problema ažuriran.',
    method5: 'Analiza mrežnih logova',
    methodIshikawa: 'Analiza konfiguracije',
    methodFaultTree: 'Analiza pokrivenosti i signala',
    methodKepner: 'Analiza performansi mreže',
  },
  en: {
    title: 'Root Cause Analysis',
    lookup: 'Problem Lookup',
    loading: 'Loading problems...',
    select: 'Select problem',
    method: 'RCA Method',
    rootCause: 'Root Cause',
    status: 'Status',
    new: 'New',
    investigating: 'Investigating',
    workaround: 'Workaround Active',
    rcaDone: 'RCA Complete',
    fixInProgress: 'Fix In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    updateAnalysis: 'Update Analysis',
    updateStatus: 'Update Status',
    rcaUpdated: 'RCA updated.',
    statusUpdated: 'Problem status updated.',
    method5: 'Analiza mrežnih logova',
    methodIshikawa: 'Analiza konfiguracije',
    methodFaultTree: 'Analiza pokrivenosti i signala',
    methodKepner: 'Analiza performansi mreže',
  },
};

export default function RCAWorkspace({ onUpdated, language = 'en' }) {
  const t = translations[language] || translations.en;
  const [problemId, setProblemId] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [method, setMethod] = useState('5_whys');
  const [status, setStatus] = useState('istrazivanje');
  const [message, setMessage] = useState('');
  const [problems, setProblems] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadProblems = async () => {
      try {
        const data = await api.getProblems();
        if (alive) {
          setProblems(data.filter((problem) => problem.status !== 'zatvoren'));
        }
      } catch (error) {
        if (alive) {
          setMessage(error.message);
        }
      } finally {
        if (alive) {
          setLoadingProblems(false);
        }
      }
    };

    loadProblems();

    return () => {
      alive = false;
    };
  }, []);

  const problemOptions = useMemo(() => {
    return problems.map((problem) => ({
      value: String(problem.id),
      label: problem.root_cause && problem.root_cause.trim()
        ? problem.root_cause
        : `Problem #${problem.id} · P${problem.prioritet}`,
    }));
  }, [problems]);

  const updateRca = async () => {
    try {
      await api.updateProblemRca(problemId, { root_cause: rootCause, rca_metoda: method });
      setMessage(t.rcaUpdated);
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateStatus = async () => {
    try {
      await api.updateProblemStatus(problemId, { status });
      setMessage(t.statusUpdated);
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="panel">
      <h3 className="section-title">{t.title}</h3>
      <div className="form-grid compact">
        <label>
          {t.lookup}
          <select value={problemId} onChange={(event) => setProblemId(event.target.value)} disabled={loadingProblems}>
            <option value="">{loadingProblems ? t.loading : t.select}</option>
            {problemOptions.map((problem) => (
              <option key={problem.value} value={problem.value}>{problem.label}</option>
            ))}
          </select>
        </label>
        <label>
          {t.method}
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="5_whys">{t.method5}</option>
            <option value="ishikawa">{t.methodIshikawa}</option>
            <option value="fault_tree">{t.methodFaultTree}</option>
            <option value="kepner_tregoe">{t.methodKepner}</option>
          </select>
        </label>
        <label>
          {t.rootCause}
          <textarea value={rootCause} rows={3} onChange={(event) => setRootCause(event.target.value)} />
        </label>
        <label>
          {t.status}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="novo">{t.new}</option>
            <option value="istrazivanje">{t.investigating}</option>
            <option value="workaround_aktivan">{t.workaround}</option>
            <option value="rca_zavrsen">{t.rcaDone}</option>
            <option value="fix_u_toku">{t.fixInProgress}</option>
            <option value="riješen">{t.resolved}</option>
            <option value="zatvoren">{t.closed}</option>
          </select>
        </label>
        <div className="action-row">
          <button className="btn-secondary" type="button" onClick={updateRca}>{t.updateAnalysis}</button>
          <button className="btn-primary" type="button" onClick={updateStatus}>{t.updateStatus}</button>
        </div>
      </div>
      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
