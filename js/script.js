// ==================== DOM ELEMENT SELECTIONS ====================
const weatherForm = document.querySelector("#weather-form");
const locationInput = document.querySelector("#location-input");
const statusMessage = document.querySelector("#status-message");
const locationButton = document.querySelector("#use-location-button");

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
const menuToggle = document.querySelector("#menu-toggle");
const navigation = document.querySelector("#mobile-navigation");
const navbar = document.querySelector(".navbar");

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

    if (code === 1) {
        return {
            condition: "Mainly Clear",
            description: "Mainly clear weather conditions",
            icon: "🌤️"
        };
    }

    if (code === 2) {
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
    // Keep the API's location-local clock independent of the computer's DST rules.
    dateTimeString += "Z";
    const date = new Date(dateTimeString);  //JavaScript creates a date object that can be formatted.

    return date.toLocaleTimeString([], {  //turns it into a human-readable time.
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC"
    });
}
//----------------------------------------------------------------------

// ==================== WEATHER DISPLAY ====================
function updateWeatherUI(location, weatherData) {
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
    if (location.details) {
        locationDetails.textContent = location.details;
    }

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
    animateWeatherUpdate();
    scrollToCurrentWeather();
}

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
        return;
    }

    const place = data.results[0];

    const latitude = place.latitude;
    const longitude = place.longitude;

    const cityName = place.name;
    const stateName = place.admin1;
    const countryName = place.country || "Unknown country";


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
let latestSearchId = 0;

weatherForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    closeSuggestions();
    const searchId = ++latestSearchId;

    const city = locationInput.value.trim();  //city - again reuse trim value without rewriting repeatedly trim .

    if (city === "") {
        statusMessage.textContent = "Please enter a city or location.";
        return;
    }

    statusMessage.textContent = "Loading weather..."; //textContent - clear the status message if the input is valid

    //ERROR HANDLING
    try { 
    // getCoordinates(city);
        const location = await resolveSearchLocation(city);
    //must finish 1st becuz 2nd function depends on the result of 1st function.(long+lat)

        if (searchId !== latestSearchId) {
            return;
        }

        if (!location) {
            statusMessage.textContent = "Location not found. Please try again.";
        return; //If geocoding failed, stop. Don't call the weather API.
        }

        const weatherData = await getWeather(
            location.latitude,
            location.longitude
        );
    //weatherData - contains entire weather api response, including current weather and daily data.

        if (searchId !== latestSearchId) {
            return;
        }
        updateWeatherUI(location, weatherData);

    } catch (error) {
        if (searchId !== latestSearchId) {
            return;
        }
        console.error(error);

        statusMessage.textContent =
            "Unable to load weather. Please try again.";
    }

});

// ==================== AUTOCOMPLETE ====================
const suggestionsList = document.querySelector("#location-suggestions");
const suggestionsStatus = document.querySelector("#suggestions-status");
const locationContext = document.querySelector("#location-context");
const contextLabel = document.querySelector("#location-context-label");
const resetContextButton = document.querySelector("#reset-location-context");
let suggestionTimer;
let suggestionController;
let suggestionRequestId = 0;
let suggestions = [];
let activeSuggestion = -1;
let searchContext = null;
let selectedCity = null;

function closeSuggestions() {
    clearTimeout(suggestionTimer);
    suggestionController?.abort();
    suggestionRequestId++;
    suggestions = [];
    activeSuggestion = -1;
    suggestionsList.replaceChildren();
    suggestionsList.hidden = true;
    locationInput.setAttribute("aria-expanded", "false");
    locationInput.removeAttribute("aria-activedescendant");
    suggestionsStatus.textContent = "";
}

function locationLabel(place) {
    const parts = place.type === "country" ? [place.name]
        : place.type === "state" ? [place.name, place.country]
        : [place.name, place.admin1, place.country];
    return parts.filter(Boolean).join(", ");
}

function normalizeLocationName(name) {
    return name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function showSuggestions(places) {
    suggestions = places;
    suggestionsList.replaceChildren();
    suggestions.forEach(function (place, index) {
        const option = document.createElement("li");
        option.id = `location-option-${index}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.dataset.index = index;
        const label = document.createElement("span");
        label.textContent = locationLabel(place);
        const category = document.createElement("small");
        category.className = "suggestion-category";
        category.textContent = place.type === "country" ? "Country" : place.type === "state" ? "State / Province" : "City";
        option.append(label, category);
        suggestionsList.append(option);
    });
    if (suggestions.length) {
        const credit = document.createElement("li");
        credit.className = "suggestions-credit";
        credit.setAttribute("role", "presentation");
        const source = document.createElement("a");
        source.href = "https://github.com/dr5hn/countries-states-cities-database";
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        source.textContent = "Countries States Cities Database";
        const license = document.createElement("a");
        license.href = "data/locations/LICENSE";
        license.target = "_blank";
        license.rel = "noopener noreferrer";
        license.textContent = "ODbL 1.0";
        credit.append(source, " · ", license);
        suggestionsList.append(credit);
    }
    suggestionsList.hidden = suggestions.length === 0;
    locationInput.setAttribute("aria-expanded", String(suggestions.length > 0));
    suggestionsStatus.textContent = `${suggestions.length} location suggestions available.`;
}

function updateSearchContext(place) {
    searchContext = place ? { type: place.type, id: place.id } : null;
    selectedCity = null;
    locationContext.hidden = !place;
    contextLabel.textContent = place ? (place.type === "country" ? `States in ${place.name}` : `Cities in ${place.name}, ${place.country}`) : "";
    locationInput.placeholder = place ? (place.type === "country" ? "Search a state or province..." : "Search a city...") : "Search city or location...";
    locationInput.value = "";
    locationInput.focus();
    requestSuggestions({ isComposing: false });
}

resetContextButton.addEventListener("click", function () {
    updateSearchContext(null);
});

function requestSuggestions(event) {
    closeSuggestions();
    selectedCity = null;
    const query = locationInput.value.trim();
    if ((!query && !searchContext) || event.isComposing) return;
    const requestId = suggestionRequestId;
    suggestionsStatus.textContent = "Searching locations...";
    suggestionTimer = setTimeout(async function () {
        suggestionController = new AbortController();
        try {
            const places = await searchLocalLocations(query, searchContext, suggestionController.signal);
            if (requestId !== suggestionRequestId) return;
            showSuggestions(places);
        } catch (error) {
            if (requestId !== suggestionRequestId || error.name === "AbortError") return;
            closeSuggestions();
            suggestionsStatus.textContent = "Location suggestions unavailable. You can still search manually.";
        }
    }, 75);
}

locationInput.addEventListener("input", requestSuggestions);
locationInput.addEventListener("compositionend", requestSuggestions);

function cityLocation(place) {
    return { latitude: place.latitude, longitude: place.longitude, city: place.name, state: place.admin1, country: place.country };
}

async function resolveSearchLocation(query) {
    if (selectedCity && query === locationLabel(selectedCity)) return cityLocation(selectedCity);
    if (searchContext) {
        const places = await searchLocalLocations(query, searchContext);
        const city = places.find(place => place.type === "city" && normalizeLocationName(place.name) === normalizeLocationName(query));
        return city ? cityLocation(city) : null;
    }
    return getCoordinates(query);
}

async function selectSuggestion(index) {
    const place = suggestions[index];
    if (!place) return;
    closeSuggestions();
    if (place.type !== "city") {
        latestSearchId++;
        statusMessage.textContent = "";
        updateSearchContext(place);
        return;
    }
    selectedCity = place;
    locationInput.value = locationLabel(place);
    locationInput.focus();
    const searchId = ++latestSearchId;
    statusMessage.textContent = "Loading weather...";
    try {
        const data = await getWeather(place.latitude, place.longitude);
        if (searchId !== latestSearchId) return;
        updateWeatherUI(cityLocation(place), data);
    } catch (error) {
        if (searchId !== latestSearchId) return;
        console.error(error);
        statusMessage.textContent = "Unable to load weather. Please try again.";
    }
}

locationInput.addEventListener("keydown", function (event) {
    if (event.isComposing) return;
    if (event.key === "Escape") {
        closeSuggestions();
    } else if (!suggestionsList.hidden && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        activeSuggestion = event.key === "ArrowDown"
            ? (activeSuggestion + 1) % suggestions.length
            : (activeSuggestion < 0 ? suggestions.length - 1 : (activeSuggestion - 1 + suggestions.length) % suggestions.length);
        [...suggestionsList.querySelectorAll("[role='option']")].forEach(function (option, index) {
            option.setAttribute("aria-selected", String(index === activeSuggestion));
        });
        const option = suggestionsList.children[activeSuggestion];
        locationInput.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
        event.preventDefault();
        selectSuggestion(activeSuggestion);
    }
});

suggestionsList.addEventListener("click", function (event) {
    const option = event.target.closest("[role='option']");
    if (option) selectSuggestion(Number(option.dataset.index));
});

suggestionsList.addEventListener("pointerdown", function (event) {
    if (event.target.closest("[role='option'], .suggestions-credit a")) event.preventDefault();
});

weatherForm.addEventListener("focusout", function (event) {
    if (!weatherForm.contains(event.relatedTarget)) closeSuggestions();
});

document.addEventListener("click", function (event) {
    if (!event.composedPath().includes(weatherForm)) closeSuggestions();
});

// ==================== MOBILE NAVIGATION ====================
const mobileNavigation = window.matchMedia("(max-width: 480px)");

function setMenuOpen(isOpen) {
    isOpen = isOpen && mobileNavigation.matches;
    navbar.classList.toggle("nav-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
    document.querySelector("main").inert = isOpen;
    document.querySelector("footer").inert = isOpen;
    document.querySelector(".brand").inert = isOpen;
    if (isOpen) closeSuggestions();
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    navigation.inert = mobileNavigation.matches && !isOpen;
}

menuToggle.addEventListener("click", function () {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

navigation.addEventListener("click", function (event) {
    if (mobileNavigation.matches && event.target.closest("a")) {
        setMenuOpen(false);
        menuToggle.focus();
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Tab" && menuToggle.getAttribute("aria-expanded") === "true") {
        const controls = [menuToggle, ...navigation.querySelectorAll("a"), themeToggle];
        const index = controls.indexOf(document.activeElement);
        event.preventDefault();
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
    }
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false);
        menuToggle.focus();
    }
});

document.addEventListener("click", function (event) {
    if (!navbar.contains(event.target) || event.target.closest(".menu-overlay")) {
        setMenuOpen(false);
        if (event.target.closest(".menu-overlay")) menuToggle.focus();
    }
});

mobileNavigation.addEventListener("change", function () {
    if (mobileNavigation.matches && navigation.contains(document.activeElement)) {
        menuToggle.focus();
    }
    if (!mobileNavigation.matches && document.activeElement === menuToggle) {
        themeToggle.focus();
    }
    setMenuOpen(false);
});

setMenuOpen(false);

// ==================== CURRENT LOCATION ====================
locationButton.addEventListener("click", function () {
    closeSuggestions();
    const searchId = ++latestSearchId;

    if (!navigator.geolocation) {
        statusMessage.textContent = "Geolocation is not supported by your browser.";
        return;
    }

    if (!window.isSecureContext) {
        statusMessage.textContent = "Geolocation requires HTTPS or localhost.";
        return;
    }

    statusMessage.textContent = "Getting your location...";

    try {
        navigator.geolocation.getCurrentPosition(
            async function (position) {
                if (searchId !== latestSearchId) {
                    return;
                }

                statusMessage.textContent = "Loading weather...";
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                try {
                    const weatherData = await getWeather(latitude, longitude);
                    if (searchId !== latestSearchId) {
                        return;
                    }

                    updateWeatherUI({
                        city: "Current Location",
                        country: "",
                        details: weatherData.timezone
                            ? `Time zone: ${weatherData.timezone.replace(/_/g, " ")}`
                            : "Browser-provided location"
                    }, weatherData);
                } catch (error) {
                    if (searchId !== latestSearchId) {
                        return;
                    }
                    console.error(error);
                    statusMessage.textContent = "Unable to load weather. Please try again.";
                }
            },
            function (error) {
                if (searchId !== latestSearchId) {
                    return;
                }

                const messages = {
                    1: "Location permission was denied.",
                    2: "Your location is currently unavailable.",
                    3: "Location request timed out. Please try again."
                };
                statusMessage.textContent = messages[error.code] || "Unable to get your location.";
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    } catch {
        statusMessage.textContent = "Unable to get your location.";
    }
});

// ==================== THEME INITIALIZATION ====================
// Restore the preference before the user interacts with the toggle.
let savedTheme = null;
try {
    savedTheme = localStorage.getItem("theme");
} catch {
    // Keep the default dark theme if browser storage is unavailable.
}

document.body.classList.toggle("light-theme", savedTheme === "light");
syncThemeToggle();

function syncThemeToggle() {
    const isLightTheme = document.body.classList.contains("light-theme");
    themeToggle.setAttribute("aria-label", isLightTheme ? "Switch to dark mode" : "Switch to light mode");
    themeToggle.setAttribute("aria-pressed", String(isLightTheme));
}

// ==================== THEME TOGGLE ====================
themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("light-theme");

    const isLightTheme =
        document.body.classList.contains("light-theme");

    syncThemeToggle();

    try {
        localStorage.setItem("theme", isLightTheme ? "light" : "dark");
    } catch {
        // Theme switching still works if the preference cannot be saved.
    }
});

// ==================== SCROLL REVEALS ====================
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const weatherSection = document.querySelector("#weather");
let weatherAnimationId = 0;
let revealObserver;

function scrollToCurrentWeather() {
    closeSuggestions();
    setMenuOpen(false);
    weatherSection.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start"
    });
}

function animateWeatherUpdate() {
    weatherSection.classList.remove("weather-busy", "weather-refresh");
    const animationId = ++weatherAnimationId;
    if (reducedMotion.matches) return;
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            if (animationId === weatherAnimationId && !reducedMotion.matches) {
                weatherSection.classList.add("weather-refresh");
            }
        });
    });
}

weatherSection.addEventListener("animationend", function (event) {
    if (event.target.matches(".weather-main") && event.animationName === "weather-change") {
        weatherSection.classList.remove("weather-refresh");
    }
});

const statusObserver = new MutationObserver(function () {
    weatherSection.classList.toggle("weather-busy", statusMessage.textContent === "Loading weather...");
    statusMessage.classList.remove("status-reveal");
    if (statusMessage.textContent && !reducedMotion.matches) {
        requestAnimationFrame(function () { statusMessage.classList.add("status-reveal"); });
    }
});
statusObserver.observe(statusMessage, { childList: true });

function revealElement(element) {
    element.classList.add("reveal-visible");
    revealObserver?.unobserve(element);
}

document.addEventListener("transitionend", function (event) {
    if (event.propertyName === "opacity" && event.target.classList.contains("reveal-visible")) {
        event.target.classList.add("reveal-settled");
    }
});

const revealElements = document.querySelectorAll(
    ".weather-section .section-heading, .weather-card, .detail-card, .about-container, .footer-container"
);

try {
    if (!reducedMotion.matches && "IntersectionObserver" in window) {
        revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) revealElement(entry.target);
            });
        }, { threshold: 0.08 });
        document.querySelectorAll(".detail-card").forEach(function (card, index) {
            card.classList.add(`stagger-${index}`);
        });
        revealElements.forEach(function (element) {
            element.classList.add("reveal");
            revealObserver.observe(element);
        });
    }
    document.body.classList.add("motion-ready");
} catch {
    revealElements.forEach(revealElement);
}

document.addEventListener("focusin", function (event) {
    const reveal = event.target.closest(".reveal");
    if (reveal) revealElement(reveal);
});

reducedMotion.addEventListener("change", function () {
    if (reducedMotion.matches) {
        weatherAnimationId++;
        revealObserver?.disconnect();
        revealElements.forEach(revealElement);
        weatherSection.classList.remove("weather-refresh");
        statusMessage.classList.remove("status-reveal");
    }
});
