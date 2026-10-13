// Local decorative videos use Open-Meteo's WMO codes and location-specific is_day.
const WeatherBackground = (() => {
    const weatherVideos = Object.freeze({
        clear: { day: 'assets/Videos/clear/clear day sky.mp4', night: 'assets/Videos/clear/clear night sky.mp4' },
        'partly cloudy': { day: 'assets/Videos/partly cloudy/partly cloudy sky.mp4', night: 'assets/Videos/partly cloudy/partly cloudy night.mp4' },
        // The second clip shows moonlit clouds despite its daytime filename.
        cloudy: { day: 'assets/Videos/cloudy/cloudy day sky (1).mp4', night: 'assets/Videos/cloudy/cloudy day sky (2).mp4' },
        rain: { day: 'assets/Videos/rain/rainy at day.mp4', night: 'assets/Videos/rain/rain at night.mp4' },
        'heavy rain': { day: 'assets/Videos/heavy rain/heavy rain day.mp4', night: 'assets/Videos/heavy rain/heavy rain night.mp4' },
        thunderstorm: { day: 'assets/Videos/thunderstorm/thunderstorm day.mp4', night: 'assets/Videos/thunderstorm/thunderstorm night.mp4' },
        snow: { day: 'assets/Videos/snow/snowfall daytime.mp4', night: 'assets/Videos/snow/snowfall night.mp4' },
        fog: { day: 'assets/Videos/fog/foggy day.mp4', night: 'assets/Videos/fog/foggy night.mp4' },
        default: { day: 'assets/Videos/default/default day.mp4', night: 'assets/Videos/default/default night.mp4' }
    });

    function getWeatherCategory(code) {
        if (code === 0 || code === 1) return 'clear';
        if (code === 2) return 'partly cloudy';
        if (code === 3) return 'cloudy';
        if (code === 45 || code === 48) return 'fog';
        if ([51, 53, 55, 56, 57, 61, 63, 66, 80, 81].includes(code)) return 'rain';
        if ([65, 67, 82].includes(code)) return 'heavy rain';
        if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
        if ([95, 96, 97, 99].includes(code)) return 'thunderstorm';
        return 'default';
    }

    function getWeatherVideo(code, isDay) {
        // Never infer the searched city's daylight from the computer or theme.
        if (isDay !== 0 && isDay !== 1) return null;
        return weatherVideos[getWeatherCategory(code)][isDay === 1 ? 'day' : 'night'];
    }

    const container = document.querySelector('.weather-background');
    const videos = [...container.querySelectorAll('video')];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let activeVideo = null;
    let activePath = null;
    let lastWeather = null;
    let hasWeatherResult = false;
    let version = 0;
    let loadingController = null;
    let fading = Promise.resolve();

    function releaseVideo(video) {
        video.pause();
        video.classList.remove('is-visible');
        video.removeAttribute('src');
        video.preload = 'none';
        video.load();
    }

    function useStaticBackground() {
        videos.forEach(releaseVideo);
        activeVideo = null;
        activePath = null;
        container.classList.remove('has-video');
    }

    function preloadWeatherVideo(video, path, signal) {
        releaseVideo(video);
        video.muted = true;
        video.defaultMuted = true;
        video.preload = 'auto';
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                clearTimeout(timeout);
                video.removeEventListener('loadeddata', ready);
                video.removeEventListener('canplay', ready);
                video.removeEventListener('error', failed);
                signal.removeEventListener('abort', aborted);
            };
            const ready = () => {
                if (video.readyState < 2) return;
                cleanup();
                resolve();
            };
            const failed = () => { cleanup(); reject(new Error('Video could not load or decode')); };
            const aborted = () => { cleanup(); reject(new DOMException('Background superseded', 'AbortError')); };
            // A deadline handles stalled connections; readiness is event-driven.
            const timeout = setTimeout(() => { cleanup(); reject(new Error('Video load timed out')); }, 15000);
            video.addEventListener('loadeddata', ready);
            video.addEventListener('canplay', ready);
            video.addEventListener('error', failed);
            signal.addEventListener('abort', aborted, { once: true });
            video.src = path;
            video.load();
            if (signal.aborted) aborted();
        });
    }

    function playWeatherVideo(video, signal) {
        return new Promise((resolve, reject) => {
            const aborted = () => { cleanup(); reject(new DOMException('Background superseded', 'AbortError')); };
            const cleanup = () => {
                clearTimeout(timeout);
                signal.removeEventListener('abort', aborted);
            };
            const timeout = setTimeout(() => { cleanup(); reject(new Error('Video playback timed out')); }, 10000);
            signal.addEventListener('abort', aborted, { once: true });
            // Catch autoplay policy / codec rejections without affecting weather UI.
            Promise.resolve(video.play()).then(() => { cleanup(); resolve(); }, error => { cleanup(); reject(error); });
            if (signal.aborted) aborted();
        });
    }

    function crossfadeWeatherVideo(nextVideo, path) {
        const previousVideo = activeVideo;
        // Keep the previous layer opaque underneath until the new layer covers it.
        // Fading both layers simultaneously would expose the static background.
        if (previousVideo) previousVideo.style.zIndex = '0';
        nextVideo.style.zIndex = '1';
        activeVideo = nextVideo;
        activePath = path;
        container.classList.add('has-video');
        void nextVideo.offsetWidth;
        nextVideo.classList.add('is-visible');
        return new Promise(resolve => {
            const finish = () => {
                clearTimeout(deadline);
                nextVideo.removeEventListener('transitionend', ended);
                if (previousVideo && previousVideo !== activeVideo) releaseVideo(previousVideo);
                resolve();
            };
            const ended = event => {
                if (event.target === nextVideo && event.propertyName === 'opacity') finish();
            };
            nextVideo.addEventListener('transitionend', ended);
            // Backup for hidden tabs where transitionend may not be dispatched.
            const deadline = setTimeout(finish, 1300);
        });
    }

    async function updateWeatherBackground(current, failedPath = null) {
        lastWeather = { weather_code: current.weather_code, is_day: current.is_day };
        const requestVersion = ++version;
        if (loadingController) {
            loadingController.abort();
            videos.filter(video => video !== activeVideo).forEach(releaseVideo);
        }
        loadingController = null;
        const path = getWeatherVideo(current.weather_code, current.is_day);
        if (motion.matches) { useStaticBackground(); return; }
        if (!path) return;

        // Only two decoders are used. Finish a fade before reusing its old layer.
        await fading;
        if (requestVersion !== version || motion.matches) return;
        if (path === activePath && !failedPath) return;
        const nextVideo = videos.find(video => video !== activeVideo);
        const controller = new AbortController();
        loadingController = controller;
        const fallback = weatherVideos.default[current.is_day === 1 ? 'day' : 'night'];
        const candidates = [...new Set([path, fallback])].filter(candidate => candidate !== failedPath);

        for (const candidate of candidates) {
            if (requestVersion !== version) return;
            if (candidate === activePath && !failedPath) {
                loadingController = null;
                return;
            }
            try {
                await preloadWeatherVideo(nextVideo, candidate, controller.signal);
                await playWeatherVideo(nextVideo, controller.signal);
                if (requestVersion !== version || motion.matches) return;
                loadingController = null;
                fading = crossfadeWeatherVideo(nextVideo, candidate);
                await fading;
                if (document.hidden) nextVideo.pause();
                return;
            } catch (error) {
                if (controller.signal.aborted || requestVersion !== version) return;
                console.warn('Weather background unavailable:', candidate, error.message);
                releaseVideo(nextVideo);
            }
        }
        if (requestVersion === version) {
            loadingController = null;
            useStaticBackground();
        }
    }

    function requestBackground(current) {
        void updateWeatherBackground(current).catch(error => {
            console.warn('Weather background update failed:', error.message);
        });
    }

    function update(current) {
        // Called only after successful weather rendering, even if media later fails.
        hasWeatherResult = true;
        requestBackground(current);
    }

    function syncDefault() {
        if (hasWeatherResult) return;
        // Before the first result only, the restored/current theme chooses daylight.
        requestBackground({ weather_code: -1, is_day: document.body.classList.contains('light-theme') ? 1 : 0 });
    }

    videos.forEach(video => {
        video.addEventListener('error', () => {
            if (video === activeVideo && lastWeather && !loadingController) {
                void updateWeatherBackground(lastWeather, activePath).catch(error => {
                    console.warn('Weather background recovery failed:', error.message);
                });
            }
        });
    });

    motion.addEventListener('change', () => {
        if (motion.matches) {
            version++;
            loadingController?.abort();
            loadingController = null;
            useStaticBackground();
        } else if (hasWeatherResult && lastWeather) requestBackground(lastWeather);
        else syncDefault();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) videos.forEach(video => video.pause());
        else if (activeVideo && !motion.matches) {
            activeVideo.play().catch(error => {
                console.warn('Weather background resume failed:', error.message);
                if (lastWeather) {
                    void updateWeatherBackground(lastWeather, activePath).catch(recoveryError => {
                        console.warn('Weather background recovery failed:', recoveryError.message);
                    });
                }
            });
        }
    });

    return Object.freeze({ update, syncDefault, getWeatherCategory, getWeatherVideo });
})();
