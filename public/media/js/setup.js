;(function (win, doc, undefined) {
    'use strict';

    var docEl = doc.documentElement,
        pointKeys = [],
        markers = [],
        $map,
        data,
        gmap;


    // Shorthand querySelectors
    var q$ = function (selector, context) {
        return (context || doc).querySelector(selector);
    };

    var q$$ = function (selector, context) {
        if (typeof selector === 'string') {
            return [].slice.call((context || doc).querySelectorAll(selector));
        }
        return [selector];
    };


    $map = q$('#map');
    pointKeys = 'title,summary,lat,lng,order,icon,image,detail,markdown'.split(',');


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


    // Load <SCRIPT>
    var loadScript = function (url, callback) {
        var script = doc.createElement('script');

        script.src = url;

        if (callback) {
            if (script.readyState){
                script.onreadystatechange = function(){
                    if (script.readyState == 'loaded' || script.readyState == 'complete') {
                        script.onreadystatechange = null;
                        callback();
                    }
                };
            } else {
                script.onload = function () {
                    callback();
                };
            }
        }

        doc.getElementsByTagName('head')[0].appendChild(script);
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


    // Simple 2-way binding
    var bindModelInput = function (obj, property, el) {
        el.value = obj[property];

        Object.defineProperty(obj, property, {
            get: function() {
                return el.value;
            },
            set: function (newValue) {
                el.value = newValue;
            },
            configurable: true
        });
    };


    // Simple templating
    var applyTemplate = function (model, template) {
        var tmpl = template || '';

        Object.keys(model).forEach(function (key) {
            tmpl = tmpl.split('{{' + key + '}}').join(model[key]);
        });

        return tmpl;
    };


    // Build places of interest pane
    var buildNav = function (data) {
        var tmpl = q$('#existingPoint').innerHTML,
            navString = '';

        data.markers.forEach(function (link, index) {
            var navTemplate = tmpl,
                obj = {
                    index   : index,
                    summary : link.summary,
                    title   : link.title
                };

            navString += applyTemplate(obj, navTemplate);
        });

        q$('.existingPoints ul').innerHTML = navString;
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
            icon        : marker.icon || 'media/img/marker.png'
        });

        marker.mark = mark;

        mark.addListener('click', function () {
            gmap.panTo(mark.getPosition());

            setTimeout(function () {
                showMarkerDetail(marker);
            }, 300);
        });

        markers.push(marker);
    };


    // Add map markers
    var addMapMarkers = function (data) {
        data.markers.forEach(function (marker) {
            addMapMarker(marker);
        });
    };


    // Init UI
    var init = function (txt, status) {
        var latLg,
            map;


        // Attempt to parse existing data
        try {
            data = JSON.parse(txt);
        } catch(ignore) {};



        // Is there a sensible persisted state? No? Build one!
        if (Object.prototype.toString.call(data) != '[object Object]' || !data.config || !Array.isArray(data.markers)) {
            data = {
                "config": {
                    "showOverlayDelay"  : 400,
                    "proximity"         : 10,
                    "map": {
                        "lat"           : 53.44880683542759,
                        "long"          : -7.734375,
                        "zoom"          : 7,
                        "style"         : [{"featureType": "all", "stylers" : [{"saturation": -70},{"lightness": 20}]}]
                    }
                },
                "markers": []
            };
        }

        map = data.config.map;
        latLg = new google.maps.LatLng(parseFloat(map.lat), parseFloat(map.long));

        // Set-up gMap
        gmap = new google.maps.Map($map, {
            zoom                    : 12,
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
            styles                  : map.style || [],
            mapTypeId               : google.maps.MapTypeId.ROADMAP
        });

        // Add markers and populate point-of-interest menu, init routing
        addMapMarkers(data);
        buildNav(data);

        initBasics();
    };



    var initBasics = function () {
        // Populate Lat/Long geo-coords
        google.maps.event.addListener(gmap, 'click', function(e) {
            var basics = q$('#basics.active'),
                points = q$('#points.active #pointLong'),
                lat = e.latLng.lat(),
                lng = e.latLng.lng(),
                latLg = new google.maps.LatLng(lat, lng);

            console.log('Click');

            if (basics) {
                q$('#long', basics).value = lng;
                q$('#lat', basics).value = lat;
                console.log('Setting basics to ' + lng);
            }

            if (points) {
                q$('#pointLong').value = lng;
                q$('#pointLat').value = lat;
                console.log('Setting points to ' + lng);
            }

            gmap.panTo(latLg);
        });

        q$('#zoom').addEventListener('change', function (e) {
            console.log('Zoom: ' + this.value);
        });

        q$('#showOverlayDelay').addEventListener('change', function (e) {
            console.log('Delay: ' + this.value);
        });

        q$('#proximity').addEventListener('change', function (e) {
            console.log('Prox: ' + this.value);
        });
    };


    var $links = q$$('#setup > ul > li'),
        swapTab = function (link) {
            $links.forEach(function (link) {
                link.className = '';
            });
            link.className = 'active';
        };


    q$$('#setup > ul > li > a').forEach(function (link) {
        link.onclick = function (e) {
            e.preventDefault();

            swapTab(this.parentElement);
        };
    });

    q$('.existingPoints').addEventListener('click', function (e) {
        var target = e.target;

        if (target.tagName === 'LI') {
            editPoint(target.getAttribute('data-index'));
        }
    }, true);




    var initMarkdownEditor = function () {
        console.log(marked('# Marked in browser\n\nRendered by **marked**.'));
    };


    var editPoint = function (index) {
        var editPane = q$('#points .newPoint'),
            template = q$('#editExistingPoint').innerHTML,
            obj = data.markers[index];


        editPane.innerHTML = applyTemplate(obj, template);

        console.log(index);
        console.log(obj);

        Object.keys(obj).forEach(function (key) {
            var el = q$('[data-id="' + key + '"]', editPane);

            if (el) {
                bindModelInput(obj, key, el);
            }
        });
    };


    var newPoint = function () {
        var obj = {};

        pointKeys.forEach(function (key) {
            obj[key] = '';
        });

        console.log(obj);

    };


    doc.addEventListener('keyup', function () {
        console.log(data.markers);
    }, true);


    var exportData = function () {
        var anchor = doc.createElement('a'),
            str;


        // Clean up data
        data.markers.forEach(function (marker) {
            if (marker.mark) {
                delete marker.mark;
            }
        });

        str = JSON.stringify(data);

        anchor.href     = 'data:application/json;charset=utf-8,' + encodeURIComponent(str);
        anchor.target   = '_blank';
        anchor.download = 'map.json';

        doc.body.appendChild(anchor);
        anchor.click();
    };

    q$('#export').addEventListener('click', function (e) {
        e.preventDefault();

        exportData();
    });


    // Load existing data
    XHR('map.json', {callback: init});


    // Postload support files
    loadScript('media/js/marked.js', initMarkdownEditor);
}(window, document));