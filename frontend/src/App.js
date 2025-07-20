import React, { useState, useEffect } from 'react';

// --- Estilos en línea ---
const styles = {
  app: { backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: 'sans-serif' },
  header: { backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1rem 1.5rem' },
  headerTitle: { fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 },
  container: { maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' },
  centered: { textAlign: 'center', padding: '2.5rem' },
  raffleItem: { backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '1rem' },
  error: { color: 'red', fontWeight: 'bold' }
};

// --- Configuración ---
// Usamos una ruta relativa. Coolify/Nginx redirigirá esto al backend.
const API_URL = '/api';

function App() {
  const [raffles, setRaffles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Intentamos cargar las rifas desde el backend
    fetch(`${API_URL}/raffles`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Error del servidor: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setRaffles(data);
      })
      .catch(err => {
        console.error("Error fetching raffles:", err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{...styles.container, padding: '1rem'}}>
           <h1 style={styles.headerTitle}>App de Rifas</h1>
        </div>
      </header>
      <main>
        <div style={styles.container}>
          <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '2rem' }}>Rifas Disponibles</h2>
          
          {loading && <p style={styles.centered}>Cargando rifas...</p>}
          
          {error && <p style={{...styles.centered, ...styles.error}}>No se pudieron cargar las rifas. Error: {error}</p>}

          {!loading && !error && (
            <div>
              {raffles.length > 0 ? (
                raffles.map(raffle => (
                  <div key={raffle.id} style={styles.raffleItem}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{raffle.name}</h3>
                    <p>Precio: ${parseFloat(raffle.ticket_price).toFixed(2)}</p>
                  </div>
                ))
              ) : (
                <p style={styles.centered}>No hay rifas activas en este momento.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
