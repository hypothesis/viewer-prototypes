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

  function positionCards(cards, offset, duration) {
    each(cards, function (card) {
      translateElement(card, offset, duration);
    });
  }

  function translateElement(el, offset, duration) {
    var prop = transformProp();
    var current = parseFloat((/-?\d+/.exec(el[prop]) || [])[0]);
    duration = duration || 0;

    if (current && duration) {
      animate(current, offset, duration, function step(value) {
        el.style[prop] = 'translateY(' + value + 'px)';
      });
    } else {
      el.style[prop] = 'translateY(' + offset + 'px)';
    }
  }

  function transformProp() {
    if (!transformProp.cache) {
      var prop = 'transform';
      var prefixes = ['webkit', 'moz', 'ms', 'o'];

      while (!(prop in document.body.style)) {
        prop = prefixes.pop() + 'Transform';
      }

      transformProp.cache = prop;
    }
    return transformProp.cache;
  }

  function animate(from, to, duration, fn, done) {
    var diff = to - from;
    var start = new Date().getTime();

    // t: current time, b: begInnIng value, c: change In value, d: duration
    function easeOutSine(t, b, c, d) {
      return c * Math.sin(t/d * (Math.PI/2)) + b;
    }

    function linear(t, b, c, d) {
      return ((t / d) * c) + b;
    }

    (function tick() {
      setTimeout(function () {
        var time = (new Date().getTime() - start);
        var value = linear(time, from, to - from, duration);
        fn(value);

        if (time < duration) {
          tick();
        } else {
          done && done();
        }
      }, 60 / 1000);
    })();
  }

  var isWindowScrolling = false;
  function scrollTo(to, duration) {
    isWindowScrolling = true;
    animate(window.scrollY, to, duration, function step(value) {
      window.scrollTo(0, value);
    }, function () {
      isWindowScrolling = false;
    });
  }

  var cards = toArray(document.querySelectorAll('.annotation-item'));
  var highlights = toArray(document.querySelectorAll('.hl'));

  var cardsIndex = cards.reduce(createAnnotationIndex, {});
  var highlightsIndex = highlights.reduce(createAnnotationIndex, {});

  var ANNOTATION = 'annotation';
  var COMMENT = 'comment';

  var annotations = Object.keys(cardsIndex).reduce(function (map, key) {
    map[key] = {
      id: key,
      type: highlightsIndex[key] ? ANNOTATION : COMMENT,
      cards: cardsIndex[key],
      highlights: highlightsIndex[key] || [{offsetTop: 0}],
    };
    return map;
  }, {});

  var annotationsList = toArray(annotations).sort(function (a, b) {
    var aOffset = a.highlights[0].offsetTop;
    var bOffset = b.highlights[0].offsetTop;

    if (aOffset === bOffset) {
      return 0;
    }
    return aOffset >= bOffset ? 1 : -1;
  });

  var commentHeading = document.querySelector('[data-comment-heading]');
  var annotationHeading = document.querySelector('[data-annotation-heading]');

  var activeAnnotation = annotationsList[0];

  var update = (function update(windowScrollY, duration) {
    var activeAnnotationIndex = annotationsList.indexOf(activeAnnotation);
    var startOffset = 15;
    var currentOffset = startOffset;

    // Comments heading
    // translateElement(commentHeading, currentOffset - windowScrollY, duration);
    // currentOffset += commentHeading.offsetHeight + 5;

    startOffset = Math.max(activeAnnotation.highlights[0].offsetTop, currentOffset);
    var forwards = annotationsList.slice(activeAnnotationIndex);
    var backwards = annotationsList.slice(0, activeAnnotationIndex).reverse();

    each(forwards, function (ann, index, list) {
      var offset = ann.highlights[0].offsetTop;
      var height = ann.cards[0].offsetHeight;

      if (offset <= currentOffset) {
        offset = currentOffset;
      }

      positionCards(ann.cards, offset - windowScrollY, duration);
      currentOffset = offset + height + 10;

      // var next = list[index + 1];
      // if (ann.type === COMMENT && next && next.type === ANNOTATION) {
      //   translateElement(annotationHeading, currentOffset - windowScrollY, duration);
      //   currentOffset += annotationHeading.offsetHeight + 10;
      // } else if (index === 0 && (backwards[backwards.length - 1] || {}).type === 'comment') {
      //   translateElement(annotationHeading, currentOffset - windowScrollY, duration);
      //   currentOffset += annotationHeading.offsetHeight + 10;
      // }
    });

    // Increase the height of the document
    if (currentOffset > document.documentElement.offsetHeight) {
      document.documentElement.style.height = currentOffset + 'px';
    }

    currentOffset = startOffset
    each(backwards, function (ann, index, list) {
      var offset = ann.highlights[0].offsetTop;
      var height = ann.cards[0].offsetHeight;
      var lowerBound = offset + height + 10;

      if (lowerBound >= currentOffset) {
        offset = currentOffset - height - 10;
      }

      positionCards(ann.cards, offset - windowScrollY, duration);
      currentOffset = offset;

      // var prev = list[index + 1] || forwards[forwards.length - 1];
      // if (ann.type === ANNOTATION && prev && prev.type === COMMENT) {
      //   translateElement(annotationHeading, offset - height - 10 - windowScrollY, duration);
      //   currentOffset += annotationHeading.offsetTop - 10;
      // }
    });

    // if (currentOffset < startOffset) {
    //   // Comments heading
    //   translateElement(commentHeading, currentOffset - windowScrollY, duration);
    //   currentOffset += commentHeading.offsetHeight + 5;
    // }
    //

    return update;
  })(window.scrollY);

  window.addEventListener('scroll', function () {
    if (!isWindowScrolling) {
      update(window.scrollY); // TODO: Throttle.
    }
  }, false);

  document.documentElement.addEventListener('click', function (event) {
    event.preventDefault();

    if (event.target.hasAttribute('data-annotation-id')) {
      var activeAnnotationKey = event.target.getAttribute('data-annotation-id');
      if (!annotations[activeAnnotationKey]) {
        return;
      }

      activeAnnotation = annotations[activeAnnotationKey];

      // Update active states.
      var active = toArray(document.querySelectorAll('.js-active'));
      active.forEach(function (el) {
        if (el.classList) {
          el.classList.remove('js-active');
        }
      });

      var elements = [].concat(activeAnnotation.highlights, activeAnnotation.cards);
      elements.forEach(function (el) {
        if (el.classList) {
          el.classList.add('js-active');
        }
      });

      document.querySelector('.annotation-list').classList.add('js-active-selection');

      var highlights = activeAnnotation.highlights;
      var firstHighlight = highlights[0];
      var lastHighlight = highlights[highlights.length - 1];
      var highlightBoundsTop = firstHighlight.offsetTop;
      var highlightBoundsBottom = lastHighlight.offsetTop + lastHighlight.offsetHeight;
      var windowBoundsTop = window.scrollY;
      var windowBoundsBottom = windowBoundsTop + window.innerHeight;
      var newScrollY;

      if (windowBoundsTop > highlightBoundsTop) {
        newScrollY = highlightBoundsTop - 30;
        scrollTo(newScrollY, 300);
        update(newScrollY, 300);
        return;
      }

      if (windowBoundsBottom < highlightBoundsBottom) {
        newScrollY = highlightBoundsBottom - window.innerHeight + 100;
        scrollTo(newScrollY, 300);
        update(newScrollY, 300);
        return;
      }

      // Enable animation.
      document.documentElement.classList.add('js-animate-annotation-list');
      setTimeout(function () {
        document.documentElement.classList.remove('js-animate-annotation-list');
      }, 300);
      update(window.scrollY);
    } else {
      // Remove active states.
      var active = toArray(document.querySelectorAll('.js-active'));
      active.forEach(function (el) {
        el.classList.remove('js-active');
      });

      document.querySelector('.annotation-list').classList.remove('js-active-selection');
    }
  }, false);

  // Hover states
  document.documentElement.addEventListener('mouseover', function (event) {
    return
    event.preventDefault();

    var el = event.target;
    if (el.hasAttribute('data-annotation-id')) {
      var activeAnnotationKey = event.target.getAttribute('data-annotation-id');
      if (!annotations[activeAnnotationKey]) {
        return;
      }

      var hoveredAnnotation = annotations[activeAnnotationKey];
      console.log(hoveredAnnotation);
      hoveredAnnotation.highlights.forEach(function (el) {
        el.classList.add('js-pulse');
      });

      hoveredAnnotation.cards.forEach(function (el) {
        el.classList.add('js-pulse');
      });
    }
  }, false);
})();
