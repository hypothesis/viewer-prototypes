// Creates a linked list of annotation cards. Each card keeps track of its
// original and current position. When a card is anchored (placed next to
// it's highlight) depending on the direction it moves it moves the cards
// around it into positon.
//
// 1) When moving downwards it forces any cards below it downwards too. Cards
//    above are pulled downwards until they reach their own anchor position or
//    they sit just above the lower card.
// 2) When moving upwards it forces cards above it upwards and cards below
//    are pulled to their own anchor point or until they sit below the upper
//    card.
//
// An upper/lower card is only moved if it falls into the movement bounds
// created by the repositioning of the current card. For example if a card
// is moved downward but the next card is still far below it, this card will
// not be updated. This ensures that only cards that need to be repositioned
// are.
var CASCADE_FORWARDS = 'forwards';
var CASCADE_BACKWARDS = 'backwards';
var CASCADE_BOTH = 'both';
var OFFSET = 15;

function isIntersecting(a, b) {
  return (a.top >= b.top && a.top <= b.bottom) || (a.bottom >= b.top && a.bottom <= b.bottom);
}

function Card(el, prev, anchorTop) {
  this.el = el;
  this.top = anchorTop || 0;
  this.height = el.offsetHeight;
  this.anchorTop = this.top;
  this.prev = prev || null;

  if (prev) {
    prev.next = this;
  }
}

Card.prototype = {
  constructor: Card,
  get bottom() {
    return this.top + this.height;
  },
  set bottom(val) {
    this.top = val - this.height;
  },
  anchor: function () {
    this.update(this.anchorTop, {force: true});
  },
  update: function (position, options) {
    options = options || {};

    var oldTop = this.top;
    var oldBottom = this.bottom;
    var prev = this.prev;
    var next = this.next;
    var cascadeForwards  = options.direction !== CASCADE_BACKWARDS;
    var cascadeBackwards = options.direction !== CASCADE_FORWARDS;
    var limitMethod = cascadeBackwards ? 'min' : 'max';
    var bounds;

    if (this.top === position) {
      return;
    }

    if (options.force) {
      this.top = position;
    } else {
      this.top = Math[limitMethod](position, this.anchorTop);
    }

    if (position > oldTop) {
      // Moving the card down.
      bounds = {top: oldTop, bottom: position + this.height};

      // Force bottom card into position if it's in our bounds.
      if (cascadeForwards && next && next.isIntersecting(bounds)) {
        next.update(this.bottom + OFFSET, {
          force: true,
          direction: CASCADE_FORWARDS,
        });
      }

      // Pull top card as far as it needs to go.
      if (cascadeBackwards && prev) {
        prev.updateBottom(this.top - OFFSET, {
          direction: CASCADE_BACKWARDS,
        });
      }
    } else {
      // Moving the card up.
      bounds = {top: position, bottom: oldBottom};

      // Force bottom card into position if it's in our bounds.
      if (cascadeBackwards && prev && prev.isIntersecting(bounds)) {
        prev.updateBottom(this.top - OFFSET, {
          force: true,
          direction: CASCADE_BACKWARDS,
        });
      }

      // Pull top card as far as it needs to go.
      if (cascadeForwards && next) {
        next.update(this.bottom + OFFSET, {
          direction: CASCADE_FORWARDS,
        });
      }
    }
  },
  updateBottom: function (position, options) {
    return this.update(position - this.height, options);
  },
  isIntersecting: function (bounds) {
    return isIntersecting(this, bounds);
  },
  draw: function (offset) {
    offset = offset || 0;
    this.el.style.top = (this.top - offset) + 'px';
    return this;
  }
}
