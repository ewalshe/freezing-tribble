;(function (win, doc, undefined) {
    'use strict';

    var docEl = doc.documentElement,
        pointKeys = [],
        markers = [],
        $map,
        gmap;

    win.data = {};

    // Are we supported?
    if (!doc.querySelector || !Object.keys || !win.google || !win.google.maps) {
        alert('Sorry, there was a problem loading.');
        return;
    }


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
            win.data = JSON.parse(txt);
        } catch(ignore) {};



        // Is there a sensible persisted state? No? Build one!
        if (Object.prototype.toString.call(data) != '[object Object]' || !data.config || !Array.isArray(data.markers)) {
            data = {
                "config": {
                    "showOverlayDelay"  : 400,
                    "proximity"         : 10,
                    "map": {
                        "lat"           : 53.44880683542759,
                        "lng"           : -7.734375,
                        "zoom"          : 7,
                        "style"         : [{"featureType": "all", "stylers" : [{"saturation": -70},{"lightness": 20}]}]
                    }
                },
                "markers": []
            };
        }

        map = data.config.map;
        latLg = new google.maps.LatLng(parseFloat(map.lat), parseFloat(map.lng));

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
                data.config.map.lng = lng;
                data.config.map.lat = lat;
            }

            if (points) {
                q$('#pointLong').value = lng;
                q$('#pointLat').value = lat;
                console.log('Setting points to ' + lng);
            }

            gmap.panTo(latLg);
        });


        // Listen for Map zoom level changes (TODO: DRY)
        var zoomInput = q$('#zoom'),
            zoomHandler = function (el) {
                var val = parseInt(zoomInput.value, 10);

                data.config.map.zoom = val;
                gmap.setZoom(val);
            };

        zoomInput.addEventListener('change', zoomHandler, true);
        zoomInput.addEventListener('input', zoomHandler, true);


        // Listen for Modal delay changes
        var delayInput = q$('#showOverlayDelay'),
            delayHandler = function () {
                data.config.showOverlayDelay = delayInput.value;
            };

        delayInput.addEventListener('input', delayHandler, true);
        delayInput.addEventListener('change', delayHandler, true);


        // Listen for what is considered close changes
        var proximityInput = q$('#proximity'),
            proximityHandler = function (el) {
                data.config.proximity = proximityInput.value;
            };

        proximityInput.addEventListener('change', proximityHandler, true);
        proximityInput.addEventListener('input', proximityHandler, true);
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


    // information modal
    var modal = function (selector, cb) {
        var selector    = selector || '#modal',
            $modal      = q$(selector),
            $detail     = q$('article', $modal),
            callbacks   = cb || {},
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

            docEl.className += ' modalActive';
            $modal.focus();
            active = true;

            return modal;
        };

        // Hide modal
        var hide = function () {
            docEl.className = (' ' + docEl.className + ' ').split(' modalActive ').join(' ');
            doc.location.hash = '';
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
            el          : $modal,
            element     : $modal,
            hide        : hide,
            populate    : populate,
            show        : show
        };
    } ();


    // Markdown
    var markdownEditor = function () {
        var evts = 'change keyup blur focus'.split(' '),
            ready = false,
            renderer,
            editor;


        // Real time markdown to HTML conversion
        var convert = function (e) {
            if (renderer) {
                if (e) {
                    e.stopImmediatePropagation();
                }
                renderer.innerHTML = save();
            }

            return markdownEditor;
        };


        // Setup / check availability
        var init = function (input, output) {
            if (!input) {
                return ready;
            }

            if (!win.marked) {
                alert('Markdown library not available');
                return;
            }

            ready = true;

            renderer = output;
            editor = input;

            if (typeof editor === 'string') {
                renderer = q$(renderer);
                editor = q$(editor);
            }

            if (renderer) {
                evts.forEach(function (evt) {
                    editor.addEventListener(evt, convert, true);
                });
            }

            return markdownEditor;
        };


        // Remove event handlers
        var kill = function () {
            if (renderer) {
                evts.forEach(function (evt) {
                    editor.removeEventListener(evt, convert);
                });
            }
        };


        // Save contents with an optional kill.
        var save = function (killEditor) {
            if (killEditor) {
                kill();
            }
            return marked(editor.value);
        };


        // Get current markdown
        var getMarkdown = function () {
            return editor.value;
        };


        // Set
        var setMarkdown = function (contents) {
            if (!ready) {
                setTimeout(function () {
                    setMarkDown(contents);
                }, 99);
                return;
            }

            if (editor) {
                editor.value = contents;
            }

            if (renderer) {
                convert();
            }

            return markdownEditor;
        };


        // Create JSON storable markdown Array
        var toArray = function (md) {
            var arr = [];

            md.split('\n').forEach(function (line) {
                 arr.push(line);
            });

            return arr;
        };


        // Flatten array into markdown string
        var fromArray = function (arr) {
            return arr.join('\n');
        };


        // Public API
        return {
            fromArray   : fromArray,
            get         : save,
            kill        : kill,
            init        : init,
            markdown    : getMarkdown,
            save        : save,
            set         : setMarkdown,
            ready       : init,
            toArray     : toArray
        };
    } ();


    var initMarkdownEditor = function () {
        modal.populate(q$('#editor').innerHTML);
        markdownEditor.init('.editorMarkdown', '.editorHTML');

        q$('.editorSave', modal.el).onclick = function () {
            q$('[data-id=detail]').value = markdownEditor.get();
            q$('[data-id=markdown]').value = markdownEditor.markdown();
            modal.hide();
        };
    };


    var editPoint = function (index) {
        var editPane = q$('#points .newPoint'),
            template = q$('#editExistingPoint').innerHTML,
            obj = data.markers[index],
            details;


        editPane.innerHTML = applyTemplate(obj, template);

        Object.keys(obj).forEach(function (key) {
            var el = q$('[data-id="' + key + '"]', editPane);

            if (el) {
                bindModelInput(obj, key, el);
            }
        });

        details = q$('[data-id=detail]', editPane);

        details.onclick = function () {
            markdownEditor.set(q$('[data-id=markdown]').value);
            modal.show();
        };
    };


    var newPoint = function () {
        var obj = {};

        pointKeys.forEach(function (key) {
            obj[key] = '';
        });

        console.log(obj);

    };


    doc.addEventListener('keyup', function () {
        //console.log(data.markers);
    }, true);


    // Generate stringified JSON
    var exportData = function () {
        var anchor = doc.createElement('a'),
            str;


        // Clean up data
        data.markers.forEach(function (marker) {
            var md = marker.markdown.toString();

            delete marker.markdown;

            if (marker.mark) {
                delete marker.mark;
            }

            marker.markdown = md.split('\n');   // Horrible workaround to crazy forced string
        });

        str = JSON.stringify(data);

        anchor.href     = 'data:application/json;charset=utf-8,' + encodeURIComponent(str);
        anchor.target   = '_blank';
        anchor.download = 'map.json';

        doc.body.appendChild(anchor);
        anchor.click();
    };


    // Export JSON
    q$('#export').addEventListener('click', function (e) {
        e.preventDefault();

        exportData();
    });


    // Load existing data
    XHR('map.json', {callback: init});


    // Postload support files
    loadScript('media/js/marked.js', initMarkdownEditor);
}(window, document));