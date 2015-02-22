// Routing / history
var router = function (win, doc) {
    var routes = {},
        extCallback;


    if (!win.history || !win.history.pushState) {
        return;
    }

    // Move to a route
    var trigger = function (obj) {
        if (obj && extCallback) {
            extCallback(obj);
        }
    };


    // Generate a clear URI
    var toURI = function (txt, id) {
        var URI = '#/' + txt.toLowerCase().replace(/\W/g, ' ').split(' ').join('-').trim();

        if (typeof parseInt(id, 0) === 'number') {
            URI += '-' + id;
        }
        return  URI;
    };


    // Create routes, set initial state
    var init = function (data, callback) {
        var currentURI = doc.location.hash;

        if (callback) {
            extCallback = callback;
        }

        // Build route lookup
        data.markers.forEach(function (route, index) {
            var URI = toURI(route.title, index);

            routes[URI] = index;
            route.uri = URI;

            if (URI === currentURI) {
                trigger(route);
            }
        });
    };


    // Listen for doc hash changes
    win.addEventListener('hashchange', function () {
        trigger(routes[doc.location.hash]);
    });


    return {
        init    : init,
        trigger : trigger
    };
} (window, document);