/* -------------------- frontend/src/App.js (Mejorado) -------------------- */

import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Configuración con variables de entorno para flexibilidad
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

// Componente de Icono para los estados
const StatusIcon = ({ status }) => {
    const baseClasses = "w-3 h-3 rounded-full mr-2";
    if (status === 'paid') return <div className={`${baseClasses} bg-green-500`} title="Pagado"></div>;
    if (status === 'reserved') return <div className={`${baseClasses} bg-yellow-400`} title="Reservado"></div>;
    return <div className={`${baseClasses} bg-gray-300`} title="Disponible"></div>;
};

// Componente para un solo boleto
const Ticket = ({ ticket, onSelect }) => {
    const isAvailable = ticket.status === 'available';
    let bgColor = 'bg-gray-200 text-gray-500 cursor-not-allowed';
    let hoverClass = '';

    if (isAvailable) {
        bgColor = 'bg-white';
        hoverClass = 'hover:bg-blue-500 hover:text-white transform hover:scale-105';
    } else if (ticket.status === 'reserved') {
        bgColor = 'bg-yellow-400 border-yellow-500';
    } else if (ticket.status === 'paid') {
        bgColor = 'bg-green-500 border-green-600 text-white';
    }

    return (
        <div
            onClick={() => isAvailable && onSelect(ticket.ticket_number)}
            className={`p-2 border rounded-lg text-center font-bold transition-all duration-200 ${bgColor} ${isAvailable ? 'cursor-pointer' : ''} ${hoverClass}`}
        >
            {String(ticket.ticket_number).padStart(3, '0')}
        </div>
    );
};

// Componente para el modal de reserva
const ReservationModal = ({ show, onClose, ticketNumber, raffleId, onReservationSuccess }) => {
    const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone: '' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Reiniciar formulario cuando el modal se abre para un nuevo ticket
        if (show) {
            setFormData({ first_name: '', last_name: '', email: '', phone: '' });
        }
    }, [show]);

    if (!show) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/tickets/reserve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, raffle_id: raffleId, ticket_number: ticketNumber })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Error al reservar');
            }

            const result = await response.json();
            onReservationSuccess(result);
            onClose();

        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Reservar Boleto #{String(ticketNumber).padStart(3, '0')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700">Nombre</label>
                        <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full p-2 border rounded" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700">Apellido</label>
                        <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full p-2 border rounded" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700">Correo Electrónico</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700">Teléfono (WhatsApp)</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300">
                            {isLoading ? 'Reservando...' : 'Confirmar Reserva'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// Componente para la vista detallada de una rifa
const RaffleDetail = ({ raffleId, onBack }) => {
    const [raffle, setRaffle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);

    const fetchRaffle = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/raffles/${raffleId}`);
            if (!response.ok) throw new Error('No se pudo cargar la rifa.');
            const data = await response.json();
            setRaffle(data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [raffleId]);

    useEffect(() => {
        fetchRaffle();

        const newSocket = io(SOCKET_URL);
        newSocket.emit('join_raffle', raffleId);

        newSocket.on('ticket_updated', (updatedTicket) => {
            setRaffle(prevRaffle => {
                if (!prevRaffle) return null;
                const newTickets = prevRaffle.tickets.map(t =>
                    t.id === updatedTicket.id ? updatedTicket : t
                );
                return { ...prevRaffle, tickets: newTickets };
            });
            toast.info(`¡El boleto #${String(updatedTicket.ticket_number).padStart(3, '0')} ha sido actualizado!`);
        });

        return () => {
            newSocket.emit('leave_raffle', raffleId);
            newSocket.disconnect();
        };
    }, [raffleId, fetchRaffle]);

    const handleSelectTicket = (ticketNumber) => {
        setSelectedTicket(ticketNumber);
    };

    const handleCloseModal = () => {
        setSelectedTicket(null);
    };
    
    const handleReservationSuccess = () => {
        toast.success('¡Boleto reservado! Revisa tu correo para más detalles.');
    };

    if (loading) return <div className="text-center p-10">Cargando Rifa...</div>;
    if (!raffle) return <div className="text-center p-10 text-red-500">No se pudo cargar la información de la rifa.</div>;

    const stats = {
        paid: raffle.tickets.filter(t => t.status === 'paid').length,
        reserved: raffle.tickets.filter(t => t.status === 'reserved').length,
        available: raffle.tickets.filter(t => t.status === 'available').length,
    };
    const progress = ((stats.paid + stats.reserved) / raffle.total_tickets) * 100;

    return (
        <div className="p-4 md:p-8">
            <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                &larr; Volver a todas las rifas
            </button>
            <div className="bg-white rounded-lg shadow-md p-6">
                <h1 className="text-3xl font-bold mb-2">{raffle.name}</h1>
                <p className="text-gray-600 mb-4">{raffle.description}</p>
                
                <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="flex items-center"><StatusIcon status="paid" /> Pagados: {stats.paid}</span>
                        <span className="flex items-center"><StatusIcon status="reserved" /> Reservados: {stats.reserved}</span>
                        <span className="flex items-center"><StatusIcon status="available" /> Disponibles: {stats.available}</span>
                    </div>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-2">
                    {raffle.tickets.map(ticket => (
                        <Ticket key={ticket.id} ticket={ticket} onSelect={handleSelectTicket} />
                    ))}
                </div>
            </div>
            <ReservationModal 
                show={selectedTicket !== null}
                onClose={handleCloseModal}
                ticketNumber={selectedTicket}
                raffleId={raffleId}
                onReservationSuccess={handleReservationSuccess}
            />
        </div>
    );
};

// Componente para la lista de rifas
const RaffleList = ({ onSelectRaffle }) => {
    const [raffles, setRaffles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/raffles`)
            .then(res => {
                if (!res.ok) throw new Error("No se pudo conectar al servidor.");
                return res.json();
            })
            .then(data => setRaffles(data))
            .catch(err => toast.error(`Error al cargar rifas: ${err.message}`))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center p-10">Cargando...</div>;

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-4xl font-bold text-center mb-8">Rifas Activas</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {raffles.map(raffle => (
                    <div key={raffle.id} className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform hover:-translate-y-1 transition-transform" onClick={() => onSelectRaffle(raffle.id)}>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-2">{raffle.name}</h2>
                            <p className="text-gray-700 mb-4">{raffle.description}</p>
                            <div className="text-lg font-semibold text-blue-600">
                                Precio: ${parseFloat(raffle.ticket_price).toFixed(2)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// Componente principal
function App() {
    const [selectedRaffleId, setSelectedRaffleId] = useState(null);

    const handleSelectRaffle = (id) => {
        setSelectedRaffleId(id);
    };

    const handleBackToList = () => {
        setSelectedRaffleId(null);
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
            <header className="bg-white shadow-md">
                <nav className="container mx-auto px-6 py-4">
                    <h1 className="text-2xl font-bold text-gray-800">App de Rifas</h1>
                </nav>
            </header>
            <main className="container mx-auto">
                {selectedRaffleId ? (
                    <RaffleDetail raffleId={selectedRaffleId} onBack={handleBackToList} />
                ) : (
                    <RaffleList onSelectRaffle={handleSelectRaffle} />
                )}
            </main>
        </div>
    );
}

export default App;