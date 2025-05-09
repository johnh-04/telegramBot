require('dotenv').config();
const axios = require('axios');
const helpMessage = require('./helpMessage');
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const db = require('./db.js');

module.exports = function (bot) {

    // Quando il bot parte, notifica tutti gli utenti -> commentato per evitare spam
    const onlineMsg = '🤖 Ehi, sono online!';
    /*db.query('SELECT iduser FROM users', (err, rows) => {
        if (err) return console.error(err);
        rows.forEach(row => {
            const chatId = row.iduser;
            //axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${chatId}&text=${onlineMsg}`);
        });
    });*/
    axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${ADMIN_ID}&text=${onlineMsg}`); //notifico solo me stesso per evitare spam

    bot.start(async ctx => {

        const firstname = ctx.from.first_name || 'noName';
        const username = ctx.from.username || 'noUsername';
        const iduser = ctx.from.id;

        console.log(`Utente: ${firstname} - ${username} - ${iduser}`);

        ctx.reply(`Ciao ${firstname}! utilizza /help per visualizzare i comandi disponibili.`);

        try {

            const [rows] = await db.query('SELECT iduser FROM users WHERE iduser = ?', [iduser]);

            if (rows.length === 0) {

                await db.query(
                    'INSERT INTO users (firstname, username, iduser) VALUES (?, ?, ?)',
                    [firstname, username, iduser]
                );

                console.log('Nuovo utente registrato!');
                ctx.reply('🟢 Registrato nel database! Sarai informato quando sarò online.');
                
            } else {
                console.log('Utente già registrato!');
                ctx.reply('🔵 Sei già registrato nel database!');
            }

        } catch (err) {
            console.error('Errore con il database:', err);
            ctx.reply('❌ Errore durante la registrazione nel database.');
        }

    });

};