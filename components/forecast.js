const axios = require('axios');

const emojiMap = {
    clear: '☀️',
    clouds: '☁️',
    rain: '🌧️',
    snow: '❄️',
    thunderstorm: '⛈️',
    drizzle: '🌦️',
    mist: '🌫️',
    haze: '🌫️',
};

function getWindDirection(deg) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const i = Math.round(deg / 45) % 8;
    return directions[i];
}

async function forecast(city, message) {

    try {

        const res = await axios.get(`https://api.openweathermap.org/data/2.5/forecast`, {
            params: {
                q: city,
                appid: process.env.WEATHER_API_KEY,
                lang: 'it',
                units: 'metric'
            }
        });

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const targetHours = ['06', '08', '10', '12', '14', '16', '18', '20', '22'];

        const filtered = res.data.list.filter(f => {
            const [date, time] = f.dt_txt.split(' ');
            const hour = time.split(':')[0];
            return date === todayStr && targetHours.includes(hour);
        });

        if (filtered.length === 0) return `⚠️ Nessuna previsione trovata per ${city}.`;

        message = `📍 Previsioni meteo per oggi a *${city}*\n`;

        for (const f of filtered) {

            const hour = f.dt_txt.split(' ')[1].slice(0, 5);
            const weatherMain = f.weather[0].main.toLowerCase();
            const emoji = emojiMap[weatherMain] || '🌈';
            const description = f.weather[0].description;
            const temp = f.main.temp.toFixed(1);
            const humidity = f.main.humidity;
            const windSpeed = f.wind.speed.toFixed(1);
            const windDir = getWindDirection(f.wind.deg);

            message += `\n🕒 *${hour}* ${emoji} ${description}, 🌡️ ${temp}°C, 💨 ${windSpeed} m/s da ${windDir}, 💧 ${humidity}%`;

        }

        return message;

    } catch (err) {

        if (err.response && err.response.status === 404)
            ctx.reply(`❌ Città "${city}" non trovata. Prova a controllare l'ortografia.`);
        else {
            //console.error('Errore Weather:', err);
            ctx.reply('⚠️ Errore nel recupero del meteo. Riprova più tardi.');
        }

    }

}

module.exports = forecast;