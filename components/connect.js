const mysql = require('mysql2');
const axios = require('axios');
require('dotenv').config();
const helpMessage = require('./helpMessage');

module.exports = function (bot) {

    const db = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'telegrambot',
    });

    db.connect(err => {
        if (err) throw err;
        console.log('Connesso a MySQL!');
    });

    // Quando il bot parte, notifica tutti gli utenti -> commentato per evitare spam
    const onlineMsg = '🤖 Ehi, sono online!';
    db.query('SELECT iduser FROM users', (err, rows) => {
        if (err) return console.error(err);
        rows.forEach(row => {
            const chatId = row.iduser;
            axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${chatId}&text=${onlineMsg}`);
        });
    });

    bot.start(ctx => {

        const firstname = ctx.from.first_name || 'noName';
        const username = ctx.from.username || 'noUsername';
        const iduser = ctx.from.id;

        console.log(`Utente: ${firstname} - ${username} - ${iduser}`);

        ctx.reply(`Ciao ${firstname}! Usa /help per vedere i comandi disponibili.`);

        db.query('SELECT iduser FROM users WHERE iduser = ?', [iduser], (err, rows) => {

            if (err) return console.error(err);

            if (rows.length === 0) {
                db.query(
                    'INSERT INTO users (firstname, username, iduser) VALUES (?, ?, ?)',
                    [firstname, username, iduser],
                    err => {
                        if (err) return console.error(err);
                        console.log('Nuovo utente registrato!');
                        ctx.reply('🟢 Registrato nel database! Sarai informato quando sarò online.');
                    }
                );
            } else {
                console.log('Utente già registrato!');
                ctx.reply('🔵 Sei già registrato nel database!');
            }

        });

    });

};