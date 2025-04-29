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

async function forecast(city, mode) {

    try {

        const forecastRes = await axios.get(`https://api.openweathermap.org/data/2.5/forecast`, {
            params: {
                q: city,
                appid: process.env.WEATHER_API_KEY,
                lang: 'it',
                units: 'metric'
            }
        });

        now = new Date();
        const now = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
        const todayStr = nowInRome.toISOString().split('T')[0];

        if (mode === 'now') {

            const currentRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
                params: {
                    q: city,
                    appid: process.env.WEATHER_API_KEY,
                    lang: 'it',
                    units: 'metric'
                }
            });

            const current = currentRes.data;
            const currentWeather = current.weather[0];
            const emojiNow = emojiMap[currentWeather.main.toLowerCase()] || '🌈';
            const tempNow = current.main.temp.toFixed(1);
            const humidityNow = current.main.humidity;
            const windNow = current.wind.speed.toFixed(1);
            const windDirNow = getWindDirection(current.wind.deg);
            const hourNow = now.toTimeString().slice(0, 5) + 2;
            const hourNowInt = now.getHours();

            let message = `📍 Meteo attuale a ${city}:\n\n🕒 ${hourNow} ${emojiNow} ${currentWeather.description}, 🌡️ ${tempNow}°C, 💨 ${windNow} m/s da ${windDirNow}, 💧 ${humidityNow}%\n`;

            const filtered = forecastRes.data.list.filter(f => {
                const [date, time] = f.dt_txt.split(' ');
                const hour = parseInt(time.split(':')[0]);
                return date === todayStr && hour > hourNowInt && hour <= 22 && hour % 2 === 0; //previsioni di orari pari dal momento in cui si chiede fino alle 22
            });

            if (filtered.length > 0) {

                message += `\n📅 Previsioni per il resto della giornata:\n`;

                for (const f of filtered) {

                    const hour = f.dt_txt.split(' ')[1].slice(0, 5);
                    const weatherMain = f.weather[0].main.toLowerCase();
                    const emoji = emojiMap[weatherMain] || '🌈';
                    const description = f.weather[0].description;
                    const temp = f.main.temp.toFixed(1);
                    const humidity = f.main.humidity;
                    const windSpeed = f.wind.speed.toFixed(1);
                    const windDir = getWindDirection(f.wind.deg);

                    message += `\n🕒 ${hour} ${emoji} ${description}, 🌡️ ${temp}°C, 💨 ${windSpeed} m/s da ${windDir}, 💧 ${humidity}%`;

                }

            }

            return message;

        }

        if (mode === 'daily') {

            const targetHours = ['06', '08', '10', '12', '14', '16', '18', '20', '22'];
            const filtered = forecastRes.data.list.filter(f => {
                const [date, time] = f.dt_txt.split(' ');
                const hour = time.split(':')[0];
                return date === todayStr && targetHours.includes(hour);
            });

            if (filtered.length === 0) return `⚠️ Nessuna previsione trovata per ${city}.`;

            let message = `📍 Previsioni meteo per oggi a ${city}\n`;

            for (const f of filtered) {

                const hour = f.dt_txt.split(' ')[1].slice(0, 5);
                const weatherMain = f.weather[0].main.toLowerCase();
                const emoji = emojiMap[weatherMain] || '🌈';
                const description = f.weather[0].description;
                const temp = f.main.temp.toFixed(1);
                const humidity = f.main.humidity;
                const windSpeed = f.wind.speed.toFixed(1);
                const windDir = getWindDirection(f.wind.deg);

                message += `\n🕒 ${hour} ${emoji} ${description}, 🌡️ ${temp}°C, 💨 ${windSpeed} m/s da ${windDir}, 💧 ${humidity}%`;

            }

            return message;
        }

        return '⚠️ Modalità meteo non riconosciuta.';

    } catch (err) {
        return `⚠️ Errore durante il recupero del meteo per ${city}.`;
    }

}

module.exports = forecast;