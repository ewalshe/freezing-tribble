;(function (win, doc, undefined) {
    'use strict';

    var maxSearchSuggestions = 10,
        overlayDelay = 0,
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
    template = q$('#modalContentTemplate').innerHTML;


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


    // Apply template to model
    var applyTemplate = function (model, template) {
        var tmpl = template || '';

        Object.keys(model).forEach(function (key) {
            tmpl = tmpl.split('{{' + key + '}}').join(model[key]);
        });

        return tmpl;
    };


    // information modal
    var modal = function (selector) {
        var selector    = selector || '#modal',
            $modal      = q$(selector),
            $detail     = q$('article', $modal),
            active      = false,
            activeEl;

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
            activeEl = doc.activeElement || null;

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

            if (activeEl) {
                activeEl.focus();
            }

            return modal;
        };

        // Keyboard navigation
        doc.addEventListener('keydown', function (e) {
            if (active === true && e.keyCode === 27) {
                hide();
            }
        }, true);


        // Close button
        q$('#closeModal', $modal).addEventListener('click', hide, false);


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
        modal.show(applyTemplate(marker, template));
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
            icon        : marker.icon || 'media/img/info.png'
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
        var latLg,
            map;

        if (status < 200 || status > 399) {
            alert('Sorry, an error occurred :(');
            return;
        }

        data = JSON.parse(txt);

        // Do we have enough data to proceed?
        if (!data.config || !Array.isArray(data.markers)) {
            alert('Could not parse data, sorry :(');
            return;
        }
        if (!data.config.map || !data.config.map.lat || !data.config.map.long) {
            alert('Sorry, no start coordinates, quitting.');
            return;
        }

        map = data.config.map;

        // Override defaults
        if (data.config.showOverlayDelay) {
            overlayDelay = data.config.showOverlayDelay;
        }
        if (data.config.maxSearchSuggestions) {
            maxSearchSuggestions = data.config.maxSearchSuggestions;
        }

        latLg = new google.maps.LatLng(parseFloat(map.lat), parseFloat(map.long));

        // Set-up gMap
        gmap = new google.maps.Map($map, {
            zoom                    : map.zoom || 12,
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
            quikSearch(q$('header form[role="search"]'), data.markers);
        }, 99);
    };


    // EVENT: Handle navigation clicks
    $nav.addEventListener('click', function (e) {
        var target = e.target,
            marker;

        if (target.tagName != 'LI') {
            return;
        }

        marker = parseInt(target.getAttribute('data-index'), 10);
        showMarkerDetail(markers[marker]);
    }, true);


    // EVENT: Handle point of interest hover
    $nav.addEventListener('mouseover', function (e) {
        var target = e.target,
            markerIndex;

        if (target.tagName != 'LI') {
            return;
        }

        markerIndex = parseInt(target.getAttribute('data-index'), 10);

        if (markers[markerIndex]) {
            gmap.panTo(markers[markerIndex].mark.getPosition());
        }
    });


    // Perform client side search with suggestions
    var quikSearch = function (form, data, callback) {
        var maxSuggestions = maxSearchSuggestions || 10,
            el = q$('input[type="search"]', form),
            searchIndex = [],
            suggestionEl;


        if (!el || !data) {
            console.log('No element to attach to or no data to search.');
            return;
        }

        if (!Array.isArray(data)) {
            console.log('QuikSearch requires an array of objects.');
            return;
        }

        el.setAttribute('autocapitalize', 'off');
        el.setAttribute('autocomplete', 'off');

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


        // Build case insensitive bolded markup
        var caseInsensitiveBold = function (word, trm) {
            var regex = new RegExp('(' + word + ')', 'gi');

            return trm.replace(regex, '<strong>$1</strong>');
        };


        // Return search index
        var getSearchIndex = function () {
            return searchIndex;
        };


        // Build search index
        data.forEach(function (obj, index) {
            var searchObj = {
                    index   : index,
                    soundex : [],
                    title   : obj.title || obj.name || index
                },
                str = '';


            Object.keys(obj).forEach(function(key) {
                var item = obj[key];

                if (typeof item === 'string') {
                    str += ' ' + stripHTML(item).toLowerCase();
                }
            });

            searchObj.str = str;                    // Keep original string
            searchObj.words = str.split(' ');       // TODO: kill stop words

            // Build simple fuzzy strings
            searchObj.words.forEach(function (word) {
                searchObj.soundex.push(soundex(word));
            });

            searchIndex.push(searchObj);
        });


        // Perform a quick search
        var searchKeyWord = function (term) {
            var term = term.toLowerCase(),
                sTerm = soundex(term),
                results = [];

            searchIndex.some(function (record) {
                if (record.str.indexOf(term) > -1 || record.soundex.indexOf(sTerm) > -1) {
                    results.push(record);
                }

                if (results.length > maxSuggestions) {
                    return true;
                }
            });

            if (callback) {
                callback(el, results, term);
            } else {
                showSearchResults(results, term);
            }
        };


        // Build / show search suggestions
        var showSearchResults = function (results, term) {
            var lis = '';

            // Build DOM element
            if (!suggestionEl) {
                suggestionEl = doc.createElement('ul');
                suggestionEl.className = 'searchSuggest';

                suggestionEl.onclick = function (e) {
                    var target = e.target;

                    if (target.tagName === 'LI') {
                        showMarkerDetail(markers[parseInt(target.getAttribute('data-index'), 10)]);
                    }
                };

                el.parentNode.appendChild(suggestionEl);
            }

            results.forEach(function (result) {
                lis += '<li data-index="' + result.index + '">' + caseInsensitiveBold(term, result.title) + '</li>';
            });

            suggestionEl.innerHTML = lis || '';
        };


        // UI interaction; move between keyed suggestions
        var navTo = function (keyCode) {

        };


        // Event listener
        var handleSearchEvents = function (e) {
            var keyCode = e.keyCode || 0,
                val = this.value;

            if (keyCode === 38 || keyCode === 40) {
                e.preventDefault();

                navTo(keyCode);
                return;
            }

            if (keyCode === 27) {
                suggestionEl.className = 'searchSuggest';
                return;
            }

            setTimeout(function () {
                searchKeyWord(val);
            }, 9);
        };

        el.addEventListener('keyup', handleSearchEvents, true);


        // Public API
        return {
            data:   getSearchIndex,
            search: searchKeyWord
        }
    };


    // Import data, then start the show
    if (!win.placesOfInterest) {
        XHR('map.json', {callback: init});
    } else {
        alert('TODO: inline data loading here');
    }
}(window, document));