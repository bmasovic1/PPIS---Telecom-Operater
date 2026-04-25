import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import RFCForm from './RFCForm';
import CABSession from './CABSession';
import PostDeployMonitor from './PostDeployMonitor';

export default function ReleaseDashboard() {
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('pipeline');

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

  return (
    <div className="stack single-column">
      <section className="panel view-switch">
        <button className={activeView === 'pipeline' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('pipeline')}>Release Pipeline</button>
        <button className={activeView === 'create' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('create')}>Create Request</button>
        <button className={activeView === 'cab' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('cab')}>CAB Review</button>
        <button className={activeView === 'deploy' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('deploy')}>Deployment Controls</button>
      </section>

      {activeView === 'create' ? <RFCForm onCreated={loadPipeline} /> : null}
      {activeView === 'cab' ? <CABSession onUpdated={loadPipeline} /> : null}
      {activeView === 'deploy' ? <PostDeployMonitor onUpdated={loadPipeline} /> : null}

      {activeView === 'pipeline' ? (
        <section className="panel table-panel">
          <h3>Release Pipeline</h3>
          {loading ? <p>Loading pipeline...</p> : null}
          {error ? <p className="error-line">{error}</p> : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Release ID</th>
                  <th>RFC</th>
                  <th>Version</th>
                  <th>CAB</th>
                  <th>Go/No-Go</th>
                  <th>Deploy</th>
                  <th>PIR</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.rfc_naziv}</td>
                    <td>{item.verzija}</td>
                    <td>{item.cab_odluka}</td>
                    <td>{item.go_no_go}</td>
                    <td>{item.datum_deploymenta ? new Date(item.datum_deploymenta).toLocaleString() : '-'}</td>
                    <td>{item.pir_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
