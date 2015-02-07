// Travelling focus highlight
;(function() {
    var doc = document,
        docEl = doc.documentElement,
        DURATION = 250,
        movingId = 0,
        prevFocused = null,
        isFirstFocus = true,
        keyDownTime = 0,
        flyingFocus, flyStyle, style;


    if (doc.getElementById('flying-focus')) {
        return;
    }

    flyingFocus = doc.createElement('flying-focus');
    flyingFocus.id = 'flying-focus';
    doc.body.appendChild(flyingFocus);

    flyStyle = flyingFocus.style;
    flyStyle.transitionDuration = flyStyle.WebkitTransitionDuration = DURATION / 1000 + 's';

    function offsetOf(elem) {
        var rect = elem.getBoundingClientRect(),
            docElem = docEl,
            win = doc.defaultView,
            body = doc.body,
            clientTop  = docElem.clientTop  || body.clientTop  || 0,
            clientLeft = docElem.clientLeft || body.clientLeft || 0,
            scrollTop  = win.pageYOffset || docElem.scrollTop  || body.scrollTop,
            scrollLeft = win.pageXOffset || docElem.scrollLeft || body.scrollLeft,
            top  = rect.top  + scrollTop  - clientTop,
            left = rect.left + scrollLeft - clientLeft;


        return {top: top, left: left};
    };

    docEl.addEventListener('keydown', function(event) {
        var code = event.which;

        if (code === 9 || (code > 36 && code < 41)) {
            keyDownTime = now();
        }
    }, false);

    docEl.addEventListener('focus', function(event) {
        var target = event.target,
            offset;


        if (target.id === 'flying-focus') {
            return;
        }

        offset = offsetOf(target);
        flyStyle.left = offset.left + 'px';
        flyStyle.top = offset.top + 'px';
        flyStyle.width = target.offsetWidth + 'px';
        flyStyle.height = target.offsetHeight + 'px';

        if (isFirstFocus) {
            isFirstFocus = false;
            return;
        }

        if (now() - keyDownTime > 42) {
            return;
        }

        onEnd();
        target.classList.add('flying-focus_target');
        flyingFocus.classList.add('flying-focus_visible');
        prevFocused = target;
        movingId = setTimeout(onEnd, DURATION);
    }, true);

    docEl.addEventListener('blur', function() {
        onEnd();
    }, true);

    function onEnd() {
        if (!movingId) {
            return;
        }

        clearTimeout(movingId);
        movingId = 0;
        flyingFocus.classList.remove('flying-focus_visible');
        prevFocused.classList.remove('flying-focus_target');
        prevFocused = null;
    };

    function now() {
        return new Date().valueOf();
    };


    style = document.createElement('style');
    style.textContent = "#flying-focus{\
            background:transparent;\
            box-shadow:0 0 2px 3px #78aeda, 0 0 2px #78aeda inset; border-radius: 2px;\
            margin:0;\
            -webkit-transition-property:left, top, width, height, opacity;\
            transition-property:left, top, width, height, opacity;\
            -webkit-transition-timing-function:cubic-bezier(0, 0.2, 0, 1);\
            transition-timing-function:cubic-bezier(0, 0.2, 0, 1);\
            pointer-events:none;\
            position:absolute;\
            visibility:hidden\
        }\
        #flying-focus.flying-focus_visible{\
            visibility:visible;\
            z-index:9999\
        }\
        .flying-focus_target{\
            outline:none!important\
        }\
        .flying-focus_target::-moz-focus-inner {\
            border:0!important\
        }\
        @media screen and (-webkit-min-device-pixel-ratio: 0){\
            #flying-focus{\
                box-shadow:none;\
                outline:5px auto -webkit-focus-ring-color;\
                outline-offset:-3px\
            }\
        }\
    ";
    doc.body.appendChild(style);
}) ();