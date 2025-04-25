const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();
const cron = require('node-cron');
const helpMessage = require('./components/helpMessage.js');
const bot = new Telegraf(process.env.BOT_TOKEN);
require('./components/connect.js')(bot);

const mysql = require('mysql2');
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
    { command: 'city', description: 'Imposta città preferita per il meteo giornaliero' },
    { command: 'google', description: 'Ricerca su Google' },
    { command: 'help', description: 'Mostra tutti i comandi' }
]);

bot.command('help', ctx => ctx.reply(helpMessage));

bot.command('text', ctx => {

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0)
        return ctx.reply('Devi inserire un messaggio! (/text TESTO)');
    ctx.reply(args.join(' '));

});

bot.command('eur', ctx => {

    const value = parseFloat(ctx.message.text.split(' ')[1]);
    if (isNaN(value) || value <= 0)
        return ctx.reply('Devi inserire un numero valido! (/eur NUMERO)');
    ctx.reply(`${(value * exchangeRate).toFixed(2)} $`);

});

bot.command('usd', ctx => {

    const value = parseFloat(ctx.message.text.split(' ')[1]);
    if (isNaN(value) || value <= 0)
        return ctx.reply('Devi inserire un numero valido! (/usd NUMERO)');
    ctx.reply(`${(value / exchangeRate).toFixed(2)} €`);

});

bot.command('spam', ctx => {

    let count = parseInt(ctx.message.text.split(' ')[1]);

    if (isNaN(count) || count <= 0)
        return ctx.reply('Devi inserire un numero valido <=10! (/spam NUMERO)');

    if (count > 10) count = 10;

    for (let i = 0; i < count; i++)
        ctx.reply('spam');

});

bot.command('weather', async ctx => {

    const weatherEmoji = (weatherCondition) => {
        switch (weatherCondition) {
            case 'clear':
                return '☀️';  // Sereno
            case 'clouds':
                return '☁️';  // Nuvoloso
            case 'rain':
                return '🌧️';  // Pioggia
            case 'snow':
                return '❄️';  // Neve
            case 'thunderstorm':
                return '⛈️';  // Temporale
            case 'drizzle':
                return '🌦️';  // Pioggerella
            default:
                return '🌈';  // Per condizioni non definite
        }
    };

    const args = ctx.message.text.split(' ');
    const city = args.slice(1).join(' ');

    if (!city)
        return ctx.reply('Devi inserire una città valida! (/weather CITTÀ)');

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
        const description = data.weather[0].description;
        const temp = data.main.temp;
        const weatherCondition = data.weather[0].main.toLowerCase();
        const emoji = weatherEmoji(weatherCondition);
        ctx.reply(`${emoji} Il meteo a ${city} è: ${description}, temperatura: ${temp}°C`);

    } catch (err) {

        if (err.response && err.response.status === 404)
            ctx.reply(`❌ Città "${city}" non trovata. Prova a controllare l'ortografia.`);
        else {
            //console.error('Errore Weather:', err);
            ctx.reply('⚠️ Errore nel recupero del meteo. Riprova più tardi.');
        }

    }

});

bot.command('city', async ctx => {

    //ctx.reply('📍 Scrivi il nome della città per cui vuoi ricevere ogni sera le previsioni per il giorno dopo:');
    //bot.once

    if (!city)
        return ctx.reply('Devi inserire una città valida! (/city CITTÀ)');

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
        console.log("Città salvata con successo: ", data.name);

        const iduser = ctx.from.id;

        db.query('UPDATE users SET city = ? WHERE iduser = ?', [city, iduser], err => {
            if (err) return ctx.reply('❌ Errore nel salvataggio. Riprova.');
            ctx.reply(`✅ Perfetto! Riceverai ogni sera alle 21 il meteo di ${city} per il giorno seguente.`);
        });

    } catch (err) {

        if (err.response && err.response.status === 404)
            ctx.reply(`❌ Città "${city}" non trovata. Prova a controllare l'ortografia.`);
        else {
            ctx.reply('⚠️ Errore. Riprova più tardi.');
        }

    }

});

// Cronjob alle 21:00 per inviare meteo del giorno dopo
const mysql2 = require('mysql2/promise');
cron.schedule('0 21 * * *', async () => {

    const conn = await mysql2.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'telegrambot',
    });

    const [rows] = await conn.execute('SELECT iduser, city FROM users WHERE city IS NOT NULL AND city <> ""');
    await conn.end();

    for (const { iduser, city } of rows) {

        try {

            const res = await axios.get(`https://api.openweathermap.org/data/2.5/forecast`, {
                params: {
                    q: city,
                    appid: process.env.WEATHER_API_KEY,
                    lang: 'it',
                    units: 'metric'
                }
            });

            // Trova dati del giorno seguente (primo blocco con data domani)
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const targetDate = tomorrow.toISOString().split('T')[0];

            const forecasts = res.data.list.filter(f => f.dt_txt.startsWith(targetDate));
            if (forecasts.length === 0) continue;

            const forecast = forecasts[Math.floor(forecasts.length / 2)];
            const emojiMap = {
                clear: '☀️', clouds: '☁️', rain: '🌧️', snow: '❄️',
                thunderstorm: '⛈️', drizzle: '🌦️'
            };
            const icon = forecast.weather[0].main.toLowerCase();
            const emoji = emojiMap[icon] || '🌈';

            const msg = `📅 *Previsioni per ${targetDate} a ${city}*\n${emoji} ${forecast.weather[0].description}, temperatura media: ${forecast.main.temp}°C`;

            await bot.telegram.sendMessage(iduser, msg);

        } catch (err) {
            console.error(`Errore meteo per ${city}:`, err.message);
        }
        
    }

    console.log('Meteo giornaliero inviato.');

});

bot.command('google', ctx => {

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0)
        return ctx.reply('Devi inserire una ricerca valida! (/google RICERCA)');
    const query = args.join('+');
    ctx.reply(`🔍 https://www.google.com/search?q=${query}`);

});

bot.on('sticker', ctx => ctx.reply('👍'));

bot.command('lala', context => context.reply('land'));

bot.launch()
    .then(() => console.log('Bot avviato correttamente!'))
    .catch(err => console.error('Errore nell\'avvio del bot:', err));