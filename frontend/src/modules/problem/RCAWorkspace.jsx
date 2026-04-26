import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

export default function RCAWorkspace({ onUpdated }) {
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
      label: `#${problem.id} · ${problem.prioritet} · ${problem.status}`,
    }));
  }, [problems]);

  const updateRca = async () => {
    try {
      await api.updateProblemRca(problemId, { root_cause: rootCause, rca_metoda: method });
      setMessage('RCA updated.');
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateStatus = async () => {
    try {
      await api.updateProblemStatus(problemId, { status });
      setMessage('Problem status updated.');
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="panel">
      <h3 className="section-title">Root Cause Analysis</h3>
      <div className="form-grid compact">
        <label>
          Problem Lookup
          <select value={problemId} onChange={(event) => setProblemId(event.target.value)} disabled={loadingProblems}>
            <option value="">{loadingProblems ? 'Loading problems...' : 'Select problem'}</option>
            {problemOptions.map((problem) => (
              <option key={problem.value} value={problem.value}>{problem.label}</option>
            ))}
          </select>
        </label>
        <label>
          RCA Method
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="5_whys">5 Whys</option>
            <option value="ishikawa">Ishikawa</option>
            <option value="fault_tree">Fault Tree</option>
            <option value="kepner_tregoe">Kepner-Tregoe</option>
          </select>
        </label>
        <label>
          Root Cause
          <textarea value={rootCause} rows={3} onChange={(event) => setRootCause(event.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="novo">New</option>
            <option value="istrazivanje">Investigating</option>
            <option value="workaround_aktivan">Workaround Active</option>
            <option value="rca_zavrsen">RCA Complete</option>
            <option value="fix_u_toku">Fix In Progress</option>
            <option value="riješen">Resolved</option>
            <option value="zatvoren">Closed</option>
          </select>
        </label>
        <div className="action-row">
          <button className="btn-secondary" type="button" onClick={updateRca}>Update Analysis</button>
          <button className="btn-primary" type="button" onClick={updateStatus}>Update Status</button>
        </div>
      </div>
      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
