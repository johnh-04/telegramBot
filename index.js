const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();
const helpMessage = require('./components/helpMessage.js');
const bot = new Telegraf(process.env.BOT_TOKEN);
require('./components/connect.js')(bot);

const exchangeRate = 1.125; // Esempio di tasso di cambio EUR/USD

bot.command('help', ctx => ctx.reply(helpMessage), { parse_mode: 'MarkdownV2' });

bot.command('text', ctx => {

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0)
        return ctx.reply('Devi inserire un messaggio! (/text _testo_)', { parse_mode: 'MarkdownV2' });
    ctx.reply(args.join(' '));

});

bot.command('eur', ctx => {

    const value = parseFloat(ctx.message.text.split(' ')[1]);
    if (isNaN(value) || value <= 0)
        return ctx.reply('Devi inserire un numero valido! (/eur _numero_)', { parse_mode: 'MarkdownV2' });
    ctx.reply(`${(value * exchangeRate).toFixed(2)} $`);

});

bot.command('usd', ctx => {

    const value = parseFloat(ctx.message.text.split(' ')[1]);
    if (isNaN(value) || value <= 0)
        return ctx.reply('Devi inserire un numero valido! (/usd _numero_)', { parse_mode: 'MarkdownV2' });
    ctx.reply(`${(value / exchangeRate).toFixed(2)} €`);

});

bot.command('spam', ctx => {

    let count = parseInt(ctx.message.text.split(' ')[1]);

    if (isNaN(count) || count <= 0)
        return ctx.reply('Devi inserire un numero valido <=10! (/spam _numero_)', { parse_mode: 'MarkdownV2' });

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
        return ctx.reply('Devi inserire una città valida! (/weather _città_)', { parse_mode: 'MarkdownV2' });

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

bot.command('google', ctx => {

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0)
        return ctx.reply('Inserisci la tua ricerca dopo /google (/google _ricerca_)', { parse_mode: 'MarkdownV2' });
    const query = args.join('+');
    ctx.reply(`🔍 https://www.google.com/search?q=${query}`);

});

bot.on('sticker', ctx => ctx.reply('👍'));

bot.command('lala', context => context.reply('land'));

bot.launch()
    .then(() => console.log('Bot avviato correttamente!'))
    .catch(err => console.error('Errore nell\'avvio del bot:', err));