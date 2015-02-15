;(function (win, doc, undefined) {
    'use strict';

    var docEl = doc.documentElement,
        maxSearchSuggestions = 10,
        overlayDelay = 0,
        markers = [],
        template,
        $docEl,
        $nav,
        $map,
        data,
        gmap,
        UA;


    // Does UA support us?
    if (!doc.querySelector || !win.JSON || !win.JSON.parse || !win.Object.keys || !win.Array.isArray) {
        alert('Sorry, your browser does not support this application.');
        return;
    }


    // Polyfill console
    if (!win.console || !win.console.log) {
        win.console = {
            log: function (){}
        };
    }


    // Lets get to know the User Agent
    UA = (function () {
        var styles = win.getComputedStyle(docEl, ''),
            pre = ([].slice.call(styles).join('').match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1],
            dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1],
            rx = new RegExp('MSIE ([0-9]{1,}[\.0-9]{0,})'),
            nv = win.navigator,
            ie;

        if (pre === 'ms') {
            rx.exec(nv.userAgent);
            ie = parseFloat(RegExp.$1);
        }

        return {
            css         : '-' + pre + '-',
            dom         : dom,
            lowercase   : pre,
            ie          : (ie || false),
            js          : pre[0].toUpperCase() + pre.substr(1),
            platform    : nv.platform.toLowerCase(),
            touch       : !!(('ontouchstart' in docEl || 'onmsgesturechange' in win))
        };
    }());


    // Shorthand querySelector
    var q$ = function (selector, context) {
        return (context || doc).querySelector(selector);
    };


    var q$$ = function (selector, context) {
        if (typeof selector === 'string') {
            return [].slice.call((context || doc).querySelectorAll(selector));
        }
        return [selector];
    };


    $docEl = doc.documentElement;
    $map = q$('#map .googleMap');
    $nav = q$('header > nav');


    // Swap map mask based on screen width (TODO: unsuck this with <picture> or srcset)
    (function () {
        var screenWidth = (win.innerWidth || $docEl.clientWidth || doc.body.clientWidth),
            img = q$('main > img'),
            src = img.getAttribute('data-srcset').split(' ');

        if (screenWidth > 767) {
            img.src = src[0];
        } else if (screenWidth > 1300) {
            img.src = src[0];
        }
    } ());


    // Modal content template
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


    // Event helper
    var on = function (el, events, func, bubble) {
        events.split(' ').forEach(function (evt) {
            el.addEventListener(evt, func, bubble);
        });
    };


    // Find nearest parent of tag type
    var nearestParent = function (el, tagName) {
        while (el.tagName != tagName) {
            el = el.parentNode;
        }

        return el;
    };


    // Strip markup from a string
    var stripHTML = function (html) {
        var tempEl = doc.createElement('i'),
            txt;

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
            $detail.scrollTop = 0;

            return modal;
        };


        // show modal
        var show = function (content) {
            activeEl = doc.activeElement || null;

            if (content && content.length > 0) {
                populate(content);
            }

            $docEl.classList.add('modalActive');
            $modal.focus();
            active = true;

            return modal;
        };


        // Hide modal
        var hide = function () {
            $docEl.classList.remove('modalActive');
            doc.location.hash = '';
            active = false;

            if (activeEl && activeEl.focus) {
                activeEl.focus();
            }

            return modal;
        };


        // Keyboard navigation
        doc.addEventListener('keydown', function (e) {
            if (active && e.keyCode === 27) {
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

        doc.location.hash = marker.uri;
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

        q$('ul', $nav).innerHTML = navString;
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
            icon        : marker.icon || 'media/img/themes/red/marker.png'
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
            doc.location = 'setup.html';
            return;
        }

        data = JSON.parse(txt);

        // Do we have enough data to proceed?
        if (!data.config || !Array.isArray(data.markers)) {
            alert('Could not parse data, sorry :(');
            return;
        }
        if (!data.config.map || !data.config.map.lat || !data.config.map.lng) {
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

        latLg = new google.maps.LatLng(parseFloat(map.lat), parseFloat(map.lng));

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
            streetViewControl       : false,
            streetViewControlOptions: {
                position: google.maps.ControlPosition.LEFT_CENTER
            },
            overviewMapControl      : true,
            styles                  : map.style || [],
            mapTypeId               : google.maps.MapTypeId.ROADMAP
        });

        // Help data population
        google.maps.event.addListener(gmap, 'click', function(e) {
            console.log('Map coordinates: ' + e.latLng.lat() + ' ' + e.latLng.lng());
        });

        // Add markers and populate point-of-interest menu, init routing
        addMapMarkers(data);
        buildNav(data);
        router.init(data, function (obj) {
            if (obj) {
                showMarkerDetail(obj);
            }
        });


        // Kill intro, show UI
        setTimeout(function () {
            var intro = q$('.intro');

            intro.classList.add('hide');

            intro.addEventListener('transitionend', function () {
                intro.classList.add('destroy');
            }, false);
        }, 2999);


        // Lazy build search index
        setTimeout(function () {
            quikSearch(q$('header form[role="search"]'), data.markers);
        }, 99);
    };


    // Handle navigation clicks
    var navClickHandler = function (e) {
        var target = e.target,
            marker;

        e.stopImmediatePropagation();

        if (target.tagName != 'LI') {
            return;
        }

        $docEl.classList.remove('navActive');

        marker = parseInt(target.getAttribute('data-index'), 10);
        showMarkerDetail(markers[marker]);
    };

    // EVENT: Handle navigation clicks
    $nav.addEventListener('mousedown', navClickHandler);
    $nav.addEventListener('click', navClickHandler);


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
        var suggestionTemplate = q$('#navigationTemplate').innerHTML,
            maxSuggestions = maxSearchSuggestions || 10,
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

        // Prevent form POSTs reaching server
        form.addEventListener('submit', function (evt) {
            var activeEl;

            evt.preventDefault();

            if (suggestionEl) {
                activeEl = q$('.active', suggestionEl);

                if (activeEl) {
                    activeEl.click();
                }
            }
        }, true);


        // Suppress browser defaults
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
                results = [],
                sTerm;


            if (term.length < 2) {
                return;
            }

            term = term.toLowerCase();
            sTerm = soundex(term);

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

                // Handle click evts
                suggestionEl.addEventListener('click', function (evt) {
                    var target = nearestParent(evt.target, 'LI');

                    el.blur();

                    showMarkerDetail(markers[parseInt(target.getAttribute('data-index'), 10)]);
                }, true);

                // TMP TODO - make generic
                suggestionEl.addEventListener('mouseover', function (evt) {
                    var target = nearestParent(evt.target, 'LI'),
                        index;

                    index = parseInt(target.getAttribute('data-index'), 10);

                    if (markers[index]) {
                        gmap.panTo(markers[index].mark.getPosition());
                    }
                }, true);

                el.parentNode.appendChild(suggestionEl);
            }

            if (UA.touch) {
                results.reverse();
            }

            results.forEach(function (result, index) {
                var item = {
                    itemIndex : index,
                    index     : result.index,
                    title     : caseInsensitiveBold(term, result.title)
                };

                lis += applyTemplate(item, suggestionTemplate);
            });

            suggestionEl.innerHTML = lis || '';
        };


        // UI interaction; move between keyed suggestions
        var navTo = function (keyCode) {
            var lis = suggestionEl.querySelectorAll('li'),
                active = q$('.active', suggestionEl),
                activeIndex,
                lisCount = (lis.length - 1),
                i, j;

            if (!active) {
                activeIndex = 0;
                if (keyCode === 38) {
                    activeIndex = lisCount;
                }
            } else {
                activeIndex = parseInt(active.getAttribute('data-menu-item'), 10);

                for (i = 0, j = lis.length; i < j; i++) {
                    lis[i].className = '';
                }

                if (keyCode === 38) {
                    activeIndex--;
                    if (activeIndex < 0) {
                        activeIndex = lisCount
                    }
                } else {
                    activeIndex++;
                    if (activeIndex > lisCount) {
                        activeIndex = 0;
                    }
                }
            }

            lis[activeIndex].className = 'active';

            // TEMP
            var markerIndex = parseInt(lis[activeIndex].getAttribute('data-index'), 10);

            if (markers[markerIndex]) {
                gmap.panTo(markers[markerIndex].mark.getPosition());
            }
        };


        // Event listener
        var handleSearchEvents = function (evt) {
            var keyCode = evt.keyCode || 0,
                val = this.value,
                selectedLink;


            // Close search
            if (keyCode === 27) {
                el.blur();
            }

            // Navigation suggestions
            if (keyCode === 38 || keyCode === 40) {
                evt.preventDefault();

                navTo(keyCode);
                return;
            }

            // Choose active suggestion OR first suggestion
            if (keyCode === 27) {
                if (suggestionEl) {
                    selectedLink = (suggestionEl.querySelectorAll('.active')[0] || q$('li', suggestionEl) || null);

                    if (selectedLink) {
                        selectedLink.click();
                    }
                }
                return;
            }

            // Perform a search
            setTimeout(function () {
                searchKeyWord(val);
            }, 9);
        };
        el.addEventListener('keyup', handleSearchEvents, true);


        // Remove suggests onBlur
        el.addEventListener('blur', function () {
            el.value = '';
            if (suggestionEl) {
                suggestionEl.innerHTML = '';
            }
        }, true);


        // Public API
        return {
            data:   getSearchIndex,
            search: searchKeyWord
        }
    };


    // Routing / history
    var router = function () {
        var routes = {},
            extCallback;


        if (!win.history || !win.history.pushState) {
            return;
        }

        // Move to a route
        var trigger = function (obj) {
            if (!obj) {
                return;
            }

            if (obj.title) {
                doc.title = obj.title;
            }

            if (extCallback) {
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
        var hashChange = function () {
            var URI = doc.location.hash,
                index = routes[URI];

            // TODO: Make generic
            if (typeof index === 'number') {
                trigger(data.markers[index]);
            } else {
                modal.hide();
            }
        };
        win.addEventListener('hashchange', hashChange)


        return {
            init    : init,
            trigger : trigger
        };
    } ();


    // Import data, then start the show
    if (!win.placesOfInterest) {
        XHR('map.json', {callback: init});
    } else {
        alert('TODO: inline data loading here');
    }

    // Add support CSS
    docEl.className = (' ' + docEl.className + ' ua-' + UA.lowercase + ' ' + ' os-' + UA.platform + ' ie-' +  UA.ie + ' ' + ((UA.touch) ? 'has-touch' : 'no-touch') + ' ').replace(' no-js ', ' js ').replace(' loading ', ' loaded ').trim();


    // Handle NAV and SEARCH
    (function () {
        var nav = q$('header nav'),
            navToggle = q$('header nav > a'),
            searchForm = q$('header .searchForm'),
            searchInput = q$('input[type=search]', searchForm);


        // Show search
        searchForm.addEventListener('mouseenter', function () {
            docEl.classList.add('searchActive');

            if (UA.touch) {
                return;
            }
        });

        //
        searchInput.addEventListener('blur', function () {
            docEl.classList.remove('searchActive');
        });


        // Toggle menu
        navToggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            docEl.classList.add('navActive');
        });


        // Close menu with map
        q$('#map').addEventListener('mousedown', function () {
            if (docEl.classList.contains('navActive')) {
                docEl.classList.remove('navActive');
            }
        });

    }());

    // Mobile tweaks
    (function () {
        var close,
            navToggle;

        if (UA.touch) {
            close = q$('#closeModal');
            navToggle = q$('header nav > a');


            // Quickly close modal
            close.addEventListener('touchstart', function () {
                q$('#closeModal').click();
            }, false);


            // Toggle menu
            navToggle.addEventListener('touchstart', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();

                docEl.classList.add('navActive');
                navToggle.click();
            }, false);
        }
    } ());

    // Public API
    win.PLACES = {
        modal   : modal,
        router  : router
    };
}(window, document));