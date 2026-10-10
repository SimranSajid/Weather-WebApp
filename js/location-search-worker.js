function createLocationSearch() {
let fileRequestId = 0;
const normalize = value => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const baseURL = new URL('data/locations/', typeof document === 'undefined' ? new URL('../', self.location.href) : document.baseURI);
let indexPromise;
const cityCache = new Map();

async function readJSON(file) {
    if (typeof document !== 'undefined' && location.protocol === 'file:') {
        return new Promise(function (resolve, reject) {
            const script = document.createElement('script');
            const key = 'locationData' + ++fileRequestId;
            window[key] = function (data) { delete window[key]; script.remove(); resolve(data); };
            script.src = new URL(file.replace(/\.json$/, '.js'), baseURL);
            script.dataset.callback = key;
            script.onerror = function () { delete window[key]; script.remove(); reject(new Error('Location data unavailable')); };
            document.head.append(script);
        });
    }
    const response = await fetch(new URL(file, baseURL));
    if (!response.ok) throw new Error('Location data unavailable');
    return response.json();
}

function loadIndex() {
    if (!indexPromise) {
        indexPromise = readJSON('index.json').then(function (data) {
            const countries = new Map(data.countries.map(row => [row[0], { id: row[0], name: row[1], code: row[2], type: 'country', key: normalize(row[1]) }]));
            const states = new Map(data.states.map(row => [row[0], { id: row[0], name: row[1], countryId: row[2], firstPrefix: row[3], type: 'state', key: normalize(row[1]) }]));
            return { ...data, countries, states };
        }).catch(function (error) { indexPromise = null; throw error; });
    }
    return indexPromise;
}

async function loadCities(index, letter) {
    const file = index.shards[letter];
    if (!file) return [];
    if (!cityCache.has(letter)) {
        if (cityCache.size >= 4) cityCache.delete(cityCache.keys().next().value);
        cityCache.set(letter, readJSON(file).catch(function (error) { cityCache.delete(letter); throw error; }));
    }
    return cityCache.get(letter);
}

function firstMatch(rows, query) {
    let low = 0, high = rows.length;
    while (low < high) {
        const middle = (low + high) >>> 1;
        if (rows[middle][0] < query) low = middle + 1;
        else high = middle;
    }
    return low;
}

function describe(place, index) {
    if (place.type === 'country') return { ...place, country: place.name };
    const state = place.type === 'state' ? place : index.states.get(place.stateId);
    const country = index.countries.get(state.countryId);
    return { ...place, countryId: country.id, country: country.name, admin1: state.name };
}

async function search(query, context) {
    const index = await loadIndex();
    const key = normalize(query);
    if (!key && !context) return [];
    const countries = context ? [] : [...index.countries.values()].filter(place => place.key.startsWith(key));
    const states = context?.type === 'state' ? [] : [...index.states.values()]
        .filter(place => (!context || place.countryId === context.id) && place.key.startsWith(key));
    const cities = [];
    if (context?.type !== 'country') {
        const prefix = key ? [...key][0] : index.states.get(context.id)?.firstPrefix;
        const rows = await loadCities(index, prefix);
        for (let i = firstMatch(rows, key); i < rows.length && cities.length < 12; i++) {
            const row = rows[i];
            if (!row[0].startsWith(key)) break;
            if (context && row[2] !== context.id) continue;
            cities.push({ type: 'city', key: row[0], name: row[1], stateId: row[2], latitude: row[3], longitude: row[4] });
        }
    }
    const groups = [countries, states, cities].map(group => group
        .sort((a, b) => Number(b.key === key) - Number(a.key === key) || a.name.localeCompare(b.name, 'en'))
        .slice(0, 12));
    const result = [];
    for (const exact of [true, false]) {
        const queues = groups.map(group => group.filter(place => (place.key === key) === exact));
        while (result.length < 12 && queues.some(queue => queue.length)) {
            for (const queue of queues) {
                if (queue.length && result.length < 12) result.push(queue.shift());
            }
        }
    }
    const categoryOrder = { country: 0, state: 1, city: 2 };
    return result.sort((a, b) => Number(b.key === key) - Number(a.key === key)
        || categoryOrder[a.type] - categoryOrder[b.type] || a.name.localeCompare(b.name, 'en'))
        .map(place => describe(place, index));
}

if (typeof document !== 'undefined') return search;
self.addEventListener('message', async function (event) {
    const { id, query, context } = event.data;
    const started = performance.now();
    try {
        const results = await search(query, context);
        self.postMessage({ id, results, elapsed: performance.now() - started });
    } catch {
        self.postMessage({ id, error: 'Location data could not be loaded. Manual search is still available.' });
    }
});

}
if (typeof document === 'undefined') createLocationSearch();
