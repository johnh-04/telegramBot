const mysql = require('mysql2');

// Crea un pool di connessioni con supporto a async/await
const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'telegrambot',
});


pool.getConnection((err, connection) => {
    if (err)
        console.error('Errore di connessione al database:', err);
    else {
        console.log('Connesso a MySQL!');
        connection.release(); // Rilascia la connessione al pool
    }
});

// Esporta il pool con supporto async/await
module.exports = pool.promise();