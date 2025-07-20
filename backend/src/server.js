/* -------------------- backend/src/server.js (Mejorado) -------------------- */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import pg from 'pg';

// --- Configuración Inicial ---
const app = express();
const server = http.createServer(app);

// URL del frontend para una configuración de CORS segura
const frontendURL = process.env.FRONTEND_URL || "http://localhost:8080";

const io = new Server(server, {
  cors: {
    origin: frontendURL,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// --- Conexión a la Base de Datos (PostgreSQL) ---
const { Pool } = pg;
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'user',
  host: process.env.DB_HOST || 'db',
  database: process.env.POSTGRES_DB || 'rifas_db',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: 5432,
});

// Middleware para reintentar la conexión a la BD
const connectWithRetry = async () => {
  try {
    await pool.connect();
    console.log('PostgreSQL conectado exitosamente.');
    await setupDatabase();
  } catch (err) {
    console.error('Fallo al conectar a PostgreSQL, reintentando en 5 segundos...', err);
    setTimeout(connectWithRetry, 5000);
  }
};

// --- Creación de Tablas (si no existen) ---
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS raffles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        ticket_price DECIMAL(10, 2) NOT NULL,
        total_tickets INTEGER NOT NULL,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        winner_ticket_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        raffle_id INTEGER NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
        participant_id INTEGER REFERENCES participants(id),
        ticket_number INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'available',
        reservation_date TIMESTAMP,
        payment_date TIMESTAMP,
        UNIQUE(raffle_id, ticket_number)
      );
    `);
    console.log('Tablas de la base de datos aseguradas.');
  } catch (err) {
    console.error('Error al configurar las tablas:', err);
  } finally {
    client.release();
  }
};

// --- Middlewares de Express ---
app.use(cors({ origin: frontendURL }));
app.use(express.json());

// --- Rutas del API (Endpoints) ---

// [GET] /api/health - Para verificar que el servidor está vivo
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Servidor de Rifas funcionando.' });
});

// [POST] /api/raffles - Crear una nueva rifa y sus boletos
app.post('/api/raffles', async (req, res) => {
  const { name, description, ticket_price, total_tickets, start_date, end_date } = req.body;
  if (!name || !ticket_price || !total_tickets) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const raffleResult = await client.query(
      'INSERT INTO raffles (name, description, ticket_price, total_tickets, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, ticket_price, total_tickets, start_date, end_date]
    );
    const newRaffle = raffleResult.rows[0];

    // Crear todos los boletos para la nueva rifa
    const ticketInserts = [];
    for (let i = 1; i <= total_tickets; i++) {
      ticketInserts.push(client.query(
        'INSERT INTO tickets (raffle_id, ticket_number, status) VALUES ($1, $2, $3)',
        [newRaffle.id, i, 'available']
      ));
    }
    await Promise.all(ticketInserts);

    await client.query('COMMIT');
    res.status(201).json(newRaffle);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear rifa:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// [GET] /api/raffles - Obtener todas las rifas
app.get('/api/raffles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM raffles ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener rifas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// [GET] /api/raffles/:id - Obtener detalles de una rifa específica con sus boletos
app.get('/api/raffles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const raffleRes = await pool.query('SELECT * FROM raffles WHERE id = $1', [id]);
    if (raffleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Rifa no encontrada' });
    }
    const ticketsRes = await pool.query(`
      SELECT t.*, p.first_name, p.last_name, p.email, p.phone
      FROM tickets t
      LEFT JOIN participants p ON t.participant_id = p.id
      WHERE t.raffle_id = $1
      ORDER BY t.ticket_number ASC
    `, [id]);
    
    const raffle = raffleRes.rows[0];
    raffle.tickets = ticketsRes.rows;
    
    res.json(raffle);
  } catch (err) {
    console.error(`Error al obtener rifa ${id}:`, err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// [POST] /api/tickets/reserve - Reservar un boleto
app.post('/api/tickets/reserve', async (req, res) => {
    const { raffle_id, ticket_number, first_name, last_name, email, phone } = req.body;

    if (!raffle_id || !ticket_number || !first_name || !last_name || !email) {
        return res.status(400).json({ error: 'Faltan datos para la reserva.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verificar si el boleto está disponible
        const ticketRes = await client.query(
            'SELECT * FROM tickets WHERE raffle_id = $1 AND ticket_number = $2 FOR UPDATE',
            [raffle_id, ticket_number]
        );

        if (ticketRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El boleto no existe.' });
        }
        if (ticketRes.rows[0].status !== 'available') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Este boleto ya no está disponible.' });
        }

        // 2. Buscar o crear al participante
        let participant;
        const participantRes = await client.query('SELECT * FROM participants WHERE email = $1', [email]);
        if (participantRes.rows.length > 0) {
            participant = participantRes.rows[0];
        } else {
            const newParticipantRes = await client.query(
                'INSERT INTO participants (first_name, last_name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *',
                [first_name, last_name, email, phone]
            );
            participant = newParticipantRes.rows[0];
        }

        // 3. Actualizar el boleto
        const updatedTicketRes = await client.query(
            'UPDATE tickets SET status = $1, participant_id = $2, reservation_date = NOW() WHERE id = $3 RETURNING *',
            ['reserved', participant.id, ticketRes.rows[0].id]
        );

        await client.query('COMMIT');

        const updatedTicket = updatedTicketRes.rows[0];
        
        // Emitir evento de WebSocket para actualizar en tiempo real
        io.to(`raffle_${raffle_id}`).emit('ticket_updated', {
            ...updatedTicket,
            first_name: participant.first_name,
            last_name: participant.last_name,
            email: participant.email,
            phone: participant.phone
        });

        res.status(200).json(updatedTicket);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al reservar boleto:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});


// [PUT] /api/tickets/:id/status - Cambiar estado de un boleto (para admin)
app.put('/api/tickets/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const valid_statuses = ['available', 'reserved', 'paid'];

    if (!status || !valid_statuses.includes(status)) {
        return res.status(400).json({ error: 'Estado no válido.' });
    }

    try {
        const query = status === 'available'
            ? 'UPDATE tickets SET status = $1, participant_id = NULL, reservation_date = NULL, payment_date = NULL WHERE id = $2 RETURNING *'
            : 'UPDATE tickets SET status = $1, payment_date = CASE WHEN $1 = \'paid\' THEN NOW() ELSE payment_date END WHERE id = $2 RETURNING *';
        
        const result = await pool.query(query, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Boleto no encontrado.' });
        }
        
        const updatedTicket = result.rows[0];
        
        // Obtener datos completos para emitir por socket
        const fullTicketData = await pool.query(`
            SELECT t.*, p.first_name, p.last_name, p.email, p.phone
            FROM tickets t
            LEFT JOIN participants p ON t.participant_id = p.id
            WHERE t.id = $1
        `, [updatedTicket.id]);

        // Emitir evento de WebSocket
        io.to(`raffle_${updatedTicket.raffle_id}`).emit('ticket_updated', fullTicketData.rows[0]);

        res.status(200).json(updatedTicket);
    } catch (err) {
        console.error('Error al actualizar estado del boleto:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// --- Lógica de WebSocket (Socket.IO) ---
io.on('connection', (socket) => {
  console.log('Un cliente se ha conectado:', socket.id);

  socket.on('join_raffle', (raffleId) => {
    socket.join(`raffle_${raffleId}`);
    console.log(`Cliente ${socket.id} se unió a la sala de la rifa ${raffleId}`);
  });

  socket.on('leave_raffle', (raffleId) => {
    socket.leave(`raffle_${raffleId}`);
    console.log(`Cliente ${socket.id} abandonó la sala de la rifa ${raffleId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Un cliente se ha desconectado:', socket.id);
  });
});

// --- Iniciar Servidor ---
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  connectWithRetry();
});