# Weather WebApp

A responsive weather web application for searching cities around the world and viewing current weather using the Open-Meteo APIs.

## Overview

Built by Simran Sajid using HTML, CSS, and Vanilla JavaScript, this student project retrieves weather for the first location matched by a search and updates the page dynamically.

```text
City Search → Geocoding API → Latitude & Longitude → Weather API → Live Weather Display
```

The page initially shows sample weather values. Submit a city search to replace them with current data.

## Features

- Worldwide city/location search with current weather data.
- Temperature and feels-like temperature in °C.
- Humidity, wind speed in km/h, and compass wind direction.
- Surface pressure in hPa, visibility in km, and cloud cover.
- Sunrise and sunset times.
- Weather conditions, descriptions, and dynamic emoji icons.
- Loading messages, empty-input validation, invalid-location handling, and API/network error handling.
- Responsive layouts for desktop, tablet, and mobile.
- Dark and light modes with immediate, single-click switching and smooth visual transitions.
- Theme preference saved using browser localStorage and restored after refresh.

## Tech Stack

- HTML5 and CSS3
- Vanilla JavaScript and the Fetch API
- Open-Meteo APIs
- Browser localStorage

## APIs Used

1. **[Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)** converts a location name into latitude and longitude, along with its city, region, and country.
2. **[Open-Meteo Weather / Forecast API](https://open-meteo.com/en/docs)** retrieves current weather for those coordinates and daily sunrise/sunset data.

This project makes requests directly from the browser and does not require an API key in its current configuration.

## How It Works

1. Enter a city or location and submit the search form.
2. JavaScript trims the input and checks that it is not empty.
3. The Geocoding API returns the first matching location and its coordinates.
4. The coordinates are sent to the weather API.
5. JavaScript maps weather codes to conditions and icons, formats the returned values, and updates the page.
6. The loading message clears on success; unsuccessful searches show a status message.
7. Independently, switching themes saves the selected preference in localStorage.

## Project Structure

```text
Weather-WebApp/
├── assets/
│   ├── icons
│   └── images
├── css/
│   └── style.css
├── js/
│   └── script.js
├── .gitignore
├── index.html
└── README.md
```

`assets/icons` and `assets/images` are currently empty placeholder files. Weather icons are emoji rendered by JavaScript.

## Getting Started

1. Clone the repository:

   ```sh
   git clone https://github.com/SimranSajid/Weather-WebApp.git
   ```

2. Enter the project directory:

   ```sh
   cd Weather-WebApp
   ```

3. Open `index.html` in a modern browser, then search for a city such as Delhi or London.

You can also serve the folder with a local development server, such as VS Code Live Server. No package installation or build step is required. An internet connection is needed for weather searches.

## Theme Support

Dark mode is the default. The navbar button switches between dark and light modes: ☀️ switches to light, and 🌙 switches to dark.

The app stores `light` or `dark` under the localStorage key `theme`, restoring the theme and matching icon when the page opens again. If browser storage is unavailable, switching still works for the current page, but the preference cannot be saved.

## Error Handling

- **Empty search:** “Please enter a city or location.”
- **No matching location:** “Location not found. Please try again.”
- **Loading:** “Loading weather...”
- **API/network failure:** “Unable to load weather. Please try again.”

Both API functions check HTTP response status. The search handler catches failures, displays the error message, and logs the error to the console.

## Future Improvements

Possible future additions include browser geolocation, hourly and multi-day forecast displays, search history, favorite locations, and deployment. These are not implemented yet.

## Author

**Simran Sajid** — [GitHub](https://github.com/SimranSajid)

## Acknowledgements

Weather and geocoding services are provided by [Open-Meteo](https://open-meteo.com/). Open-Meteo's geocoding data is based on [GeoNames](https://www.geonames.org/).

## License

No LICENSE file currently exists. A project license has not yet been selected.
