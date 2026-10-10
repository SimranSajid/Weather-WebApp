# Weather WebApp

A responsive weather web application for searching cities around the world and viewing current weather using the Open-Meteo APIs.

## Overview

Built by Simran Sajid using HTML, CSS, and Vanilla JavaScript, this student project retrieves weather for a selected or manually searched location and updates the page dynamically.

```text
Countries States Cities Database → Location Search / Hierarchy → City Coordinates → Open-Meteo → Live Weather Display
```

The page initially shows sample weather values. Submit a city search to replace them with current data.

## Features

- Worldwide city/location search with current weather data.
- A “Use My Location” button for weather at browser-provided coordinates.
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

1. **[Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)** provides the fallback for manually submitted global searches without a selected local city record.
2. **[Open-Meteo Weather / Forecast API](https://open-meteo.com/en/docs)** retrieves current weather for those coordinates and daily sunrise/sunset data.

This project makes requests directly from the browser and does not require an API key in its current configuration.

## How It Works

1. Type from the first character to see up to 12 local Country, State / Province, and City suggestions. Exact names rank before prefixes, then results are arranged by category with alphabetical ordering within each category.
2. Select a city to request weather directly using its stored coordinates. Selecting a country instead shows its states; selecting a state shows only its cities. The small **Search worldwide** control clears this context, and direct city search remains available without selecting a country first.
3. Submitting an unchanged selected-city label reuses its coordinates. A manually typed global search retains the Open-Meteo geocoding fallback. Within a selected state, an exact city name is resolved from that state's data; unmatched context searches do not silently select a city elsewhere. Country/state selections refine search and never claim whole-region weather.
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
│   ├── location-search.js
│   ├── location-search-worker.js
│   └── script.js
├── data/locations/
│   ├── index.json
│   ├── cities/
│   ├── source.json
│   ├── LICENSE
│   └── README.md
├── scripts/build-location-data.cjs
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

3. Serve the project over HTTP/HTTPS using a local development server, such as VS Code Live Server, then search for a city such as Delhi or London. Autocomplete also works when opening `index.html` directly: it loads matching local script data on demand. HTTP/HTTPS uses a Web Worker for searching.

No package installation or build step is required to run the app. An internet connection is needed for live weather and manual geocoding fallback. Local autocomplete uses the bundled derived geographic data.

## Location Data and Performance

Autocomplete uses [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database), pinned to `v4.0-export.42` and its `json-countries+states+cities.json.gz` asset. The derived database retains 250 countries, 5,328 states, and 152,978 cities, linked by source IDs.

The original JSON is 53.10 MB expanded (3.72 MB compressed). The derived JSON files total 8.11 MB, divided into a 148.54 KB index and 50 prefix shards (largest 1.04 MB). Nothing is loaded on page startup: the index and relevant city prefix load on demand. On HTTP/HTTPS, parsing/search runs in a Web Worker with binary prefix lookup, a four-shard memory cache, and a 75ms debounce. Direct-file mode loads equivalent script data on demand and searches it on the main thread; both file formats are bundled (about 16.23 MB combined). The main page receives at most 12 compact suggestion objects.

For field definitions, exact bytes, source provenance, license, and reproducible generation instructions, see [data/locations/README.md](data/locations/README.md).

The optional development check is `node tests/location-search-check.cjs` (controlled weather responses) or `node tests/location-search-check.cjs --live` (real Open-Meteo requests). It uses Playwright and Chrome supplied by the development environment; `PLAYWRIGHT_MODULE` and `CHROME_PATH` can override their paths. Neither dependency is used by the deployed website.

## Theme Support

Dark mode is the default. The navbar button switches between dark and light modes: ☀️ switches to light, and 🌙 switches to dark.

The app stores `light` or `dark` under the localStorage key `theme`, restoring the theme and matching icon when the page opens again. If browser storage is unavailable, switching still works for the current page, but the preference cannot be saved.

## Use My Location

Click **📍 Use My Location** to request browser location permission and load weather at the returned coordinates. Location is requested only after a click, without continuous tracking. Run the app on HTTPS or a localhost development server for geolocation support.

Both city search and browser location use the same weather API function and display logic. The latest action takes precedence over older requests.

The app displays **Current Location** and the weather response's timezone. Open-Meteo's geocoding service does not offer a documented reverse-coordinate lookup, so this feature does not guess a city name or add another geocoding provider. Coordinates are not saved in localStorage.

Unsupported geolocation, denied permission, unavailable location, timeouts, and weather API failures display friendly status messages. Manual city search remains available afterward.

## Error Handling

- **Empty search:** “Please enter a city or location.”
- **No matching location:** “Location not found. Please try again.”
- **Loading:** “Loading weather...”
- **API/network failure:** “Unable to load weather. Please try again.”

Both API functions check HTTP response status. The search handler catches failures, displays the error message, and logs the error to the console.

## Future Improvements

Possible future additions include hourly and multi-day forecast displays, search history, favorite locations, and deployment. These are not implemented yet.

## Author

**Simran Sajid** — [GitHub](https://github.com/SimranSajid)

## Acknowledgements

Weather and geocoding services are provided by [Open-Meteo](https://open-meteo.com/). Open-Meteo's geocoding data is based on [GeoNames](https://www.geonames.org/).

Local geographic search contains information from [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database), maintained by dr5hn and contributors, available under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The derived database is distributed under the same license, with a copy in [data/locations/LICENSE](data/locations/LICENSE). This licensing applies to the geographic database separately from application code.

## License

No LICENSE file currently exists. A project license has not yet been selected.
