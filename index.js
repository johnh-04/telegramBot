require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const cron = require('node-cron');
const { CronJob } = require('cron');
const mysql = require('mysql2');
const helpMessage = require('./components/helpMessage.js');

console.log('BOT_TOKEN:', process.env.BOT_TOKEN?.slice(0, 10));
const bot = new Telegraf(process.env.BOT_TOKEN);
require('./components/connect.js')(bot);

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'telegrambot',
});

const exchangeRate = 1.125; // Esempio di tasso di cambio EUR/USD

// Menu comandi
bot.telegram.setMyCommands([
    { command: 'text', description: 'Ripeti il testo' },
    { command: 'eur', description: 'Converte € in $' },
    { command: 'usd', description: 'Converte $ in €' },
    { command: 'spam', description: 'Spam testuale' },
    { command: 'weather', description: 'Meteo attuale' },
    { command: 'setcity', description: 'Imposta città preferita per il meteo giornaliero' },
    { command: 'unsetcity', description: 'Rimuovi città preferita per il meteo giornaliero' },
    { command: 'google', description: 'Ricerca su Google' },
    { command: 'help', description: 'Mostra tutti i comandi' }
]);

// Help
bot.command('help', ctx => ctx.reply(helpMessage));

// Text
bot.command('text', ctx => {

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0)
        return ctx.reply('Devi inserire un messaggio! (/text TESTO)');
    ctx.reply(args.join(' '));

});

// Eur
bot.command('eur', ctx => {

    const value = parseFloat(ctx.message.text.split(' ')[1]);
    if (isNaN(value) || value <= 0)
        return ctx.reply('Devi inserire un numero valido! (/eur NUMERO)');
    ctx.reply(`${(value * exchangeRate).toFixed(2)} $`);

});

// Usd
bot.command('usd', ctx => {

    const value = parseFloat(ctx.message.text.split(' ')[1]);
    if (isNaN(value) || value <= 0)
        return ctx.reply('Devi inserire un numero valido! (/usd NUMERO)');
    ctx.reply(`${(value / exchangeRate).toFixed(2)} €`);

});

// Spam
bot.command('spam', ctx => {

    let count = parseInt(ctx.message.text.split(' ')[1]);

    if (isNaN(count) || count <= 0)
        return ctx.reply('Devi inserire un numero valido <=10! (/spam NUMERO)');

    if (count > 10) count = 10;

    for (let i = 0; i < count; i++)
        ctx.reply('spam');

});

// Weather
bot.command('weather', async ctx => {

    const args = ctx.message.text.split(' ');
    const city = args.slice(1).join(' ');

    if (!city)
        return ctx.reply('Devi inserire una città valida! (/weather CITTÀ)');

    const message = await forecast(city, 'now');
    ctx.reply(`${message}`);

});

// Setcity
bot.command('setcity', async ctx => {

    //ctx.reply('📍 Scrivi il nome della città per cui vuoi ricevere ogni sera le previsioni per il giorno dopo:');
    //bot.once

    const args = ctx.message.text.split(' ');
    const city = args.slice(1).join(' ');

    if (!city)
        return ctx.reply('Devi inserire una città valida! (/setcity CITTÀ)');

    try {

        const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
            params: {
                q: city,
                appid: process.env.WEATHER_API_KEY,
                lang: 'it',
                units: 'metric'
            }
        });

        const data = res.data;
        console.log('Città salvata con successo: ', data.name);

        const iduser = ctx.from.id;

        db.query('UPDATE users SET city = ? WHERE iduser = ?', [city, iduser], err => {
            if (err) return ctx.reply('❌ Errore nel salvataggio. Riprova.');
            ctx.reply(`✅ Perfetto! Riceverai ogni mattina il meteo giornaliero di ${city}.`);
        });

    } catch (err) {

        if (err.response && err.response.status === 404)
            ctx.reply(`❌ Città "${city}" non trovata. Prova a controllare l'ortografia.`);
        else
            ctx.reply('⚠️ Errore. Riprova più tardi.');

    }

});

// Unsetcity
bot.command('unsetcity', ctx => {

    try {

        const iduser = ctx.from.id;

        db.query('UPDATE users SET city = ? WHERE iduser = ?', ["", iduser], err => {
            if (err) return ctx.reply('❌ Errore nel salvataggio. Riprova.');
            ctx.reply(`✅ Città rimossa con successo! Non riceverai più il meteo giornaliero.`);
        });

        console.log('Città rimossa con successo.');

    } catch (err) {
        ctx.reply('⚠️ Errore. Riprova più tardi.');
    }

});

// Cronjob alle 6:00 per inviare meteo del giorno
const mysql2 = require('mysql2/promise');
const forecast = require('./components/forecast.js');
const job = new CronJob(
    '25 22 * * *', // ogni giorno alle 6:00
    async () => {

        console.log('Inizio invio previsioni giornaliere...');

        try {

            const conn = await mysql2.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'telegrambot',
            });

            const [rows] = await conn.execute('SELECT iduser, city FROM users WHERE city IS NOT NULL AND city <> ""');
            await conn.end();

            if (rows.length === 0) {
                console.log('Nessun utente con città impostata.');
                return;
            }

            //for (const { iduser, city } of rows) {
                
                const city = 'Mola di Bari';
                const iduser = 634992918; //solo per test

                const message = await forecast(city, 'daily');
                await bot.telegram.sendMessage(iduser, message); //{ parse_mode: 'Markdown' }

            //}

            console.log('Meteo giornaliero inviato.');

        } catch (error) {
            console.error('Errore generale durante l’invio previsioni:', error.message);
        }

    },
    null,
    true, // Avvia subito il job
    'Europe/Rome' // Fuso orario europeo
);

job.start(); // Avvia il cronjob

// Google
bot.command('google', ctx => {

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0)
        return ctx.reply('Devi inserire una ricerca valida! (/google RICERCA)');
    const query = args.join('+');
    ctx.reply(`🔍 https://www.google.com/search?q=${query}`);

});

// *Sticker*
bot.on('sticker', ctx => ctx.reply('👍'));

// Lala
bot.command('lala', context => context.reply('land'));


bot.launch()
    .then(() => console.log('Bot avviato correttamente!'))
    .catch(err => console.error('Errore nell\'avvio del bot:', err));