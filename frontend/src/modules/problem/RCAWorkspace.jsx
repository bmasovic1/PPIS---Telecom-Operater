import { useState } from 'react';
import { api } from '../../api/client';

export default function RCAWorkspace({ onUpdated }) {
  const [problemId, setProblemId] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [method, setMethod] = useState('5_whys');
  const [status, setStatus] = useState('istrazivanje');
  const [message, setMessage] = useState('');

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
      <h3>Root Cause Analysis</h3>
      <div className="form-grid compact">
        <label>
          Problem ID
          <input value={problemId} onChange={(event) => setProblemId(event.target.value)} />
        </label>
        <label>
          RCA Method
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="5_whys">5_whys</option>
            <option value="ishikawa">ishikawa</option>
            <option value="fault_tree">fault_tree</option>
            <option value="kepner_tregoe">kepner_tregoe</option>
          </select>
        </label>
        <label>
          Root Cause
          <textarea value={rootCause} rows={3} onChange={(event) => setRootCause(event.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="novo">novo</option>
            <option value="istrazivanje">istrazivanje</option>
            <option value="workaround_aktivan">workaround_aktivan</option>
            <option value="rca_zavrsen">rca_zavrsen</option>
            <option value="fix_u_toku">fix_u_toku</option>
            <option value="riješen">rijesen</option>
            <option value="zatvoren">zatvoren</option>
          </select>
        </label>
        <div className="action-row">
          <button className="btn-secondary" type="button" onClick={updateRca}>Save Analysis</button>
          <button className="btn-primary" type="button" onClick={updateStatus}>Save Status</button>
        </div>
      </div>
      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
