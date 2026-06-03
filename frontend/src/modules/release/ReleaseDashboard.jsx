import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { api, authStorage } from '../../api/client';
import RFCForm from './RFCForm';
import CABSession from './CABSession';
import PostDeployMonitor from './PostDeployMonitor';

const translations = {
  bs: {
    overviewTitle: 'Pregled release-a',
    search: 'Pretraga',
    searchPlaceholder: 'RFC, verzija, okruženje...',
    cab: 'CAB',
    goNoGo: 'Go/No-Go',
    status: 'Status',
    sort: 'Sortiranje',
    export: 'Izvoz',
    exportFile: 'Izvoz u Excel',
    showing: 'Prikazano',
    of: 'od',
    releases: 'release-ova',
    releaseIdDesc: 'Release ID opadajuće',
    releaseIdAsc: 'Release ID rastuće',
    latestDeployment: 'Najnoviji deployment',
    allDecisions: 'Sve odluke',
    allStates: 'Sva stanja',
    allStatuses: 'Svi statusi',
    zeroDowntime: 'Bez zastoja',
    rollback: 'Rollback',
    downtime: 'Zastoj',
    pending: 'Na čekanju',
    noMatch: 'Nema release zapisa koji odgovaraju odabranim filterima.',
    releaseFlow: 'Tok release-a',
    readyApproved: 'Spremno / odobreno',
    pendingWaiting: 'Na čekanju / u iščekivanju',
    blockedRollback: 'Blokirano / rollback',
    overview: 'Pregled',
    create: 'Novi zahtjev',
    cabApproval: 'CAB odobrenje',
    deploymentReview: 'Pregled deployment-a',
    loading: 'Učitavanje...',
    releaseOverview: 'Pregled release-a',
  },
  en: {
    overviewTitle: 'Release Overview',
    search: 'Search',
    searchPlaceholder: 'RFC, version, environment...',
    cab: 'CAB',
    goNoGo: 'Go/No-Go',
    status: 'Status',
    sort: 'Sort',
    export: 'Export',
    exportFile: 'Export to Excel',
    showing: 'Showing',
    of: 'of',
    releases: 'releases',
    releaseIdDesc: 'Release ID desc',
    releaseIdAsc: 'Release ID asc',
    latestDeployment: 'Latest deployment',
    allDecisions: 'All decisions',
    allStates: 'All states',
    allStatuses: 'All statuses',
    zeroDowntime: 'Zero Downtime',
    rollback: 'Rollback',
    downtime: 'Downtime',
    pending: 'Pending',
    noMatch: 'No release records match the selected filters.',
    releaseFlow: 'Release Flow',
    readyApproved: 'Ready / approved',
    pendingWaiting: 'Pending / waiting',
    blockedRollback: 'Blocked / rollback',
    overview: 'Overview',
    create: 'New Request',
    cabApproval: 'CAB Approval',
    deploymentReview: 'Deployment Review',
    loading: 'Loading...',
    releaseOverview: 'Release Overview',
  },
};

const getCabBadgeClass = (value) => {
  if (value === 'odobreno') return 'status-success';
  if (value === 'odbijeno') return 'status-danger';
  if (value === 'odgodeno') return 'status-warning';
  return 'status-open';
};

const cabLabelMap = {
  bs: { odobreno: 'Odobreno', odbijeno: 'Odbijeno', odgodeno: 'Odgođeno', na_cekanju: 'Na čekanju' },
  en: { odobreno: 'Approved', odbijeno: 'Rejected', odgodeno: 'Deferred', na_cekanju: 'Pending' },
};

const goNoGoLabelMap = {
  bs: { go: 'Kreni', no_go: 'Ne kreni', na_cekanju: 'Na čekanju' },
  en: { go: 'Go', no_go: 'No-Go', na_cekanju: 'Pending' },
};

const pirLabelMap = {
  bs: { zavrsen: 'Završeno', u_toku: 'U toku', na_cekanju: 'Na čekanju' },
  en: { zavrsen: 'Completed', u_toku: 'In Progress', na_cekanju: 'Pending' },
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

const getRollbackExecutedValue = (item) => item.rollback_izvrsen ?? item.rollback_izvršen ?? null;

const formatVersion = (value) => {
  const cleaned = String(value || '').trim().replace(/^v\s*/i, '');
  return cleaned ? `v${cleaned}` : '-';
};

const calculateDowntimeMinutes = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end - start) / (1000 * 60));
};

const formatDuration = (minutes) => {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

const buildReleaseStatus = (item) => {
  const downtimeMinutes = calculateDowntimeMinutes(item.datum_deploymenta, item.monitoring_kraj);
  const rollbackValue = getRollbackExecutedValue(item);
  const hasRollback = rollbackValue === true || rollbackValue === 'true';
  const hasDowntime = typeof downtimeMinutes === 'number' && downtimeMinutes > 0;
  const isZeroDowntime = item.go_no_go === 'go' && !hasRollback;

  const statusKey = isZeroDowntime
    ? 'zero_downtime'
    : hasRollback
      ? 'rollback'
      : hasDowntime
        ? 'downtime'
        : 'pending';

  const statusLabel = isZeroDowntime
    ? 'Zero Downtime'
    : hasRollback
      ? `Rollback${downtimeMinutes ? ` (${formatDuration(downtimeMinutes)})` : ''}`
      : hasDowntime
        ? formatDuration(downtimeMinutes)
        : '-';

  return {
    downtimeMinutes,
    hasRollback,
    hasDowntime,
    isZeroDowntime,
    statusKey,
    statusLabel,
  };
};

export default function ReleaseDashboard({ language = 'en' }) {
  const t = translations[language] || translations.en;
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [cabFilter, setCabFilter] = useState('all');
  const [goFilter, setGoFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('release_desc');
  const [exporting, setExporting] = useState(false);

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

  const enrichedPipeline = useMemo(() => pipeline.map((item) => ({
    ...item,
    ...buildReleaseStatus(item),
  })), [pipeline]);

  const filteredPipeline = [...enrichedPipeline]
    .filter((item) => (statusFilter === 'all' ? true : item.statusKey === statusFilter))
    .filter((item) => (cabFilter === 'all' ? true : (item.cab_odluka || 'na_cekanju') === cabFilter))
    .filter((item) => (goFilter === 'all' ? true : (item.go_no_go || 'na_cekanju') === goFilter))
    .filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return [
        item.id,
        item.rfc_id,
        item.change_id,
        item.rfc_naziv,
        item.verzija,
        item.okruzenje,
        item.go_no_go,
        item.cab_odluka,
        item.statusLabel,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (sortBy === 'release_asc') return Number(a.id) - Number(b.id);
      if (sortBy === 'deploy_desc') {
        const bTime = b.datum_deploymenta ? new Date(b.datum_deploymenta).getTime() : -1;
        const aTime = a.datum_deploymenta ? new Date(a.datum_deploymenta).getTime() : -1;
        return bTime - aTime;
      }
      return Number(b.id) - Number(a.id);
    });

  const exportToExcel = () => {
    if (!filteredPipeline.length) return;

    setExporting(true);

    try {
      const exportRows = filteredPipeline.map((item) => ({
        'Release ID': item.id,
        'RFC ID': item.rfc_id || item.change_id,
        RFC: item.rfc_naziv,
        Version: formatVersion(item.verzija),
        CAB: (cabLabelMap[language] || cabLabelMap.en)[item.cab_odluka || 'na_cekanju'] || t.pending,
        'Go/No-Go': (goNoGoLabelMap[language] || goNoGoLabelMap.en)[item.go_no_go || 'na_cekanju'] || t.pending,
        Status: item.statusLabel,
        Deploy: item.datum_deploymenta ? new Date(item.datum_deploymenta).toLocaleString() : '-',
        'Monitoring End': item.monitoring_kraj ? new Date(item.monitoring_kraj).toLocaleString() : '-',
        Duration: item.downtimeMinutes ? formatDuration(item.downtimeMinutes) : '-',
        PIR: (pirLabelMap[language] || pirLabelMap.en)[item.pir_status || 'na_cekanju'] || t.pending,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Releases');
      XLSX.writeFile(workbook, `release-overview-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const releaseMetrics = useMemo(() => {
    const total = pipeline.length;
    const cabApproved = pipeline.filter((item) => item.cab_odluka === 'odobreno').length;
    const readyToDeploy = pipeline.filter((item) => item.go_no_go === 'go').length;
    const rollbackDone = pipeline.filter((item) => {
      const rollbackValue = getRollbackExecutedValue(item);
      return rollbackValue === true || rollbackValue === 'true';
    }).length;

    return [
      { label: language === 'bs' ? 'Ukupno' : 'Total', value: total, tone: 'accent' },
      { label: language === 'bs' ? 'CAB odobreno' : 'CAB Approved', value: cabApproved, tone: 'success' },
      { label: language === 'bs' ? 'Spremno za deployment' : 'Go', value: readyToDeploy, tone: 'high' },
      { label: language === 'bs' ? 'Rollback' : 'Rollback', value: rollbackDone, tone: 'critical' },
    ];
  }, [pipeline]);

  const releaseSteps = [
    language === 'bs' ? 'RFC pripremljen sa planom rollback-a i testiranja' : 'RFC drafted with rollback and testing plan',
    language === 'bs' ? 'CAB pregled i odobrenje' : 'CAB review and approval',
    language === 'bs' ? 'Go/No-Go odluka prije deployment-a' : 'Go/No-Go decision before deployment',
    language === 'bs' ? 'Deploy i nadzor prozora' : 'Deploy + monitor the window',
    language === 'bs' ? 'PIR zatvara release nakon verifikacije' : 'PIR closes the release after verification',
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
          <span className="legend-item"><span className="legend-swatch status-success" />{t.readyApproved}</span>
          <span className="legend-item"><span className="legend-swatch status-warning" />{t.pendingWaiting}</span>
          <span className="legend-item"><span className="legend-swatch status-danger" />{t.blockedRollback}</span>
        </div>
      </section>

      <section className="panel view-switch">
        {canViewOverview ? (
          <button className={activeView === 'pipeline' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('pipeline')}>{t.overview}</button>
        ) : null}
        {canViewNewRequest ? (
          <button className={activeView === 'create' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('create')}>{t.create}</button>
        ) : null}
        {canViewCab ? (
          <button className={activeView === 'cab' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('cab')}>{t.cabApproval}</button>
        ) : null}
        {canViewDeploy ? (
          <button className={activeView === 'deploy' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('deploy')}>{t.deploymentReview}</button>
        ) : null}
      </section>

      {activeView === 'create' ? <RFCForm language={language} onCreated={loadPipeline} /> : null}
      {activeView === 'cab' ? <CABSession language={language} onUpdated={loadPipeline} /> : null}
      {activeView === 'deploy' ? <PostDeployMonitor language={language} onUpdated={loadPipeline} /> : null}

      {activeView === 'pipeline' ? (
        <section className="panel table-panel">
          <h3 className="section-title">{t.releaseOverview}</h3>
          {loading ? <p>{t.loading}</p> : null}
          {error ? <p className="error-line">{error}</p> : null}
          <div className="table-toolbar compact">
            <div className="toolbar-group">
              <span className="toolbar-label">{t.search}</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t.searchPlaceholder}
              />
            </div>
            <div className="toolbar-group">
              <span className="toolbar-label">{t.cab}</span>
              <select value={cabFilter} onChange={(event) => setCabFilter(event.target.value)}>
                <option value="all">{t.allDecisions}</option>
                <option value="odobreno">{(cabLabelMap[language] || cabLabelMap.en).odobreno}</option>
                <option value="odbijeno">{(cabLabelMap[language] || cabLabelMap.en).odbijeno}</option>
                <option value="odgodeno">{(cabLabelMap[language] || cabLabelMap.en).odgodeno}</option>
                <option value="na_cekanju">{(cabLabelMap[language] || cabLabelMap.en).na_cekanju}</option>
              </select>
            </div>
            <div className="toolbar-group">
              <span className="toolbar-label">{t.goNoGo}</span>
              <select value={goFilter} onChange={(event) => setGoFilter(event.target.value)}>
                <option value="all">{t.allStates}</option>
                <option value="go">{(goNoGoLabelMap[language] || goNoGoLabelMap.en).go}</option>
                <option value="no_go">{(goNoGoLabelMap[language] || goNoGoLabelMap.en).no_go}</option>
                <option value="na_cekanju">{(goNoGoLabelMap[language] || goNoGoLabelMap.en).na_cekanju}</option>
              </select>
            </div>
            <div className="toolbar-group">
              <span className="toolbar-label">{t.status}</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">{t.allStatuses}</option>
                <option value="zero_downtime">{t.zeroDowntime}</option>
                <option value="rollback">{t.rollback}</option>
                <option value="downtime">{t.downtime}</option>
                <option value="pending">{t.pending}</option>
              </select>
            </div>
            <div className="toolbar-group">
              <span className="toolbar-label">{t.sort}</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="release_desc">{t.releaseIdDesc}</option>
                <option value="release_asc">{t.releaseIdAsc}</option>
                <option value="deploy_desc">{t.latestDeployment}</option>
              </select>
            </div>
            <div className="toolbar-group">
              <span className="toolbar-label">{t.export}</span>
              <button type="button" className="btn-secondary" onClick={exportToExcel} disabled={!filteredPipeline.length || exporting}>
                {exporting ? (language === 'bs' ? 'Izvoz...' : 'Exporting...') : t.exportFile}
              </button>
            </div>
          </div>
          <p className="helper-line">{t.showing} {filteredPipeline.length} {t.of} {pipeline.length} {t.releases}.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Release ID</th>
                  <th>RFC ID</th>
                  <th>RFC</th>
                  <th>Version</th>
                  <th>{t.cab}</th>
                  <th>{t.goNoGo}</th>
                  <th>{t.status}</th>
                  <th>{language === 'bs' ? 'Deployment' : 'Deploy'}</th>
                  <th>PIR</th>
                </tr>
              </thead>
              <tbody>
                {filteredPipeline.map((item) => {
                  return (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.rfc_id || item.change_id}</td>
                      <td>{item.rfc_naziv}</td>
                      <td><strong>{formatVersion(item.verzija)}</strong></td>
                      <td><span className={`badge ${getCabBadgeClass(item.cab_odluka)}`}>{(cabLabelMap[language] || cabLabelMap.en)[item.cab_odluka || 'na_cekanju'] || t.pending}</span></td>
                      <td><span className={`badge ${getGoNoGoBadgeClass(item.go_no_go)}`}>{(goNoGoLabelMap[language] || goNoGoLabelMap.en)[item.go_no_go || 'na_cekanju'] || t.pending}</span></td>
                      <td>
                        {item.isZeroDowntime ? (
                          <span className="badge status-success">{t.zeroDowntime}</span>
                        ) : item.hasRollback ? (
                          <span className="badge status-warning">{t.rollback} {item.downtimeMinutes ? `(${formatDuration(item.downtimeMinutes)})` : ''}</span>
                        ) : item.hasDowntime ? (
                          <span className="badge status-danger">{formatDuration(item.downtimeMinutes)}</span>
                        ) : (
                          <span className="badge status-closed">-</span>
                        )}
                      </td>
                      <td>{item.datum_deploymenta ? new Date(item.datum_deploymenta).toLocaleString() : '-'}</td>
                      <td><span className={`badge ${getPirBadgeClass(item.pir_status)}`}>{(pirLabelMap[language] || pirLabelMap.en)[item.pir_status || 'na_cekanju'] || t.pending}</span></td>
                    </tr>
                  );
                })}
                {!filteredPipeline.length ? (
                  <tr>
                    <td colSpan={9}>{t.noMatch}</td>
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
