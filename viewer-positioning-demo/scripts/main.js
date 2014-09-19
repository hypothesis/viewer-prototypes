(function () {
  'use strict';

  function toArray(obj) {
    if (!obj) {
      return [];
    }

    if (typeof obj.length === 'number') {
      return [].slice.call(obj);
    }

    var results = [];
    each(obj, function (value) { results.push(value); });
    return results;
  }

  function each(obj, fn, ctx) {
    if (Array.isArray(obj)) {
      obj.forEach(fn, ctx);
    } else {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          fn.call(obj, obj[key], key, obj);
        }
      }
    }
  }

  function createAnnotationIndex(map, el) {
    var key = el.getAttribute('data-annotation-id');
    if (!Array.isArray(map[key])) {
      map[key] = [];
    }
    map[key].push(el);
    return map;
  }

  var cards = toArray(document.querySelectorAll('.annotation-item'));
  var highlights = toArray(document.querySelectorAll('.hl'));

  var cardsIndex = cards.reduce(createAnnotationIndex, {});
  var highlightsIndex = highlights.reduce(createAnnotationIndex, {});

  // Create a hash of annotations by id.
  var annotations = Object.keys(cardsIndex).reduce(function (map, key) {
    var highlights = highlightsIndex[key] || [];

    map[key] = new Card(cardsIndex[key][0], map[key -1], (highlights[0] || {}).offsetTop || 0);
    return map;
  }, {});

  // Create a sorted list of annotations by position.
  var annotationsList = toArray(annotations).sort(function (a, b) {
    var aOffset = a.anchorTop;
    var bOffset = b.anchorTop;

    if (aOffset === bOffset) {
      return a.score > b.score ? 1 : -1;
    }
    return aOffset >= bOffset ? 1 : -1;
  });

  var activeAnnotation = annotationsList[0];

  // Redraws all annotations in the list.
  var update = (function update(windowScrollY, duration) {
    var ann = annotationsList[0];
    while(ann = ann.draw(windowScrollY).next);

    // Extend the bottom of the document.
    document.documentElement.style.marginBottom = annotationsList[annotationsList.length - 1].bottom - document.documentElement.offsetHeight + 15 + 'px';

    return update;
  })(window.scrollY);

  // Performs initial layout of annotations.
  (function layout(windowScrollY) {
    var ann = annotationsList[0];
    var pos;
    do {
      pos = Math.max(ann.anchorTop, ann.prev && ann.prev.bottom + 15);
      ann.top = pos;
    } while (ann = ann.next);

    update(windowScrollY);
  })();

  // Keep cards aligned while scrolling.
  window.addEventListener('scroll', function () {
    update(window.scrollY); // TODO: Throttle.
  }, false);

  // Anchor the clicked card by it's highlight
  document.documentElement.addEventListener('click', function (event) {
    event.preventDefault();

    if (event.target.hasAttribute('data-annotation-id')) {
      var activeAnnotationKey = event.target.getAttribute('data-annotation-id');
      var ann;

      if (!annotations[activeAnnotationKey]) {
        return;
      }

      activeAnnotation = annotations[activeAnnotationKey];
      activeAnnotation.anchor();
      update(window.scrollY);
    } else {
      // Reset the active annotation.
      activeAnnotation = annotationsList[0];
    }
  }, false);
})();
