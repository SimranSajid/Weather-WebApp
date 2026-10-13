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
- Local day/night weather videos, preloaded and blended independently of weather rendering, with theme overlays and static reduced-motion support.

## Tech Stack

- HTML5 and CSS3
- Vanilla JavaScript and the Fetch API
- Open-Meteo APIs
- Browser localStorage

## APIs Used

1. **[Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)** provides the fallback for manually submitted global searches without a selected local city record.
2. **[Open-Meteo Weather / Forecast API](https://open-meteo.com/en/docs)** retrieves current weather for those coordinates and daily sunrise/sunset data.
3. **[Photon reverse geocoding](https://github.com/komoot/photon)** resolves browser geolocation coordinates into place names using OpenStreetMap data. Open-Meteo forecasts contain no city/region/country fields. The lookup uses `features[].properties.city` (or `name` for a city/town/village/locality), `state`, and `country`; failure displays the actual coordinates while retaining useful weather. No city is inferred from the weather timezone. Manual geocoding uses Open-Meteo `name`, `admin1`, and `country`; autocomplete uses the local database. All paths share one formatter that removes empty and duplicate parts.

This project makes requests directly from the browser and does not require an API key in its current configuration.

## How It Works

1. Type from the first character to see up to 12 local Country, State / Province, and City suggestions. Exact names rank before prefixes, then results are arranged by category with alphabetical ordering within each category.
2. Select a city to request weather directly using its stored coordinates. Selecting a country instead shows its states; selecting a state shows only its cities. The small **Search worldwide** control clears this context, and direct city search remains available without selecting a country first.
3. Submitting an unchanged selected-city label reuses its coordinates. A manually typed global search retains the Open-Meteo geocoding fallback. Within a selected state, an exact city name is resolved from that state's data; unmatched context searches do not silently select a city elsewhere. Country/state selections refine search and never claim whole-region weather.
4. The coordinates are sent to the weather API.
5. JavaScript maps weather codes to conditions and icons, formats the returned values, and updates the page.
6. The loading message clears on success; unsuccessful searches show a status message.
7. Independently, switching themes saves the selected preference in localStorage.

Current Weather icons share the video system's numeric category mapping and use the same weather response's `current.is_day`. Clear day/night uses ☀️/🌙, partly cloudy day/night uses 🌤️/☁️, overcast uses ☁️, rain/heavy rain uses 🌧️, thunderstorm uses ⛈️, snow uses ❄️, fog uses 🌫️, and unknown codes use 🌡️. Neither temperature, theme, nor the browser clock chooses an icon. Run `node tests/weather-location-icon-check.cjs` for focused geolocation/name formatting and icon/video consistency checks.

## Project Structure

```text
Weather-WebApp/
├── assets/
│   └── Videos/
├── css/
│   └── style.css
├── js/
│   ├── location-search.js
│   ├── location-search-worker.js
│   ├── weather-background.js
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

Weather icons are emoji rendered by JavaScript; the theme toggle uses inline SVGs.

## Dynamic Weather Background

`js/weather-background.js` owns the video mapping, loading, playback, and transition lifecycle. The existing successful weather render calls `WeatherBackground.update(current)` without awaiting media loading. Open-Meteo's `current.weather_code` selects the category; the newly requested `current.is_day` selects the searched location's day/night clip. After a successful result, theme changes only update a CSS overlay and never reload media or weather.

Mapping follows the [Open-Meteo WMO code documentation](https://open-meteo.com/en/docs): clear 0/1, partly cloudy 2, cloudy 3, fog 45/48, rain 51/53/55/56/57/61/63/66/80/81, heavy rain 65/67/82, snow 71/73/75/77/85/86, thunderstorm 95/96/97/99, and default for other codes. Freezing precipitation uses the matching rain intensity category. Missing `is_day` preserves the current background rather than guessing from the computer clock.

All paths below are relative to `assets/Videos/`; spaces and filename case are intentional.

| Category | Day file | Night file |
| --- | --- | --- |
| clear | `clear/clear day sky.mp4` | `clear/clear night sky.mp4` |
| partly cloudy | `partly cloudy/partly cloudy sky.mp4` | `partly cloudy/partly cloudy night.mp4` |
| cloudy | `cloudy/cloudy day sky (1).mp4` | `cloudy/cloudy day sky (2).mp4` |
| rain | `rain/rainy at day.mp4` | `rain/rain at night.mp4` |
| heavy rain | `heavy rain/heavy rain day.mp4` | `heavy rain/heavy rain night.mp4` |
| thunderstorm | `thunderstorm/thunderstorm day.mp4` | `thunderstorm/thunderstorm night.mp4` |
| snow | `snow/snowfall daytime.mp4` | `snow/snowfall night.mp4` |
| fog | `fog/foggy day.mp4` | `fog/foggy night.mp4` |
| default | `default/default day.mp4` | `default/default night.mp4` |

The cloudy `(2)` clip shows moonlit clouds despite its daytime filename; it is intentionally used for night. No assets are renamed or replaced.

Two muted, looping, inline videos cover the viewport behind all content. The next clip waits for decoded data and successful playback before a one-second blend. Keeping the previous clip opaque underneath prevents a flash of the static background. The outgoing clip is then paused and unloaded. Only current/next clips load, and superseded media requests are cancelled. Weather updates retain the existing search request guard and the background uses a separate version guard to prevent stale video loads.

Loading/decoding/playback failure tries the matching default day/night video, then clears both video elements to reveal the existing theme background color. Failures log development warnings without affecting weather errors. Before a successful weather result, the saved/current light theme selects default day and dark selects default night; toggling themes crossfades these defaults using the same media lifecycle. After a successful result, only API weather/daylight selects the video and theme changes affect only the overlay. This state resets on refresh because weather results are not persisted. Reduced-motion mode cancels media loading and playback; disabling it restores the last successful weather video or the current theme's default. Hidden tabs pause playback.

Dark overlay: `rgba(34, 40, 49, 0.20)`; light overlay: `rgba(238, 238, 238, 0.10)`. Overlay changes take 400ms, using the existing palette. Hero/section text uses local translucent backings for contrast; weather cards use controlled transparency and backdrop blur. About's page-level background is transparent. Navbar, search controls, and footer retain their readable surfaces. Active videos remain at full opacity, with no brightness or blur filter on the media.

Run `node tests/video-background-check.cjs` with the same Playwright/Chrome prerequisites as the other browser tests. It serves local files with byte-range support, verifies all 18 real clips and exact path case, and exercises category mapping, themes, crossfades, media failures, races, reduced motion, and responsive layouts. Weather responses and failure cases are controlled fixtures; media playback uses the actual assets. The existing `node tests/location-search-check.cjs --live` also checks real Open-Meteo requests.

## Getting Started

The original MP4 assets are tracked with Git LFS, including a default-day clip larger than GitHub's normal file limit. Install Git LFS before cloning, then run `git lfs pull` inside the checkout to retrieve the actual videos if needed. GitHub Pages does not serve Git LFS files directly; future deployment must use a build/host that retrieves LFS media or publish the media separately. See [GitHub's Git LFS documentation](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage).

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
