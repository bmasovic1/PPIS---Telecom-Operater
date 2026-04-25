import { useState } from 'react';
import { api } from '../../api/client';

export default function PostDeployMonitor({ onUpdated }) {
  const [releaseId, setReleaseId] = useState('');
  const [goNoGo, setGoNoGo] = useState('go');
  const [deployDate, setDeployDate] = useState('');
  const [pirStatus, setPirStatus] = useState('na_cekanju');
  const [message, setMessage] = useState('');

  const updateGo = async () => {
    try {
      await api.updateGoNoGo(releaseId, { go_no_go: goNoGo });
      setMessage('Go/No-Go azuriran.');
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateDeploy = async () => {
    try {
      await api.updateDeploy(releaseId, { datum_deploymenta: deployDate });
      setMessage('Deployment datum azuriran.');
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updatePir = async () => {
    try {
      await api.updatePir(releaseId, { pir_status: pirStatus });
      setMessage('PIR status azuriran.');
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="panel">
      <h3>Deployment Controls</h3>
      <div className="form-grid compact">
        <label>
          Release ID
          <input value={releaseId} onChange={(event) => setReleaseId(event.target.value)} />
        </label>
        <label>
          Go / No-Go
          <select value={goNoGo} onChange={(event) => setGoNoGo(event.target.value)}>
            <option value="go">go</option>
            <option value="no_go">no_go</option>
            <option value="na_cekanju">na_cekanju</option>
          </select>
        </label>
        <label>
          Deployment Date
          <input type="datetime-local" value={deployDate} onChange={(event) => setDeployDate(event.target.value)} />
        </label>
        <label>
          PIR Status
          <select value={pirStatus} onChange={(event) => setPirStatus(event.target.value)}>
            <option value="na_cekanju">na_cekanju</option>
            <option value="u_toku">u_toku</option>
            <option value="zavrsen">zavrsen</option>
          </select>
        </label>
        <div className="action-row">
          <button className="btn-secondary" type="button" onClick={updateGo}>Save Go/No-Go</button>
          <button className="btn-secondary" type="button" onClick={updateDeploy}>Schedule Deployment</button>
          <button className="btn-primary" type="button" onClick={updatePir}>Save PIR Status</button>
        </div>
      </div>
      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
