// Perform client side search with suggestions
var quikSearch = function (form, config) {
    var config          = config || {},
        callbacks       = config.callbacks || {},
        data            = config.data,
        searchIndex     = [],
        suggestionEl,
        el;


    if (form && form.tagName === 'FORM') {
        el = form.querySelector('input[type="search"]');
    }

    // Reasons to quit
    if (!el || !data || !Array.isArray(data)) {
        console.log('No element to attach to or no data to search.');
        return;
    }

    // Add defaults (TODO: Reconsider template)
    config.suggestionTemplate = config.suggestionTemplate || '<li class="{{itemClass}}" data-menu-item="{{itemIndex}}" data-index="{{index}}">{{title}}</li>';
    config.maxSuggestions = config.maxSuggestions || 10;

    // Suppress browser defaults
    el.setAttribute('autocapitalize', 'off');
    el.setAttribute('autocomplete', 'off');


    // Util: Soundex a string
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


    // Util: Strip markup from a string
    var stripHTML = function (html) {
        var tempEl = document.createElement('i'),
            txt;

        tempEl.innerHTML = html.split('>').join('> ');
        txt = (tempEl.textContent || tempEl.innerText || '');
        tempEl = null;

        return txt;
    };


    // Util: boil a string down into keywords
    var keyWords = function (txt) {
        if (!txt) {
            return '';
        }

        return txt
            .split(/\s+/)
            .filter(function(v) {
                return v.length > 2;
            })
            .filter(function(v, i, a) {
                return a.lastIndexOf(v) === i;
            })
            .join(' ');
    };


    // Util: Build case insensitive bolded markup
    var caseInsensitiveBold = function (word, trm) {
        var regex = new RegExp('(' + word + ')', 'gi');

        return trm.replace(regex, '<strong>$1</strong>');
    };


    // Util: Find nearest parent of tag type
    var nearestParent = function (el, tagName) {
        while (el.tagName != tagName) {
            el = el.parentNode;
        }

        return el;
    };


    // Util: apply template
    var applyTemplate = function (obj, template) {
        var tmpl = template || '';

        Object.keys(obj).forEach(function (key) {
            tmpl = tmpl.split('{{' + key + '}}').join(obj[key]);
        });

        return tmpl;
    }

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

        str = str.replace(/\W/g, ' ');          // Alphanumeric chars only
        str = keyWords(str).trim();             // Unique keywords only

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

            if (results.length > config.maxSuggestions) {
                return true;
            }
        });

        callbacks.search(el, results, term);

        console.log(results);
    };

    // UI interaction; move between keyed suggestions
    var navTo = function (keyCode) {
        var lis = suggestionEl.querySelectorAll('li'),
            active = suggestionEl.querySelector('.active'),
            lisCount = (lis.length - 1),
            activeIndex,
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

        if (callbacks.suggestionNav) {
            callbacks.suggestionNav(lis[activeIndex])
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
                selectedLink = (suggestionEl.querySelector('.active') || suggestionEl.querySelector('li', suggestionEl) || null);

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
    callbacks.blur = callbacks.blur || function (evt) {
        el.value = '';
        if (suggestionEl) {
            suggestionEl.innerHTML = '';
        }
    };
    el.addEventListener('blur', callbacks.blur, true);


    // Prevent form POSTs reaching server
    callbacks.submit = callbacks.submit || function (evt) {
        var activeEl;

        evt.preventDefault();

        if (suggestionEl) {
            activeEl = q$('.active', suggestionEl);

            if (activeEl) {
                activeEl.click();
            }
        }
    };
    form.addEventListener('submit', callbacks.submit);


    // Handle suggestion clicks
    callbacks.suggestionClick = callbacks.suggestionClick || function (el, evt) {
        console.log('Clicked');
    };


    // Handle suggestion hovers
    callbacks.suggestionHover = callbacks.suggestionHover || function (el, evt) {
        console.log('Hovered');
    };


    // Received matches, build UI
    callbacks.search = callbacks.search || function (input, results, term) {
        var lis = '';

        input = input || el;

        // Build DOM element
        if (!suggestionEl) {
            suggestionEl = document.createElement('ul');
            suggestionEl.className = 'searchSuggest';

            // Handle click evts
            suggestionEl.addEventListener('click', function (evt) {
                console.log('Bleh');
                callbacks.suggestionClick(nearestParent(evt.target, 'LI'), evt);
                input.blur();
            }, true);

            // Handle hover evts
            suggestionEl.addEventListener('mouseover', function (evt) {
                callbacks.suggestionHover(nearestParent(evt.target, 'LI'), evt);
            }, true);

            input.parentNode.appendChild(suggestionEl);
        }

        if (config.isMobile) {
            results.reverse();
        }

        results.forEach(function (result, index) {
            var item = {
                itemIndex : index,
                index     : result.index,
                title     : caseInsensitiveBold(term, result.title)
            };

            lis += applyTemplate(item, config.suggestionTemplate);
        });

        suggestionEl.innerHTML = lis || '';
    };


    // Public API
    return {
        callbacks       : callbacks,
        data            : getSearchIndex,
        nearestParent   : nearestParent,
        search          : searchKeyWord,
        suggestions     : suggestionEl
    };
};

var data = [
    {title: 'first Wan', description: 'a first wan desc'},
    {title: 'Second Wan', description: 'a second wan desc'},
    {title: 'Third Wan', description: 'a third wan desc'}
];


var config = {
    maxsuggestions      : 12,
    suggestionTemplate  : document.getElementById('navigationTemplate').innerHTML,
    data                : data,
    isMobile            : false,
    callbacks           : {
        suggestionNav   : function (el) {
            console.log('Navigation happening' + el.innerHTML);
            return;
            var markerIndex = parseInt(el.getAttribute('data-index'), 10);

            if (markers[markerIndex]) {
                gmap.panTo(markers[markerIndex].mark.getPosition());
            }
        },
    }
}

var search = quikSearch(document.querySelector('.searchForm'), config);

/*
 callbacks.submit = function () {},
 callbacks.blur = function () {},
 callbacks.search = function () {},
 callbacks.suggestionNav = function () {},
 callbacks.suggestionClick = function (el) {
 showMarkerDetail(markers[parseInt(el.getAttribute('data-index'), 10)]);
 },
 callbacks.suggestionHover = function (el) {
 var index = parseInt(el.getAttribute('data-index'), 10);

 if (markers[index]) {
 gmap.panTo(markers[index].mark.getPosition());
 }
 }


 */
