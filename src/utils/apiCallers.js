// utils/apiCallers.js
const axios = require('axios');

// Load environment variables here as well, as this module will use them
require('dotenv').config();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const { Client } = require("@googlemaps/google-maps-services-js");
const placesClient = new Client({});


/**
 * Fetches weather data for given coordinates.
 * This function is purely for data retrieval, no message sending.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string} Formatted weather string or error message indicator.
 */
async function fetchWeatherByCoords(latitude, longitude) {
    if (!OPENWEATHER_API_KEY) {
        console.error("OPENWEATHER_API_KEY not set for weather data fetching.");
        return "API_KEY_MISSING_WEATHER";
    }

    try {
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const apiResponse = await axios.get(apiUrl);
        const data = apiResponse.data;

        const city = data.name || (data.coord ? `Lat: ${data.coord.lat}, Lon: ${data.coord.lon}` : 'your location');
        const temp = data.main.temp;
        const description = data.weather[0].description;

        return `Weather: ${description.charAt(0).toUpperCase() + description.slice(1)}, ${temp}°C.`;
    } catch (error) {
        console.error("Error fetching weather information by coordinates:", error.response ? error.response.data : error.message);
        return "Could not fetch current weather data.";
    }
}

/**
 * Fetches weather data for a given city name.
 * This function is purely for data retrieval, no message sending.
 * @param {string} city
 * @returns {string} Formatted weather string or error message indicator.
 */
async function fetchWeatherByCity(city) {
    if (!OPENWEATHER_API_KEY) {
        console.error("OPENWEATHER_API_KEY not set for weather data fetching.");
        return "API_KEY_MISSING_WEATHER";
    }

    try {
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const apiResponse = await axios.get(apiUrl);
        const data = apiResponse.data;

        const cityName = data.name || city;
        const country = data.sys.country || '';
        const temp = data.main.temp;
        const feelsLike = data.main.feels_like;
        const description = data.weather[0].description;
        const humidity = data.main.humidity;
        const windSpeed = data.wind.speed;

        return `Current weather in ${cityName}${country ? `, ${country}` : ''}:
Conditions: ${description.charAt(0).toUpperCase() + description.slice(1)}
Temperature: ${temp}°C (feels like ${feelsLike}°C)
Humidity: ${humidity}%
Wind Speed: ${windSpeed} m/s`;
    } catch (error) {
        console.error("Error fetching weather information by city:", error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 404) {
            return `I'm sorry, I couldn't find weather information for "${city}". Please double-check the city name.`;
        } else if (error.response && error.response.status === 401) {
            return "I'm having trouble accessing weather data. Please ensure the API key is correct and not expired.";
        }
        return "Could not fetch current weather data.";
    }
}


/**
 * Fetches local news for a given city.
 * @param {string} city
 * @returns {string} Formatted news summary or error message indicator.
 */
async function fetchLocalNews(city) {
    if (!NEWS_API_KEY) {
        console.error("NEWS_API_KEY not set for news data fetching.");
        return "API_KEY_MISSING_NEWS";
    }
    if (!city) {
        return "Cannot get local news without a specific city.";
    }

    try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}&language=en&sortBy=relevancy&pageSize=3&apiKey=${NEWS_API_KEY}`;
        const response = await axios.get(url);
        const articles = response.data.articles;

        if (articles && articles.length > 0) {
            let newsSummary = `Local News:\n`;
            articles.forEach((article, index) => {
                newsSummary += `${index + 1}. ${article.title} (${article.source.name})\n`;
            });
            return newsSummary;
        } else {
            return `No recent news found for ${city}.`;
        }
    } catch (error) {
        console.error("Error fetching local news:", error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 429) {
            return "News API rate limit exceeded.";
        }
        return "Could not fetch local news right now.";
    }
}

/**
 * Fetches famous places using Google Places API.
 * @param {string} city
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string} Formatted places summary or error message indicator.
 */
async function fetchFamousPlaces(city, latitude, longitude) {
    if (!GOOGLE_PLACES_API_KEY) {
        console.error("GOOGLE_PLACES_API_KEY not set for places data fetching.");
        return "API_KEY_MISSING_PLACES";
    }
    if (!city && (!latitude || !longitude)) {
        return "Cannot find places without a city name or coordinates.";
    }

    try {
        // Prefer Nearby Search if coordinates are available for better relevance
        if (latitude && longitude) {
            const response = await placesClient.placesNearby({
                params: {
                    location: `${latitude},${longitude}`,
                    radius: 50000, // 50 km radius (adjust as needed)
                    type: ['tourist_attraction', 'point_of_interest'],
                    rankby: 'prominence',
                    key: GOOGLE_PLACES_API_KEY
                },
                timeout: 1000 // milliseconds
            });
            const places = response.data.results;
            
            if (places && places.length > 0) {
                let placesSummary = "Famous Places:\n";
                places.slice(0, 5).forEach((place, index) => {
                    placesSummary += `${index + 1}. ${place.name}`;
                    if (place.rating) placesSummary += ` (Rating: ${place.rating})`;
                    placesSummary += `\n`;
                });
                return placesSummary;
            } else {
                 // Fallback to text search if no nearby results for specific types
                 return await fetchFamousPlacesTextSearch(city);
            }
        } else {
            // Fallback to text search if only city name is available
            return await fetchFamousPlacesTextSearch(city);
        }

    } catch (error) {
        console.error("Error fetching famous places from Google Places API:", error.response ? error.response.data : error.message);
        // Fallback to text search or generic message on error
        return await fetchFamousPlacesTextSearch(city);
    }
}

// Helper for Google Places Text Search fallback
async function fetchFamousPlacesTextSearch(city) {
    if (!GOOGLE_PLACES_API_KEY) {
        return "API_KEY_MISSING_PLACES"; // Redundant but safe check
    }
    try {
        const response = await placesClient.textSearch({
            params: {
                query: `famous places in ${city}`,
                key: GOOGLE_PLACES_API_KEY,
                type: 'point_of_interest' // Or remove this for broader results
            },
            timeout: 1000 // milliseconds
        });

        const places = response.data.results;
        if (places && places.length > 0) {
            let placesSummary = "Famous Places:\n";
            places.slice(0, 5).forEach((place, index) => {
                placesSummary += `${index + 1}. ${place.name}`;
                if (place.rating) placesSummary += ` (Rating: ${place.rating})`;
                placesSummary += `\n`;
            });
            return placesSummary;
        } else {
            return `Famous Places:\nNo prominent places of interest found for ${city}.`;
        }
    } catch (error) {
        console.error("Error fetching famous places from Google Places API (Text Search):", error.response ? error.response.data : error.message);
        return `Famous Places:\nCould not fetch famous places right now.`;
    }
}

// Helper to get city name from coordinates (using OpenWeatherMap's reverse geocoding)
async function fetchCityFromCoordinates(latitude, longitude) {
    if (!OPENWEATHER_API_KEY) {
        console.error("OPENWEATHER_API_KEY not set for geocoding. Cannot perform reverse geocoding.");
        return null;
    }
    try {
        const url = `http://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${OPENWEATHER_API_KEY}`;
        const response = await axios.get(url);
        if (response.data && response.data.length > 0) {
            return response.data[0].name; // Returns city name
        }
    } catch (error) {
        console.error("Error in reverse geocoding (OpenWeatherMap):", error.response ? error.response.data : error.message);
    }
    return null;
}


module.exports = {
    fetchWeatherByCoords,
    fetchWeatherByCity,
    fetchLocalNews,
    fetchFamousPlaces,
    fetchCityFromCoordinates // Export this for comprehensive agent
};