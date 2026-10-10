// Local data is fetched and searched away from the page's rendering thread.
let fileSearchPromise;
function searchFileLocations(query, context, signal) {
    if (!fileSearchPromise) {
        fileSearchPromise = new Promise(function (resolve, reject) {
            const script = document.createElement('script');
            script.src = 'js/location-search-worker.js';
            script.onload = function () { script.remove(); resolve(createLocationSearch()); };
            script.onerror = function () { script.remove(); fileSearchPromise = null; reject(new Error('Local location search unavailable')); };
            document.head.append(script);
        });
    }
    return fileSearchPromise.then(search => {
        if (signal?.aborted) throw new DOMException('Search cancelled', 'AbortError');
        return search(query, context);
    });
}
let locationWorker;
let locationRequestId = 0;
const locationRequests = new Map();

function searchLocalLocations(query, context, signal) {
    if (location.protocol === 'file:') return searchFileLocations(query, context, signal);
    return new Promise(function (resolve, reject) {
        if (!locationWorker) {
            locationWorker = new Worker('js/location-search-worker.js');
            locationWorker.addEventListener('message', function (event) {
                const pending = locationRequests.get(event.data.id);
                if (!pending) return;
                pending.cleanup();
                if (event.data.error) pending.reject(new Error(event.data.error));
                else pending.resolve(event.data.results);
            });
            locationWorker.addEventListener('error', function () {
                for (const pending of [...locationRequests.values()]) {
                    pending.cleanup();
                    pending.reject(new Error('Local location search unavailable'));
                }
                locationWorker.terminate();
                locationWorker = null;
            });
        }
        const id = ++locationRequestId;
        function cleanup() {
            locationRequests.delete(id);
            signal?.removeEventListener('abort', abort);
        }
        function abort() {
            cleanup();
            reject(new DOMException('Search cancelled', 'AbortError'));
        }
        if (signal?.aborted) return abort();
        locationRequests.set(id, { resolve, reject, cleanup });
        signal?.addEventListener('abort', abort, { once: true });
        locationWorker.postMessage({ id, query, context });
    });
}
