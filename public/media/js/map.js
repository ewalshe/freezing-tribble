;(function (win, doc, undefined) {
    'use strict';

    var overlayDelay = 0,
        template,
        data,
        gmap,
        $docEl,
        $search,
        $nav,
        $map;


    win.markers = [];           // TODO: make private


    // Does UA support us?
    if (!doc.querySelector || !win.JSON || !win.JSON.parse || !win.Object.keys || !win.Array.isArray) {
        alert('Sorry, your browser does not support this application.');
        return;
    }


    // Shorthand querySelector
    var q$ = function (selector, context) {
        return (context || doc).querySelector(selector);
    };


    $docEl = doc.documentElement;
    $map = q$('#map');
    $nav = q$('header > nav');
    $search = q$('#search');


    // Modal content template (TODO: move to <template>)
    template = q$('#modalContent').innerHTML;


    // XMLHTTP
    var XHR = function (url, params) {
        var X = win.XMLHttpRequest ? new XMLHttpRequest() : new win.ActiveXObject('Microsoft.XMLHTTP'),
            o = params || {},
            p = o.message || '',
            v = o.verb || 'GET',
            h = o.headers || {
                    'Content-type': 'application/x-www-form-urlencoded'
                };


        X.open(v, url, true);

        Object.keys(h).forEach(function (key) {
            X.setRequestHeader(key, h[key]);
        });

        X.onreadystatechange = function () {
            var s, r;

            if (X.readyState === 4) {
                r = X.responseText;
                s = X.status;

                if (s < 200 || s > 299) {
                    if (o.fail) {
                        o.fail(r, X);
                    }
                } else {
                    if (o.success) {
                        o.success(r, X);
                    }
                }

                if (o.callback) {
                    o.callback(r, s, X);
                }

                X = null;
            }
        };

        X.send(p);
    };


    // Strip markup from a string
    var stripHTML = function (html) {
        var tempEl = doc.createElement('i'),
            txt = '';

        tempEl.innerHTML = html;
        txt = (tempEl.textContent || tempEl.innerText || '');
        tempEl = null;

        return txt;
    };


    // Soundex a string
    var soundex = function (s) {
        var a = s.toLowerCase().split(''),
            f = a.shift(),
            r = '',
            codes;

        codes = {
            a: '', e: '', i: '', o: '', u: '',
            b: 1, f: 1, p: 1, v: 1,
            c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
            d: 3, t: 3,
            l: 4,
            m: 5, n: 5,
            r: 6
        };

        r = f +
        a
            .map(function (v, i, a) {
                return codes[v]
            })
            .filter(function (v, i, a) {
                return ((i === 0) ? v !== codes[f] : v !== a[i - 1]);
            })
            .join('');

        return (r + '000').slice(0, 4).toUpperCase();
    };


    // Apply template to model
    var applyTemplate = function (model, template) {
        var tmpl = template || '';

        Object.keys(model).forEach(function (key) {
            tmpl = tmpl.split('{{' + key + '}}').join(model[key]);
        });

        return tmpl;
    };


    // information modal
    var modal = function () {
        var $detail = q$('#modal article'),
            active = false;

        // Is modal visible to user?
        var isActive = function () {
            return active;
        };

        // populate modal contents
        var populate = function (markup) {
            $detail.innerHTML = markup;

            return modal;
        };

        // show modal
        var show = function (content) {
            if (content && content.length > 0) {
                populate(content);
            }

            $docEl.className += ' modalActive';
            active = true;

            return modal;
        };

        // Hide modal
        var hide = function () {
            $docEl.className = (' ' + $docEl.className + ' ').split(' modalActive ').join(' ');
            active = false;

            return modal;
        };

        // Keyboard navigation
        doc.addEventListener('keydown', function (e) {
            if (e.keyCode === 27 && active === true) {
                hide();
            }
        }, true);


        // Close button
        q$('#modal').addEventListener('click', hide, false);


        // API
        return {
            active      : isActive,
            hide        : hide,
            populate    : populate,
            show        : show
        };
    } ();


    // Show modal with point of interest details
    var showMarkerDetail = function (marker) {
        if (marker.img) {
            marker.detail = '<img alt="" src="' + marker.img + '">' + marker.detail;
        }

        modal.show(applyTemplate(marker, template));
    };


    // Build quick search
    var buildSearch = function (data) {
        data.search = [];

        data.markers.forEach(function (marker, index) {
            var string =  (marker.title + ' ' + marker.summary + ' ' + stripHTML(marker.detail)).toLowerCase(),
                arr = string.split(' '),
                searchObj = {
                    index   : index,
                    arr     : arr,
                    string  : string,
                    soundex : []
                };


            arr.forEach(function (word) {
                searchObj.soundex.push(soundex(word));
            });

            data.markers[index].search = searchObj;
        });
    };


    // Search for a keyword in a point of interest
    var searchKeyWord = function (term) {
        var term = term.toLowerCase(),
            sTerm = soundex(term),
            results = [];

        data.markers.forEach(function (marker) {
            var searchObj = marker.search;

            if (searchObj.string.indexOf(term) > -1) {
                results.push(searchObj.index);
            }
        });

        searchSuggestions(results);
    };


    // Build suggestions list
    var searchSuggestions = function (results) {
        console.log(results);
    };


    // Built navigation
    var buildNav = function (data) {
        var tmpl = q$('#navigationTemplate').innerHTML,
            navString = '';

        if (!Array.isArray(data.markers)) {
            return;
        }

        data.markers.forEach(function (link, index) {
            var navTemplate = tmpl,
                obj = {
                    index   : index,
                    title   : link.title
                };

            navString += applyTemplate(obj, navTemplate);
        });

        $nav.innerHTML = '<ul>' + navString + '</ul>';
    };


    // Add a single map marker
    var addMapMarker = function (marker) {
        var latLng = new google.maps.LatLng(marker.lat, marker.lng),
            mark;

        mark = new google.maps.Marker({
            position    : latLng,
            map         : gmap,
            clickable   : true,
            title       : marker.title,
            icon        : marker.icon || '/media/img/info.png'
        });

        marker.mark = mark;

        mark.addListener('click', function () {
            gmap.panTo(mark.getPosition());

            setTimeout(function () {
                showMarkerDetail(marker);
            }, overlayDelay);
        });

        markers.push(marker);
    };


    // Add map markers
    var addMapMarkers = function (data) {
        if (!Array.isArray(data.markers)) {
            return;
        }

        data.markers.forEach(function (marker) {
            addMapMarker(marker);
        });
    };


    // Init UI
    var init = function (txt, status) {
        var latLg;

        if (status < 200 || status > 399) {
            alert('Sorry, an error occurred :(');
            return;
        }

        data = JSON.parse(txt);

        if (!data.config || !Array.isArray(data.markers)) {
            alert('Could not parse data, sorry :(');
            return;
        }

        if (data.config.showOverlayDelay) {
            overlayDelay = data.config.showOverlayDelay;
        }

        latLg = new google.maps.LatLng(parseFloat(data.config.startLat), parseFloat(data.config.startLong));

        // Set-up gMap
        gmap = new google.maps.Map($map, {
            zoom                    : data.config.zoom,
            center                  : latLg,
            disableDefaultUI        : true,
            panControl              : false,
            mapTypeControl          : false,
            navigationControl       : false,
            zoomControl             : false,
            scaleControl            : true,
            streetViewControl       : true,
            streetViewControlOptions: {
                position: google.maps.ControlPosition.LEFT_CENTER
            },
            overviewMapControl      : true,
            mapTypeId               : google.maps.MapTypeId.ROADMAP
        });

        // Help data population
        if (win.console && win.console.log) {
            google.maps.event.addListener(gmap, 'click', function(e) {
                console.log('Map coordinates: ' + e.latLng.lat() + ' ' + e.latLng.lng());
            });
        }

        // Add markers and populate point-of-interest menu
        addMapMarkers(data);
        buildNav(data);

        // Lazy build search index
        setTimeout(function () {
            buildSearch(data);
        }, 99);
    };


    // EVENT: Handle navigation clicks
    $nav.addEventListener('click', function (e) {
        var target = e.target,
            marker;

        if (target.tagName != 'LI') {
            return;
        }

        marker = target.getAttribute('data-index');
        showMarkerDetail(markers[marker]);
    }, true);


    // EVENT: Handle search key strokes
    $search.addEventListener('keyup', function () {
        searchKeyWord(this.value);
    }, true);


    // Import data, then start the show
    XHR('map.json', {callback: init});
}(window, document));