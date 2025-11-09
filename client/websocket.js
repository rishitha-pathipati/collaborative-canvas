// client/websocket.js
// initialize socket and expose globals
const SERVER_URL = 'https://collab-backend-tj3p.onrender.com'; // your render backend URL
const socket = io(SERVER_URL, { transports: ['websocket','polling'], withCredentials: true });
window.socket = socket;
window.ROOM_ID = null;
window.USER = { id: crypto.randomUUID(), name: 'User-'+Math.floor(Math.random()*1000) };

socket.on('connect', () => console.log('websocket.js: socket connected', socket.id));
socket.on('connect_error', (err) => console.error('websocket connect_error', err));
