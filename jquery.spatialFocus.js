/**
 * jQuery.spatialFocus
 * spatialFocus provides a map of the focusable elements on a page, where each entry in the map corresponds to an element, and
 * has links to the closest element above, below, to the left, and to the right.
 * You can use this map with keyboard events so that arrow keys follow the links in the map or it can be used to implement
 * remote control of the page.
 *
 * William Lahti <liam@slvr.tv>
 * This plugin is provided under the terms of the MIT License.
 *
 */

!function(document, window, undefined) {

	/**
	 * @private
	 */
	var scrollIfNeeded = function (el) {
		var topOfPage = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
		var heightOfPage = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
		var elY = 0;
		var elH = 0;
		if (document.layers) { // NS4
			elY = el.y;
			elH = el.height;
		} else {
			for(var p=el; p&&p.tagName!='BODY'; p=p.offsetParent){
				elY += p.offsetTop;
			}
			elH = el.offsetHeight;
		}

		if ((topOfPage + heightOfPage) < (elY + elH)) {
			el.scrollIntoView(false);
		} else if (elY < topOfPage) {
			el.scrollIntoView(true);
		}
	};

	/**
	 * @private
	 */
	var setupOptions = function(options) {
		options = $.extend({
			focusable: 'a, button, input, select, textarea, .focusable'
		}, options || {});
		return options;
	};

	/**
	 * Install keyboard events on the selected elements which follow spatialFocus' element links.
	 * The arrow keys will become usable for changing the focused element.
	 */
	$.fn.spatialKeyboardFocus = function(options) {
		options = setupOptions(options);
		
		var map = null;
		var mapTimestamp = new Date();
		var query = this;
		var keys = {k40: 'down', k38: 'up', k39: 'right', k37: 'left'};

		$(options.focusable, this).keydown(function(ev) {
			if (ev.which == 9 || ev.target.nodeName.toLowerCase() == 'textarea')
				return true;

			// Select the correct link

			var keycode = ev.which;
			if (!keys['k'+keycode])
				return;
			
			var link = keys['k'+keycode];

			if (map == null || mapTimestamp.getTime() + 1000*5 < (new Date()).getTime()) {
				map = query.spatialLinkMap(options);
			}

			if (ev.target.spatialLinkMapEntry) {
				var entry = ev.target.spatialLinkMapEntry;
				if (entry[link+'Link']) {
					var destElement = entry[link+'Link'].element;
					$(destElement).focus();
					scrollIfNeeded(destElement);
					return false;
				}
			}
		});
	};

	/**
	 * Generate a spatial link map of the selected elements. Elements which are
	 * not included in the query will not be included in the map. For a whole page,
	 * use $(document).spatialLinkMap().
	 *
	 * Options			Type		Default							Description
	 * focusable		string		'a, button, ..., .focusable'	Selector which determines which elements are considered focusable
	 *
	 */
	$.fn.spatialLinkMap = function(options) {
		options = setupOptions(options);
		
		var map = [];
		$(options.focusable, this).each(function(i,e) {
			if (!$(e).is(':visible'))
				return;

			var bounds = $(e).offset();
			var item = {
				element: e,
				text: $(e).html(),
				left: bounds.left,
				top: bounds.top,
				x: 0,
				y: 0,
				w: $(e).width(),
				h: $(e).height(),

				upLink: null,
				downLink: null,
				leftLink: null,
				rightLink: null
			};
			e.spatialLinkMapEntry = item;

			item.x = item.left + item.w / 2;
			item.y = item.top + item.h / 2;

			map.push(item);
		});

		var findClosestMatch = function(item, precondition, scoring) {
			var closestMatch = null;
			var closestScore = 0;
			$(map).each(function(i,other) {
				if (item == other)
					return;

				if (!precondition(other))
					return;

				var horizScore = 1 - Math.abs(item.x - other.x) / screenWidth;
				var vertScore = 1 - Math.abs(item.y - other.y) / screenHeight;
				var score = scoring(horizScore, vertScore, other);

				if (score > closestScore) {
					closestMatch = other;
					closestScore = score;
					return;
				}
			});

			return closestMatch;
		};

		var screenWidth = $(document).width();
		var screenHeight = $(document).height();

		// Now find the closest "up" elements
		$(map).each(function(i,item) {
			var scalar = 5;

			item.upLink = findClosestMatch(item, function(other) {
				return other.y - item.y < -2;
			}, function(horizScore, vertScore, other) {
				return horizScore * scalar + vertScore;
			});
			item.downLink = findClosestMatch(item, function(other) {
				return other.y - item.y > 2;
			}, function(horizScore, vertScore, other) {
				return horizScore * scalar + vertScore;
			});
			item.leftLink = findClosestMatch(item, function(other) {
				return other.x - item.x < -2;
			}, function(horizScore, vertScore, other) {
				return horizScore + vertScore * scalar;
			});
			item.rightLink = findClosestMatch(item, function(other) {
				return other.x - item.x > 2;
			}, function(horizScore, vertScore, other) {
				return horizScore + vertScore * scalar;
			});
		});

		return map;
	};

}(document,window);
