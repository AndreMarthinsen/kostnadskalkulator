module.exports = {
    globDirectory: 'build/',
    globPatterns: [
        '**/*.{js,css,html,png,svg,jpg,jpeg}',
    ],
    swDest: 'build/service-worker.js',
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
    mode: 'debug',
    runtimeCaching: [
        {
            // handler used by Editor
            urlPattern: ({event}) => {
                return event.request.headers.get('X-No-Cache') === 'true';
            },
            handler: 'NetworkOnly',
        },
        {
            // handler used by App
            urlPattern: new RegExp('.*'),
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'all',
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                },
            },
        },
    ],
};