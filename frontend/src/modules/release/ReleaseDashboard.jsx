import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '../../api/client';
import RFCForm from './RFCForm';
import CABSession from './CABSession';
import PostDeployMonitor from './PostDeployMonitor';

const getCabBadgeClass = (value) => {
  if (value === 'odobreno') return 'status-success';
  if (value === 'odbijeno') return 'status-danger';
  if (value === 'odgodeno') return 'status-warning';
  return 'status-open';
};

const cabLabelMap = {
  odobreno: 'Approved',
  odbijeno: 'Rejected',
  odgodeno: 'Deferred',
  na_cekanju: 'Pending',
};

const goNoGoLabelMap = {
  go: 'Go',
  no_go: 'No-Go',
  na_cekanju: 'Pending',
};

const pirLabelMap = {
  zavrsen: 'Completed',
  u_toku: 'In Progress',
  na_cekanju: 'Pending',
};

const getGoNoGoBadgeClass = (value) => {
  if (value === 'go') return 'status-success';
  if (value === 'no_go') return 'status-danger';
  return 'status-warning';
};

const getPirBadgeClass = (value) => {
  if (value === 'zavrsen') return 'status-success';
  if (value === 'u_toku') return 'status-warning';
  return 'status-open';
};

export default function ReleaseDashboard() {
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('pipeline');
  const [cabFilter, setCabFilter] = useState('all');
  const [goFilter, setGoFilter] = useState('all');
  const [sortBy, setSortBy] = useState('release_desc');

  const loadPipeline = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getReleasePipeline();
      setPipeline(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

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

  const canViewOverview = ['admin', 'release_manager', 'change_manager', 'devops', 'cab_clan', 'qa_inzenjer'].includes(role);
  const canViewNewRequest = ['change_manager', 'devops', 'admin'].includes(role);
  const canViewCab = ['cab_clan', 'admin'].includes(role);
  const canViewDeploy = ['release_manager', 'devops', 'qa_inzenjer', 'admin'].includes(role);

  useEffect(() => {
    // Prevent direct access to views the role shouldn't see
    if (activeView === 'create' && !canViewNewRequest) setActiveView('pipeline');
    if (activeView === 'cab' && !canViewCab) setActiveView('pipeline');
    if (activeView === 'deploy' && !canViewDeploy) setActiveView('pipeline');
  }, [activeView, canViewNewRequest, canViewCab, canViewDeploy]);

  const filteredPipeline = [...pipeline]
    .filter((item) => (cabFilter === 'all' ? true : (item.cab_odluka || 'na_cekanju') === cabFilter))
    .filter((item) => (goFilter === 'all' ? true : (item.go_no_go || 'na_cekanju') === goFilter))
    .sort((a, b) => {
      if (sortBy === 'release_asc') return Number(a.id) - Number(b.id);
      if (sortBy === 'deploy_desc') {
        const bTime = b.datum_deploymenta ? new Date(b.datum_deploymenta).getTime() : -1;
        const aTime = a.datum_deploymenta ? new Date(a.datum_deploymenta).getTime() : -1;
        return bTime - aTime;
      }
      return Number(b.id) - Number(a.id);
    });

  const releaseMetrics = useMemo(() => {
    const total = pipeline.length;
    const cabApproved = pipeline.filter((item) => item.cab_odluka === 'odobreno').length;
    const readyToDeploy = pipeline.filter((item) => item.go_no_go === 'go').length;
    const rollbackDone = pipeline.filter((item) => item.rollback_izvrsen === true || item.rollback_izvrsen === 'true').length;

    return [
      { label: 'Total', value: total, tone: 'accent' },
      { label: 'CAB Approved', value: cabApproved, tone: 'success' },
      { label: 'Go', value: readyToDeploy, tone: 'high' },
      { label: 'Rollback', value: rollbackDone, tone: 'critical' },
    ];
  }, [pipeline]);

  const releaseSteps = [
    'RFC drafted with rollback and testing plan',
    'CAB review and approval',
    'Go/No-Go decision before deployment',
    'Deploy + monitor the window',
    'PIR closes the release after verification',
  ];

  return (
    <div className="stack single-column">
      <section className="release-metrics">
        {releaseMetrics.map((metric) => (
          <article key={metric.label} className={`metric-card metric-${metric.tone}`}>
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="panel process-panel">
        <h3 className="section-title">Release Flow</h3>
        <div className="process-steps">
          {releaseSteps.map((step, index) => (
            <div className="process-step" key={step}>
              <span className="process-step-index">0{index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="status-legend">
          <span className="legend-item"><span className="legend-swatch status-success" />Ready / approved</span>
          <span className="legend-item"><span className="legend-swatch status-warning" />Pending / waiting</span>
          <span className="legend-item"><span className="legend-swatch status-danger" />Blocked / rollback</span>
        </div>
      </section>

      <section className="panel view-switch">
        {canViewOverview ? (
          <button className={activeView === 'pipeline' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('pipeline')}>Overview</button>
        ) : null}
        {canViewNewRequest ? (
          <button className={activeView === 'create' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('create')}>New Request</button>
        ) : null}
        {canViewCab ? (
          <button className={activeView === 'cab' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('cab')}>CAB Approval</button>
        ) : null}
        {canViewDeploy ? (
          <button className={activeView === 'deploy' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('deploy')}>Deployment Review</button>
        ) : null}
      </section>

      {activeView === 'create' ? <RFCForm onCreated={loadPipeline} /> : null}
      {activeView === 'cab' ? <CABSession onUpdated={loadPipeline} /> : null}
      {activeView === 'deploy' ? <PostDeployMonitor onUpdated={loadPipeline} /> : null}

      {activeView === 'pipeline' ? (
        <section className="panel table-panel">
          <h3 className="section-title">Release Overview</h3>
          {loading ? <p>Loading pipeline...</p> : null}
          {error ? <p className="error-line">{error}</p> : null}
          <div className="table-toolbar compact">
            <div className="toolbar-group">
              <span className="toolbar-label">CAB</span>
              <select value={cabFilter} onChange={(event) => setCabFilter(event.target.value)}>
                <option value="all">All decisions</option>
                <option value="odobreno">Approved</option>
                <option value="odbijeno">Rejected</option>
                <option value="odgodeno">Deferred</option>
                <option value="na_cekanju">Pending</option>
              </select>
            </div>
            <div className="toolbar-group">
              <span className="toolbar-label">Go/No-Go</span>
              <select value={goFilter} onChange={(event) => setGoFilter(event.target.value)}>
                <option value="all">All states</option>
                <option value="go">Go</option>
                <option value="no_go">No-Go</option>
                <option value="na_cekanju">Pending</option>
              </select>
            </div>
            <div className="toolbar-group">
              <span className="toolbar-label">Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="release_desc">Release ID desc</option>
                <option value="release_asc">Release ID asc</option>
                <option value="deploy_desc">Latest deployment</option>
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Release ID</th>
                  <th>RFC ID</th>
                  <th>RFC</th>
                  <th>Version</th>
                  <th>CAB</th>
                  <th>Go/No-Go</th>
                  <th>Status</th>
                  <th>Deploy</th>
                  <th>PIR</th>
                </tr>
              </thead>
              <tbody>
                {filteredPipeline.map((item) => {
                  const isZeroDowntime = item.go_no_go === 'go' && (item.rollback_izvrsen === false || item.rollback_izvrsen === 'false' || !item.rollback_izvrsen);
                  const hasRollback = item.rollback_izvrsen === true || item.rollback_izvrsen === 'true';
                  
                  return (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.rfc_id || item.change_id}</td>
                      <td>{item.rfc_naziv}</td>
                      <td><strong>v{item.verzija}</strong></td>
                      <td><span className={`badge ${getCabBadgeClass(item.cab_odluka)}`}>{cabLabelMap[item.cab_odluka || 'na_cekanju'] || 'Pending'}</span></td>
                      <td><span className={`badge ${getGoNoGoBadgeClass(item.go_no_go)}`}>{goNoGoLabelMap[item.go_no_go || 'na_cekanju'] || 'Pending'}</span></td>
                      <td>
                        {isZeroDowntime ? (
                          <span className="badge status-success">✓ Zero Downtime</span>
                        ) : hasRollback ? (
                          <span className="badge status-warning">⚠ Rollback Executed</span>
                        ) : (
                          <span className="status-muted">-</span>
                        )}
                      </td>
                      <td>{item.datum_deploymenta ? new Date(item.datum_deploymenta).toLocaleString() : '-'}</td>
                      <td><span className={`badge ${getPirBadgeClass(item.pir_status)}`}>{pirLabelMap[item.pir_status || 'na_cekanju'] || 'Pending'}</span></td>
                    </tr>
                  );
                })}
                {!filteredPipeline.length ? (
                  <tr>
                    <td colSpan={9}>No release records match the selected filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
