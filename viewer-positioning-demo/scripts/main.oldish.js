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

  function isIntesecting(a, b) {
    return (a.top >= b.top && a.top <= b.bottom) || (a.bottom >= b.top && a.bottom <= b.bottom);
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

  function createItem(el, anchorTop) {
    return {
      el: el,
      top: anchorTop,
      get bottom() {
        return this.top + this.height;
      },
      height: el.offsetHeight,
      anchorTop: anchorTop
    };
  }

  var annotations = Object.keys(cardsIndex).reduce(function (map, key) {
    var highlights = highlightsIndex[key] || [];

    var item = createItem(cardsIndex[key][0], (highlights[0] || {}).offsetTop || 0);
    item.id = key;
    item.score = parseFloat(key);
    item.hidden = true;
    item.type = highlights.length ? ANNOTATION : COMMENT;

    map[key] = item;
    return map;
  }, {});

  var annotationsList = toArray(annotations).sort(function (a, b) {
    var aOffset = a.anchorTop;
    var bOffset = b.anchorTop;

    if (aOffset === bOffset) {
      return a.score > b.score ? 1 : -1;
    }
    return aOffset >= bOffset ? 1 : -1;
  });

  annotationsList.forEach(function (ann, index, list) {
    ann.prev = list[index - 1] || null;
    ann.next = list[index + 1] || null;
  });

  var commentHeading = document.querySelector('[data-comment-heading]');
  var annotationHeading = document.querySelector('[data-annotation-heading]');

  var activeAnnotation = annotationsList[0];

  function findCollision() {
    for (var index = 0; index < annotationList; index += 1) {
      if (isIntesecting()) {
        return card;
      }
    }
  }

  function move(ann, position, windowScrollY, direction) {
    var prev = ann.prev;
    var next = ann.next;
    var oldAnnTop = ann.top;
    var oldAnnBottom = ann.bottom;
    var onlyPrev   = direction === 'prev';
    var onlyNext = direction === 'next';
    var bounds, prevPosition, nextPosition;

    if (direction === undefined) {
      onlyPrev = onlyNext = true;
    }

    if (position === ann.top) {
      return;
    }

    ann.top = position;
    translateElement(ann.el, ann.top - windowScrollY);

    if (position > oldAnnTop) {
      // Moving the card down.
      bounds = {top: oldAnnTop, bottom: position + ann.height};

      // Force bottom card into position if it's in our bounds.
      if (onlyNext && next && isIntesecting(next, bounds)) {
        move(next, position + ann.height + 15, windowScrollY, 'next');
      }

      // Pull top card as far as it needs to go.
      if (onlyPrev && prev && next !== null) {
        prevPosition = Math.min(position - 15 - prev.height, prev.anchorTop);
        move(prev, prevPosition, windowScrollY, 'prev');
      }
    } else {
      // Moving the card up.
      bounds = {top: position, bottom: oldAnnBottom};

      // Force top card into position if it's in our bounds.
      if (onlyPrev && prev && isIntesecting(prev, bounds)) {
        move(prev, position - prev.height - 15, windowScrollY, 'prev');
      }

      // Pull bottom card as far as it needs to go.
      if (onlyNext && next && prev !== null) {
        nextPosition = Math.max(position + ann.height + 15, next.anchorTop);
        move(next, nextPosition, windowScrollY, 'next');
      }
    }
  }

  function layout(windowScrollY) {
    function findIntersections(ann) {
      return annotationsList.filter(function (a) {
        return !a.hidden && a.id !== ann.id && isIntesecting(ann, a);
      }).pop() || null;
    }

    var annotations = annotationsList.slice();

    var currentScore = activeAnnotation.score;

    // Sort the annotations so we place the active one, then the next one
    // above and below and so on.
    annotations = annotations.sort(function (a, b) {
      var aScore = Math.abs(currentScore - a.score);
      var bScore = Math.abs(currentScore - b.score);
      if (aScore === bScore) {
        return 0;
      }
      return aScore > bScore ? 1 : -1;
    });
    each(annotations, function (ann) {
      // Place all cards at the starting position.
      // Score all cards 0 being selected +1 for after -1 for before.
      // Place a card at its current position and check for collitions.
      // Move it up/down depending on the score of it's other.
      // Rinse & repeat.
      var collision, count = 0;
      while (collision = findIntersections(ann)) {
        count++;
        if (count > 10) {
          throw new Error('unable to place annotation: ' + ann.id);
        }

        if (ann.score > collision.score) {
          ann.top = collision.top + collision.height + 15;
        } else {
          ann.top = collision.top - ann.height - 15;
        }
      }

      ann.hidden = false;
      translateElement(ann.el, ann.top - windowScrollY);
    });
  }

  var update = (function update(windowScrollY, duration) {
    layout(windowScrollY);
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
      //
      // // Update active states.
      // var active = toArray(document.querySelectorAll('.js-active'));
      // active.forEach(function (el) {
      //   if (el.classList) {
      //     el.classList.remove('js-active');
      //   }
      // });

      // var elements = [].concat(activeAnnotation.highlights, activeAnnotation.card);
      // elements.forEach(function (el) {
      //   if (el.classList) {
      //     el.classList.add('js-active');
      //   }
      // });

      // document.querySelector('.annotation-list').classList.add('js-active-selection');
      //
      // var highlights = activeAnnotation.highlights;
      // var firstHighlight = highlights[0];
      // var lastHighlight = highlights[highlights.length - 1];
      // var highlightBoundsTop = firstHighlight.top;
      // var highlightBoundsBottom = lastHighlight.top + lastHighlight.offsetHeight;
      // var windowBoundsTop = window.scrollY;
      // var windowBoundsBottom = windowBoundsTop + window.innerHeight;
      // var newScrollY;
      //
      // if (windowBoundsTop > highlightBoundsTop) {
      //   newScrollY = highlightBoundsTop - 30;
      //   scrollTo(newScrollY, 300);
      //   update(newScrollY, 300);
      //   return;
      // }
      //
      // if (windowBoundsBottom < highlightBoundsBottom) {
      //   newScrollY = highlightBoundsBottom - window.innerHeight + 100;
      //   scrollTo(newScrollY, 300);
      //   update(newScrollY, 300);
      //   return;
      // }
      //
      // // Enable animation.
      // document.documentElement.classList.add('js-animate-annotation-list');
      // setTimeout(function () {
      //   document.documentElement.classList.remove('js-animate-annotation-list');
      // }, 300);
      move(activeAnnotation, activeAnnotation.anchorTop, window.scrollY);
      document.documentElement.style.marginBottom = annotationsList[annotationsList.length - 1].bottom - document.documentElement.offsetHeight + 15 + 'px';
    } else {
      // Remove active states.
      // var active = toArray(document.querySelectorAll('.js-active'));
      // active.forEach(function (el) {
      //   el.classList.remove('js-active');
      // });
      //
      // document.querySelector('.annotation-list').classList.remove('js-active-selection');
      activeAnnotation = annotationsList[0];
    }
  }, false);
})();
