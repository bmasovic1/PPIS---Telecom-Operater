import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function KEDBView() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const data = await api.getKedb();
      setItems(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="panel table-panel">
      <h3>Known Error Database</h3>
      {error ? <p className="error-line">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Problem</th>
              <th>Status</th>
              <th>Workaround</th>
              <th>Permanent Fix</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.problem_id}</td>
                <td>{item.status}</td>
                <td>{item.workaround || '-'}</td>
                <td>{item.trajni_fix || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
