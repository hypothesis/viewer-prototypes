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

  function positionCards(cards, offset, shouldAnimate) {
    each(cards, function (card) {
      var transformProp = 'transform';
      var prefixes = ['webkit', 'moz', 'ms', 'o'];

      while (!(transformProp in card.style)) {
        transformProp = prefixes.pop() + 'Transform';
      }

      var current = parseFloat((/-?\d+/.exec(card.style[transformProp]) || [])[0]);
      if (current && shouldAnimate) {
        animate(current, offset, 300, function step(value) {
          card.style[transformProp] = 'translateY(' + value + 'px)';
        });
      } else {
        card.style[transformProp] = 'translateY(' + offset + 'px)';
      }
    });
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

  var annotations = Object.keys(highlightsIndex).reduce(function (map, key) {
    map[key] = {
      id: key,
      cards: cardsIndex[key],
      highlights: highlightsIndex[key],
    };
    return map;
  }, {});
  var annotationsList = toArray(annotations);

  var activeAnnotation = annotationsList[0];

  var update = (function update(windowScrollY, shouldAnimate) {
    var activeAnnotationIndex = annotationsList.indexOf(activeAnnotation);
    var startOffset = activeAnnotation.highlights[0].offsetTop;
    var currentOffset = startOffset

    var forwards = annotationsList.slice(activeAnnotationIndex);
    var backwards = annotationsList.slice(0, activeAnnotationIndex).reverse();

    each(forwards, function (ann) {
      var offset = ann.highlights[0].offsetTop;
      var height = ann.cards[0].offsetHeight;

      if (offset <= currentOffset) {
        offset = currentOffset;
      }

      positionCards(ann.cards, offset - windowScrollY, shouldAnimate);

      currentOffset = offset + height + 10;
    });

    currentOffset = startOffset
    each(backwards, function (ann) {
      var offset = ann.highlights[0].offsetTop;
      var height = ann.cards[0].offsetHeight;
      var lowerBound = offset + height + 10;

      if (lowerBound >= currentOffset) {
        offset = currentOffset - height - 10;
      }

      positionCards(ann.cards, offset - windowScrollY, shouldAnimate);

      currentOffset = offset;
    });

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
        el.classList.remove('js-active');
      });

      var elements = [].concat(activeAnnotation.highlights, activeAnnotation.cards);
      elements.forEach(function (el) {
        el.classList.add('js-active');
      });


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
        update(newScrollY, true);
        return;
      }

      if (windowBoundsBottom < highlightBoundsBottom) {
        newScrollY = highlightBoundsBottom - window.innerHeight + 100;
        scrollTo(newScrollY, 300);
        update(newScrollY, true);
        return;
      }

      // Enable animation.
      document.documentElement.classList.add('js-animate-annotation-list');
      setTimeout(function () {
        document.documentElement.classList.remove('js-animate-annotation-list');
      }, 300);
      update(window.scrollY);
    }
  }, false);
})();
