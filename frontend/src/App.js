import React from 'react';

// --- Estilos en línea para la prueba ---
const styles = {
  app: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: 'sans-serif',
  },
  card: {
    padding: '40px',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  title: {
    fontSize: '2rem',
    color: '#333',
    margin: 0,
  },
  subtitle: {
    fontSize: '1rem',
    color: '#666',
    marginTop: '10px',
  },
};

function App() {
  return (
    <div style={styles.app}>
      <div style={styles.card}>
        <h1 style={styles.title}>¡Despliegue Exitoso!</h1>
        <p style={styles.subtitle}>La aplicación base de React está funcionando.</p>
      </div>
    </div>
  );
}

export default App;
