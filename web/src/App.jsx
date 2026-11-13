import { useEffect, useState } from 'react';

function App() {
  const [apiStatus, setApiStatus] = useState('…');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status ?? 'inconnu'))
      .catch(() => setApiStatus('injoignable'));
  }, []);

  return (
    <main>
      <h1>Naturo RDV — application en construction</h1>
      <p>API&nbsp;: {apiStatus}</p>
    </main>
  );
}

export default App;
