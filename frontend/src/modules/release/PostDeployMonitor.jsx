import { useState, useEffect } from 'react';
import { api, authStorage } from '../../api/client';

export default function PostDeployMonitor({ onUpdated }) {
  const [releaseId, setReleaseId] = useState('');
  const [goNoGo, setGoNoGo] = useState('go');
  const [deployDate, setDeployDate] = useState('');
  const [pirStatus, setPirStatus] = useState('na_cekanju');
  const [rollbackExecuted, setRollbackExecuted] = useState('false');
  const [message, setMessage] = useState('');
  const [releaseData, setReleaseData] = useState(null);
  const [nocNotified, setNocNotified] = useState(false);

  // Fetch release data when Release ID changes
  useEffect(() => {
    if (!releaseId) {
      setReleaseData(null);
      return;
    }

    const fetchReleaseData = async () => {
      try {
        const pipeline = await api.getReleasePipeline();
        const release = pipeline.find((r) => String(r.id) === String(releaseId));
        if (release) {
          setReleaseData(release);
          // Pre-populate form fields
          if (release.go_no_go) setGoNoGo(release.go_no_go);
          if (release.datum_deploymenta) setDeployDate(release.datum_deploymenta);
          if (release.pir_status) setPirStatus(release.pir_status);
          if (release.rollback_izvrsen) setRollbackExecuted(release.rollback_izvrsen === true || release.rollback_izvrsen === 'true' ? 'true' : 'false');
        } else {
          setReleaseData(null);
        }
      } catch (error) {
        setMessage(error.message);
      }
    };

    fetchReleaseData();
  }, [releaseId]);

  const calculateChecklist = () => {
    if (!releaseData) return [];

    const uatDone = releaseData.pir_status && releaseData.pir_status !== 'na_cekanju';
    const cabApproved = releaseData.cab_odluka === 'odobreno';
    const rollbackPlanReady = releaseData.plan_rollbacka && releaseData.plan_rollbacka.trim().length > 0;
    const windowScheduled = !!releaseData.datum_deploymenta;
    const monitoringActive = releaseData.monitoring_kraj !== null && releaseData.monitoring_kraj !== undefined;

    return [
      {
        label: 'UAT testing completed',
        checked: uatDone,
        auto: true,
      },
      {
        label: 'CAB approval obtained',
        checked: cabApproved,
        auto: true,
      },
      {
        label: 'Rollback plan ready',
        checked: rollbackPlanReady,
        auto: true,
      },
      {
        label: 'Deployment window scheduled',
        checked: windowScheduled,
        auto: true,
      },
      {
        label: 'NOC team notified',
        checked: nocNotified,
        auto: false,
      },
      {
        label: 'Post-deployment monitoring 72h',
        checked: monitoringActive,
        auto: true,
      },
    ];
  };

  const checklist = calculateChecklist();

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

  const updateRollback = async () => {
    try {
      await api.updateRollback(releaseId, { rollback_izvrsen: rollbackExecuted === 'true' });
      setMessage('Rollback status updated.');
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const getRoleFromToken = () => {
    try {
      const token = authStorage.getToken();
      if (!token) return null;
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const decoded = JSON.parse(atob(padded));
      return decoded?.uloga || decoded?.role || null;
    } catch (e) {
      return null;
    }
  };

  const role = getRoleFromToken();
  const canUpdateGo = ['release_manager', 'admin'].includes(role);
  const canSchedule = ['devops', 'admin'].includes(role);
  const canUpdatePir = ['release_manager', 'qa_inzenjer', 'admin'].includes(role);
  const canUpdateRollback = ['devops', 'admin'].includes(role);

  return (
    <section className="panel">
      <h3 className="section-title">Deployment Review</h3>
      <p className="helper-line"><strong>Workflow:</strong> First complete CAB Approval (set RFC decision to "Approved"), then Go/No-Go below.</p>
      <div className="form-grid compact">
        <label>
          Release ID
          <input value={releaseId} onChange={(event) => setReleaseId(event.target.value)} placeholder="e.g., 11" />
        </label>
      </div>

      {releaseData && (
        <div className="deployment-checklist">
          <h4 className="checklist-title">Formal Deployment Procedure</h4>
          <div className="checklist-items">
            {checklist.map((item, index) => (
              <label key={index} className={`checklist-item ${item.checked ? 'checked' : ''} ${item.auto ? 'auto' : 'manual'}`}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={item.auto}
                  onChange={(e) => {
                    if (!item.auto && item.label === 'NOC team notified') {
                      setNocNotified(e.target.checked);
                    }
                  }}
                />
                <span className="checklist-label">{item.label}</span>
                {item.auto && <span className="auto-badge">Auto</span>}
              </label>
            ))}
          </div>
          <div className="checklist-footer">
            <span className="checklist-status">
              {checklist.filter((c) => c.checked).length} of {checklist.length} steps completed
            </span>
          </div>
        </div>
      )}

      <div className="form-grid compact">
        <label>
          Go / No-Go
          <select value={goNoGo} onChange={(event) => setGoNoGo(event.target.value)}>
            <option value="go">Go</option>
            <option value="no_go">No-Go</option>
            <option value="na_cekanju">Pending</option>
          </select>
        </label>
        <label>
          Deployment Date
          <input type="datetime-local" value={deployDate} onChange={(event) => setDeployDate(event.target.value)} />
        </label>
        <label>
          PIR Status
          <select value={pirStatus} onChange={(event) => setPirStatus(event.target.value)}>
            <option value="na_cekanju">Pending</option>
            <option value="u_toku">In Progress</option>
            <option value="zavrsen">Completed</option>
          </select>
        </label>
        <label>
          Rollback Executed
          <select value={rollbackExecuted} onChange={(event) => setRollbackExecuted(event.target.value)}>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>
        <div className="action-row">
          {canUpdateGo ? <button className="btn-secondary" type="button" onClick={updateGo}>Update Go / No-Go</button> : null}
          {canSchedule ? <button className="btn-secondary" type="button" onClick={updateDeploy}>Schedule Deployment</button> : null}
          {canUpdatePir ? <button className="btn-primary" type="button" onClick={updatePir}>Update PIR</button> : null}
          {canUpdateRollback ? <button className="btn-secondary" type="button" onClick={updateRollback}>Update Rollback</button> : null}
        </div>
      </div>
      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
