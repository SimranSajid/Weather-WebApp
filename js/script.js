// ==================== DOM ELEMENT SELECTIONS ====================
const weatherForm = document.querySelector("#weather-form");
const locationInput = document.querySelector("#location-input");
const statusMessage = document.querySelector("#status-message");

const locationName = document.querySelector("#location-name");
const locationDetails = document.querySelector("#location-details");

const weatherIcon = document.querySelector("#weather-icon");
const temperature = document.querySelector("#temperature");
const weatherCondition = document.querySelector("#weather-condition");
const weatherDescription = document.querySelector("#weather-description");
const feelsLikeTemperature = document.querySelector("#feels-like-temperature");

const humidity = document.querySelector("#humidity");
const windSpeed = document.querySelector("#wind-speed");
const windDirection = document.querySelector("#wind-direction");
const pressure = document.querySelector("#pressure");
const visibility = document.querySelector("#visibility");
const cloudCover = document.querySelector("#cloud-cover");
const sunrise = document.querySelector("#sunrise");
const sunset = document.querySelector("#sunset");

const themeToggle = document.querySelector("#theme-toggle");

// ==================== HELPER / FORMATTING FUNCTIONS ====================
//weather code --> icon + description + condition

function getWeatherInfo(code) {
    if (code === 0) {
        return {
            condition: "Clear Sky",
            description: "Clear weather conditions",
            icon: "☀️"
        };
    }

    if (code === 1 || code === 2) {
        return {
            condition: "Partly Cloudy",
            description: "Partly cloudy conditions",
            icon: "🌤️"
        };
    }

    if (code === 3) {
        return {
            condition: "Overcast",
            description: "Cloudy conditions",
            icon: "☁️"
        };
    }

    if (code === 45 || code === 48) {
        return {
            condition: "Fog",
            description: "Foggy conditions",
            icon: "🌫️"
        };
    }

    if (code === 51 || code === 53 || code === 55) {
        return {
            condition: "Drizzle",
            description: "Drizzle conditions",
            icon: "🌦️"
        };
    }

    if (code === 61 || code === 63 || code === 65) {
        return {
            condition: "Rain",
            description: "Rainy conditions",
            icon: "🌧️"
        };
    }

    if (code === 71 || code === 73 || code === 75 || code === 77) {
        return {
            condition: "Snow",
            description: "Snowy conditions",
            icon: "❄️"
        };
    }

    if (code === 80 || code === 81 || code === 82) {
        return {
            condition: "Rain Showers",
            description: "Rain shower conditions",
            icon: "🌦️"
        };
    }

    if (code === 85 || code === 86) {
        return {
            condition: "Snow Showers",
            description: "Snow shower conditions",
            icon: "🌨️"
        };
    }

    if (code === 95 || code === 96 || code === 99) {
        return {
            condition: "Thunderstorm",
            description: "Thunderstorm conditions",
            icon: "⛈️"
        };
    }

    return {
        condition: "Unknown",
        description: "Weather information unavailable",
        icon: "🌡️"
    };
}

//fetch + inspect real weather data from open-meteo.com

//-------------------------------------------------------------------
//Convert Wind Degrees → N, NE, E, etc.

function getWindDirection(degrees) {
    const directions = [
        "N",
        "NE",
        "E",
        "SE",
        "S",
        "SW",
        "W",
        "NW"
    ];

    const index =
        Math.round(degrees / 45) % 8;

    return directions[index];
}

//---------------------------------------------------------------------
//Format Sunrise and Sunset (5:42 AM)
function formatTime(dateTimeString) {
    const date = new Date(dateTimeString);  //JavaScript creates a date object that can be formatted.

    return date.toLocaleTimeString([], {  //turns it into a human-readable time.
        hour: "numeric",
        minute: "2-digit"
    });
}
//----------------------------------------------------------------------

// ==================== API FUNCTIONS ====================
// console.log(temperature); --test 
//------------------------------------------------------------------------------------

//API 
// async function getCoordinates(city) {
//     const geocodingURL =
//         `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;  
//         //encodeURIComponent(city) - encode the city name to handle special characters and spaces in the URL( converts user input into a URL-safe representation.)

//     const response = await fetch(geocodingURL);

//     const data = await response.json();

//     console.log(data);
// }

//extract coor & handlle invalid loc
async function getCoordinates(city) {
    const geocodingURL =
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

    // const response = await fetch(geocodingURL);

    // const data = await response.json();
    //ERROR HANDLING
    const response = await fetch(geocodingURL);

    if (!response.ok) {
        throw new Error("Failed to fetch location data.");
    }

    const data = await response.json();


    if (!data.results || data.results.length === 0) {  
        //res doesnt exist or res conatins zero locations
        //.len ==0 -> The results array exists, but contains zero locations.
        statusMessage.textContent = "Location not found. Please try again.";
        return;
    }

    const place = data.results[0];

    const latitude = place.latitude;
    const longitude = place.longitude;

    const cityName = place.name;
    const stateName = place.admin1;
    const countryName = place.country;


    return {
        latitude: latitude,
        longitude: longitude,
        city: cityName,
        state: stateName,
        country: countryName
    };
}

async function getWeather(latitude, longitude) {
    //1. Create the Weather API URL here
    const weatherURL =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,surface_pressure,visibility,wind_speed_10m,wind_direction_10m` +
        `&daily=sunrise,sunset` +
        `&timezone=auto`;
//the 2m indicates values referenced at approximately 2 metres above ground.

    // const response = await fetch(weatherURL);

    // const data = await response.json();

    //ERROR HANDLING
    //2. Send request to that URL
    const response = await fetch(weatherURL);

    // 3. Check whether request was successful
    if (!response.ok) {
        throw new Error("Failed to fetch weather data.");
    }

    // 4. Convert response to JSON
    const data = await response.json();

    // console.log(data);
 // 5. Return weather data
    return data; //return the real weather data to the caller(UI)
}

// ==================== WEATHER SEARCH EVENT ====================
//--------------------------------------------------------------------------------------------
// //Detect When the User Searches
// weatherForm.addEventListener("submit", function (event) {  //    <button type="submit">/ enter - sunmit , so not click event, but submit event
//     event.preventDefault(); //DO NOT reload like default behavior of form submission

//     console.log("Search form submitted!");
// });

//only know the form was submitted, but it doesn't know what the user typed.

//weatherForm.addEventListener("submit", function (event) {
//We need to get the object returned by getCoordinates() , Because getCoordinates() is asynchronous
weatherForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const city = locationInput.value.trim();  //city - again reuse trim value without rewriting repeatedly trim .

    if (city === "") {
        statusMessage.textContent = "Please enter a city or location.";
        return;
    }

    statusMessage.textContent = "Loading weather..."; //textContent - clear the status message if the input is valid

    //ERROR HANDLING
    try { 
    // getCoordinates(city);
        const location = await getCoordinates(city);
    //must finish 1st becuz 2nd function depends on the result of 1st function.(long+lat)

        if (!location) {
        return; //If geocoding failed, stop. Don't call the weather API.
        }

        const weatherData = await getWeather(
            location.latitude,
            location.longitude
        );
    //weatherData - contains entire weather api response, including current weather and daily data.

        const current = weatherData.current;

    //Put the weather condition into the webpage
        const weatherInfo =
            getWeatherInfo(current.weather_code);

        weatherIcon.textContent = weatherInfo.icon;

        weatherCondition.textContent =
            weatherInfo.condition;

        weatherDescription.textContent =
            weatherInfo.description;

//------------------------------------------------------------
    locationName.textContent = location.city; //instaed of deafult bbsr - returns user entered city name 
    
        locationDetails.textContent =
    `${location.state || ""}${location.state ? ", " : ""}${location.country}`; //o/p -> Odisha, India
    
        temperature.textContent =
    `${current.temperature_2m}°C`;  //29 (for ui) with real api data
        feelsLikeTemperature.textContent =
            `${current.apparent_temperature}°C`;

    //CARDS UPDATE
        humidity.textContent =
            `${current.relative_humidity_2m}%`;

        windSpeed.textContent =
            `${current.wind_speed_10m} km/h`;

    // windDirection.textContent =
    // `${current.wind_direction_10m}°`;  //0 N , 90 E , 180 S , 270 W
    //upd existing windDirection to show N, NE, E, etc. instead of degrees
        windDirection.textContent =
            getWindDirection(current.wind_direction_10m);

        pressure.textContent =
            `${current.surface_pressure} hPa`;

        cloudCover.textContent =
            `${current.cloud_cover}%`;

        visibility.textContent =
    `${(current.visibility / 1000).toFixed(1)} km`; //Keep one digit after the decimal point. 

    //display sunrise and sunset times
        sunrise.textContent =
            formatTime(weatherData.daily.sunrise[0]);

        sunset.textContent =
            formatTime(weatherData.daily.sunset[0]);

    //The [0] means: Use the first day's sunrise/sunset.

    // Remove loading message after success
        statusMessage.textContent = "";

    } catch (error) {
        console.error(error);

        statusMessage.textContent =
            "Unable to load weather. Please try again.";
    }

});

