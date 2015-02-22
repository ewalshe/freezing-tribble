
// informational modal
var modal = function (selector) {
    var doc         = document,
        docEl       = doc.documentElement,
        modal       = doc.querySelector(selector || '#modal'),
        detail      = modal.querySelector('article'),
        active      = false,
        activeEl;


    // Is modal visible to user?
    var isActive = function () {
        return active;
    };


    // populate modal contents
    var populate = function (markup) {
        detail.innerHTML = markup;
        detail.scrollTop = 0;

        return modal;
    };


    // show modal
    var show = function (content) {
        activeEl = doc.activeElement || null;

        if (content && content.length > 0) {
            populate(content);
        }

        docEl.classList.add('modalActive');
        detail.focus();
        active = true;

        return modal;
    };


    // Hide modal
    var hide = function () {
        docEl.classList.remove('modalActive');
        doc.location.hash = '';
        active = false;

        if (activeEl && activeEl.focus) {
            activeEl.focus();
        } else {
            $detail.blur();
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
    modal.querySelector('.closeModal').addEventListener('click', hide, false);


    // API
    return {
        active      : isActive,
        hide        : hide,
        populate    : populate,
        show        : show
    };
} ();