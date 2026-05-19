import { useState, useEffect } from 'react';
import { api, authStorage } from '../../api/client';

const translations = {
  bs: {
    title: 'Pregled deployment-a',
    workflow: 'Tok rada:',
    workflowText: 'Prvo završite CAB odobrenje (postavite RFC odluku na "Odobreno"), zatim Go/No-Go ispod.',
    release: 'Release',
    releaseLoading: 'Učitavanje release-ova...',
    releaseSelect: 'Odaberi release',
    formalProcedure: 'Formalna procedura deployment-a',
    uat: 'UAT testiranje završeno',
    cab: 'CAB odobrenje dobijeno',
    rollbackPlan: 'Plan rollback-a spreman',
    window: 'Deployment prozor zakazan',
    noc: 'NOC tim obaviješten',
    monitoring: 'Post-deployment monitoring 72h',
    auto: 'Automatski',
    steps: 'koraka završeno',
    goNoGo: 'Go / No-Go',
    deploymentDate: 'Datum deployment-a',
    monitoringEnd: 'Kraj monitoringa (72h prozor)',
    pirStatus: 'PIR status',
    rollbackExecuted: 'Rollback izvršen',
    no: 'Ne',
    yes: 'Da',
    pending: 'Na čekanju',
    inProgress: 'U toku',
    completed: 'Završeno',
    updateGo: 'Ažuriraj Go / No-Go',
    schedule: 'Zakaži deployment',
    updatePir: 'Ažuriraj PIR',
    updateRollback: 'Ažuriraj rollback',
    goUpdated: 'Go/No-Go ažuriran.',
    deployUpdated: 'Datum deployment-a i kraj monitoringa ažurirani.',
    pirUpdated: 'PIR status ažuriran.',
    rollbackUpdated: 'Rollback status ažuriran.',
  },
  en: {
    title: 'Deployment Review',
    workflow: 'Workflow:',
    workflowText: 'First complete CAB Approval (set RFC decision to "Approved"), then Go/No-Go below.',
    release: 'Release',
    releaseLoading: 'Loading releases...',
    releaseSelect: 'Select release',
    formalProcedure: 'Formal Deployment Procedure',
    uat: 'UAT testing completed',
    cab: 'CAB approval obtained',
    rollbackPlan: 'Rollback plan ready',
    window: 'Deployment window scheduled',
    noc: 'NOC team notified',
    monitoring: 'Post-deployment monitoring 72h',
    auto: 'Auto',
    steps: 'steps completed',
    goNoGo: 'Go / No-Go',
    deploymentDate: 'Deployment Date',
    monitoringEnd: 'Monitoring End (72h window)',
    pirStatus: 'PIR Status',
    rollbackExecuted: 'Rollback Executed',
    no: 'No',
    yes: 'Yes',
    pending: 'Pending',
    inProgress: 'In Progress',
    completed: 'Completed',
    updateGo: 'Update Go / No-Go',
    schedule: 'Schedule Deployment',
    updatePir: 'Update PIR',
    updateRollback: 'Update Rollback',
    goUpdated: 'Go/No-Go updated.',
    deployUpdated: 'Deployment date and monitoring end updated.',
    pirUpdated: 'PIR status updated.',
    rollbackUpdated: 'Rollback status updated.',
  },
};

export default function PostDeployMonitor({ onUpdated, language = 'en' }) {
  const t = translations[language] || translations.en;
  const [releaseId, setReleaseId] = useState('');
  const [goNoGo, setGoNoGo] = useState('go');
  const [deployDate, setDeployDate] = useState('');
  const [monitoringKraj, setMonitoringKraj] = useState('');
  const [pirStatus, setPirStatus] = useState('na_cekanju');
  const [rollbackExecuted, setRollbackExecuted] = useState('false');
  const [message, setMessage] = useState('');
  const [releaseData, setReleaseData] = useState(null);
  const [nocNotified, setNocNotified] = useState(false);
  const [releases, setReleases] = useState([]);
  const [releasesLoading, setReleasesLoading] = useState(true);

  // Load releases on mount
  useEffect(() => {
    let alive = true;
    const loadReleases = async () => {
      try {
        const data = await api.getReleasePipeline();
        if (alive) setReleases(data || []);
      } catch (err) {
        if (alive) setMessage(err.message);
      } finally {
        if (alive) setReleasesLoading(false);
      }
    };

    loadReleases();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!releaseId) {
      setReleaseData(null);
      return;
    }

    const release = releases.find((r) => String(r.id) === String(releaseId));
    if (release) {
      setReleaseData(release);
      if (release.go_no_go) setGoNoGo(release.go_no_go);
      if (release.datum_deploymenta) setDeployDate(release.datum_deploymenta);
      if (release.monitoring_kraj) setMonitoringKraj(release.monitoring_kraj);
      if (release.pir_status) setPirStatus(release.pir_status);
      if (release.rollback_izvrsen) setRollbackExecuted(release.rollback_izvrsen === true || release.rollback_izvrsen === 'true' ? 'true' : 'false');
    } else {
      setReleaseData(null);
    }
  }, [releaseId, releases]);

  const calculateChecklist = () => {
    const uatDone = !!(releaseData && (releaseData.uat_done || releaseData.uat_passed || releaseData.uat_ok));
    const cabApproved = !!(releaseData && (releaseData.cab_odluka === 'odobreno' || releaseData.cab_odluka === 'Approved'));
    const rollbackPlanReady = !!(releaseData && releaseData.plan_rollbacka && releaseData.plan_rollbacka.trim().length > 0);
    const windowScheduled = !!(releaseData && releaseData.datum_deploymenta);
    const monitoringActive = !!(releaseData && (releaseData.monitoring_kraj !== null && releaseData.monitoring_kraj !== undefined));

    return [
      { label: t.uat, checked: uatDone, auto: true },
      { label: t.cab, checked: cabApproved, auto: true },
      { label: t.rollbackPlan, checked: rollbackPlanReady, auto: true },
      { label: t.window, checked: windowScheduled, auto: true },
      { label: t.noc, checked: nocNotified, auto: false },
      { label: t.monitoring, checked: monitoringActive, auto: true },
    ];
  };

  const checklist = calculateChecklist();

  const updateGo = async () => {
    try {
      await api.updateGoNoGo(releaseId, { go_no_go: goNoGo });
      setMessage(t.goUpdated);
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateDeploy = async () => {
    try {
      await api.updateDeploy(releaseId, { 
        datum_deploymenta: deployDate,
        monitoring_kraj: monitoringKraj || null
      });
      setMessage(t.deployUpdated);
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updatePir = async () => {
    try {
      await api.updatePir(releaseId, { pir_status: pirStatus });
      setMessage(t.pirUpdated);
      onUpdated();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateRollback = async () => {
    try {
      await api.updateRollback(releaseId, { rollback_izvrsen: rollbackExecuted === 'true' });
      setMessage(t.rollbackUpdated);
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
      <h3 className="section-title">{t.title}</h3>
      <p className="helper-line"><strong>{t.workflow}</strong> {t.workflowText}</p>
      <div className="form-grid compact">
        <label>
          Release
          <select value={releaseId} onChange={(event) => setReleaseId(event.target.value)} disabled={releasesLoading}>
            <option value="">{releasesLoading ? t.releaseLoading : t.releaseSelect}</option>
            {releases.map((r) => (
              <option key={r.id} value={r.id}>{`#${r.id} · v${r.verzija || r.verzija === 0 ? r.verzija : ''} · ${r.rfc_naziv || r.naziv || '-'}`}</option>
            ))}
          </select>
        </label>
      </div>

      {releaseData && (
        <div className="deployment-checklist">
          <h4 className="checklist-title">{t.formalProcedure}</h4>
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
                {item.auto && <span className="auto-badge">{t.auto}</span>}
              </label>
            ))}
          </div>
          <div className="checklist-footer">
            <span className="checklist-status">
              {checklist.filter((c) => c.checked).length} {t.steps} / {checklist.length}
            </span>
          </div>
        </div>
      )}

      <div className="form-grid compact">
        <label>
          {t.goNoGo}
          <select value={goNoGo} onChange={(event) => setGoNoGo(event.target.value)}>
            <option value="go">Go</option>
            <option value="no_go">No-Go</option>
            <option value="na_cekanju">{t.pending}</option>
          </select>
        </label>
        <label>
          {t.deploymentDate}
          <input type="datetime-local" value={deployDate} onChange={(event) => setDeployDate(event.target.value)} />
        </label>
        <label>
          {t.monitoringEnd}
          <input type="datetime-local" value={monitoringKraj} onChange={(event) => setMonitoringKraj(event.target.value)} />
        </label>
        <label>
          {t.pirStatus}
          <select value={pirStatus} onChange={(event) => setPirStatus(event.target.value)}>
            <option value="na_cekanju">{t.pending}</option>
            <option value="u_toku">{t.inProgress}</option>
            <option value="zavrsen">{t.completed}</option>
          </select>
        </label>
        <label>
          {t.rollbackExecuted}
          <select value={rollbackExecuted} onChange={(event) => setRollbackExecuted(event.target.value)}>
            <option value="false">{t.no}</option>
            <option value="true">{t.yes}</option>
          </select>
        </label>
        <div className="action-row">
          {canUpdateGo ? <button className="btn-secondary" type="button" onClick={updateGo}>{t.updateGo}</button> : null}
          {canSchedule ? <button className="btn-secondary" type="button" onClick={updateDeploy}>{t.schedule}</button> : null}
          {canUpdatePir ? <button className="btn-primary" type="button" onClick={updatePir}>{t.updatePir}</button> : null}
          {canUpdateRollback ? <button className="btn-secondary" type="button" onClick={updateRollback}>{t.updateRollback}</button> : null}
        </div>
      </div>
      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
