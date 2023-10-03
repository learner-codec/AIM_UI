"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _underscore = _interopRequireDefault(require("underscore"));

var _jquery = _interopRequireDefault(require("jquery"));

var _events = _interopRequireDefault(require("@girder/core/events"));

var _Panel = _interopRequireDefault(require("@girder/slicer_cli_web/views/Panel"));

var _auth = require("@girder/core/auth");

var _convert = _interopRequireDefault(require("@girder/large_image_annotation/annotations/geojs/convert"));

var _rectangle = _interopRequireDefault(require("@girder/large_image_annotation/annotations/geometry/rectangle"));

var _ellipse = _interopRequireDefault(require("@girder/large_image_annotation/annotations/geometry/ellipse"));

var _circle = _interopRequireDefault(require("@girder/large_image_annotation/annotations/geometry/circle"));

var _StyleCollection = _interopRequireDefault(require("../collections/StyleCollection"));

var _StyleModel = _interopRequireDefault(require("../models/StyleModel"));

var _editElement2 = _interopRequireDefault(require("../dialogs/editElement"));

var _editStyleGroups = _interopRequireDefault(require("../dialogs/editStyleGroups"));

var _drawWidget = _interopRequireDefault(require("../templates/panels/drawWidget.pug"));

var _drawWidgetElement = _interopRequireDefault(require("../templates/panels/drawWidgetElement.pug"));

require("../stylesheets/panels/drawWidget.styl");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

/**
 * Create a panel with controls to draw and edit
 * annotation elements.
 */
var DrawWidget = _Panel["default"].extend({
  events: _underscore["default"].extend(_Panel["default"].prototype.events, {
    'click .h-edit-element': 'editElement',
    'click .h-view-element': 'viewElement',
    'click .h-delete-element': 'deleteElement',
    'click .h-draw': 'drawElement',
    'click .h-group-count-option .h-group-count-select': 'selectElementsInGroup',
    'change .h-style-group': '_setToSelectedStyleGroup',
    'change .h-brush-shape,.h-brush-size,.h-brush-screen': '_changeBrush',
    'change .h-fixed-shape,.h-fixed-height,.h-fixed-width': '_changeShapeConstraint',
    'click .h-configure-style-group': '_styleGroupEditor',
    'mouseenter .h-element': '_highlightElement',
    'mouseleave .h-element': '_unhighlightElement',
    'click .h-dropdown-title': '_dropdownControlClick'
  }),

  /**
   * Create the panel.
   *
   * @param {object} settings
   * @param {ItemModel} settings.image
   *     The associate large_image "item"
   */
  initialize: function initialize(settings) {
    var _this = this;

    this.image = settings.image;
    this.annotation = settings.annotation;
    this.collection = this.annotation.elements();
    this.newElementDisplayIdStart = this.collection.length;
    this.viewer = settings.viewer;
    this.setViewer(settings.viewer);
    this.setAnnotationSelector(settings.annotationSelector);
    this._drawingType = settings.drawingType || null;
    this._localId = ((0, _auth.getCurrentUser)() || {}).id || 'local';
    this._editOptions = this._getEditOptions()[this._localId] || {};

    this._verifyEditOptions(this._editOptions, false);

    this._highlighted = {};
    this._groups = new _StyleCollection["default"]();
    this._style = new _StyleModel["default"]({
      id: this.parentView._defaultGroup
    });
    this.listenTo(this._groups, 'add change', this._handleStyleGroupsUpdate);
    this.listenTo(this._groups, 'remove', this.render);
    this.listenTo(this.collection, 'add remove reset', this._recalculateGroupAggregation);
    this.listenTo(this.collection, 'change update reset', this.render);

    this._groups.fetch().done(function () {
      // ensure the default style exists
      if (_this._groups.has(_this.parentView._defaultGroup)) {
        _this._style.set(_this._groups.get(_this.parentView._defaultGroup).toJSON());
      } else {
        _this._groups.add(_this._style.toJSON());

        _this._groups.get(_this._style.id).save();
      }

      if (_this._editOptions.style && _this._groups.get(_this._editOptions.style)) {
        _this._setStyleGroup(_this._groups.get(_this._editOptions.style).toJSON());
      }
    });

    this.on('h:mouseon', function (model) {
      if (model && model.id) {
        _this._highlighted[model.id] = true;

        _this.$(".h-element[data-id=\"".concat(model.id, "\"]")).addClass('h-highlight-element');
      }
    });
    this.on('h:mouseoff', function (model) {
      if (model && model.id) {
        _this._highlighted[model.id] = false;

        _this.$(".h-element[data-id=\"".concat(model.id, "\"]")).removeClass('h-highlight-element');
      }
    });
  },
  render: function render(updatedElement) {
    var _this2 = this;

    if (!this.viewer) {
      this.$el.empty();
      delete this._skipRenderHTML;
      return;
    }

    var name = (this.annotation.get('annotation') || {}).name || 'Untitled';

    if (!updatedElement || updatedElement.attributes && updatedElement.get('type') !== 'pixelmap') {
      this.trigger('h:redraw', this.annotation);
    }

    if (this._skipRenderHTML) {
      delete this._skipRenderHTML;
    } else {
      this.$el.html((0, _drawWidget["default"])({
        title: '画',
        //Draw
        elements: this.collection.models,
        groups: this._groups,
        style: this._style.id,
        defaultGroup: this.parentView._defaultGroup,
        highlighted: this._highlighted,
        name: name,
        opts: this._editOptions,
        drawingType: this._drawingType,
        pointDName: "点",
        rectangleDName: "矩形",
        ellipseDName: "椭圆",
        circleDName: "圈",
        polygonDName: "多边形",
        lineDName: "线",
        brushDName: "笔",
        countDname: "数量",
        collapsed: this.$('.s-panel-content.collapse').length && !this.$('.s-panel-content').hasClass('in'),
        firstRender: true,
        displayIdStart: 0
      }));
      this.$('.h-dropdown-content').collapse({
        toggle: false
      });
    }

    this.$('button.h-draw[data-type]').removeClass('active');

    if (this.$('.h-group-count-option').length > 0) {
      this.$('.h-group-count-options').append(this.$('.h-group-count-option'));
    } else {
      this.$('.h-group-count').hide();
    }

    if (this.$('.h-group-count-option.pixelmap').length > 0) {
      this.$('.h-group-count-option.pixelmap').remove();
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.collection.models[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var element = _step.value;

          if (element.attributes.type === 'pixelmap') {
            this.countPixelmap(element, 1);
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }

    if (this._drawingType) {
      this.$('button.h-draw[data-type="' + this._drawingType + '"]').addClass('active');
      this.drawElement(undefined, this._drawingType);
    }

    if (this.viewer.annotationLayer && this.viewer.annotationLayer._boundHUIModeChange !== this) {
      this.viewer.annotationLayer._boundHUIModeChange = this;
      this.viewer.annotationLayer.geoOff(geo.event.annotation.mode);
      this.viewer.annotationLayer.geoOn(geo.event.annotation.mode, function (event) {
        if (event.mode === _this2.viewer.annotationLayer.modes.edit || event.oldmode === _this2.viewer.annotationLayer.modes.edit) {
          return;
        }

        _this2.$('button.h-draw').removeClass('active');

        if (_this2._drawingType) {
          _this2.$('button.h-draw[data-type="' + _this2._drawingType + '"]').addClass('active');
        }

        if (event.mode !== _this2._drawingType && _this2._drawingType) {
          /* This makes the draw modes stay on until toggled off.
           * To turn off drawing after each annotation, add
           *  this._drawingType = null;
           */
          _this2.drawElement(undefined, _this2._drawingType);
        }
      });
    }

    this._updateConstraintValueInputs();

    return this;
  },

  /**
   * When a region should be drawn that isn't caused by a drawing button,
   * toggle off the drawing mode.
   *
   * @param {event} Girder event that triggered drawing a region.
   */
  _widgetDrawRegion: function _widgetDrawRegion(evt) {
    this._drawingType = null;
    this.$('button.h-draw').removeClass('active');
  },

  /**
   * Set the image "viewer" instance.  This should be a subclass
   * of `large_image/imageViewerWidget` that is capable of rendering
   * annotations.
   */
  setViewer: function setViewer(viewer) {
    this.viewer = viewer; // make sure our listeners are in the correct order.

    this.stopListening(_events["default"], 's:widgetDrawRegion', this._widgetDrawRegion);

    if (viewer) {
      this.listenTo(_events["default"], 's:widgetDrawRegion', this._widgetDrawRegion);
      viewer.stopListening(_events["default"], 's:widgetDrawRegion', viewer.drawRegion);
      viewer.listenTo(_events["default"], 's:widgetDrawRegion', viewer.drawRegion);
    }

    return this;
  },

  /**
   * Set the image 'annotationSelector' instance.
   */
  setAnnotationSelector: function setAnnotationSelector(annotationSelector) {
    this.annotationSelector = annotationSelector;
    return this;
  },

  /**
   * Respond to a click on the "edit" button by rendering
   * the EditAnnotation modal dialog.
   */
  editElement: function editElement(evt) {
    var _this3 = this;

    var origGroup = this.collection.get(this._getId(evt)).attributes.group;
    var dialog = (0, _editElement2["default"])(this.collection.get(this._getId(evt)));
    this.listenToOnce(dialog, 'h:editElement', function (obj) {
      if (obj.edited) {
        // update the html immediately instead of rerendering it
        var id = obj.element.id,
            label = (obj.data.label || {}).value,
            elemType = obj.element.get('type'),
            group = obj.data.group;
        var newLabel = '';

        var labelElement = _this3.$(".h-element[data-id=\"".concat(id, "\"] .h-element-label"));

        var oldLabel = labelElement.text().split(' ');

        if (label) {
          newLabel = label;
        } else if (['point', 'polyline', 'rectangle', 'ellipse', 'circle'].includes(elemType)) {
          var oldnum = parseInt(oldLabel[oldLabel.length - 1] || '');

          if (!_underscore["default"].isFinite(oldnum)) {
            oldnum = '';
          }

          newLabel = "".concat(group || _this3.parentView._defaultGroup, " ").concat(elemType, " ").concat(oldnum);
        } else {
          newLabel = oldLabel;
        }

        _this3.$(".h-element[data-id=\"".concat(id, "\"] .h-element-label")).text(newLabel).attr('title', label);

        if (origGroup !== group && ['point', 'polyline', 'rectangle', 'ellipse', 'circle'].includes(elemType)) {
          _this3.updateCount(origGroup || _this3.parentView._defaultGroup, -1);

          _this3.updateCount(group || _this3.parentView._defaultGroup, 1);
        }
      }

      _this3._skipRenderHTML = true;
    });
  },

  /**
   * Respond to a click on the "view" button by changing the
   * viewer location and zoom level to focus on one annotation
   */
  viewElement: function viewElement(evt) {
    var annot = this.collection._byId[(0, _jquery["default"])(evt.target).parent().attr('data-id')];

    var points;
    var pointAnnot = false;

    switch (annot.get('type')) {
      case 'point':
        points = [annot.get('center')];
        pointAnnot = true;
        break;

      case 'polyline':
        points = annot.get('points');
        break;

      case 'rectangle':
        points = (0, _rectangle["default"])(annot.attributes).coordinates[0];
        break;

      case 'ellipse':
        points = (0, _ellipse["default"])(annot.attributes).coordinates[0];
        break;

      case 'circle':
        points = (0, _circle["default"])(annot.attributes).coordinates[0];
        break;
    }

    var xCoords = points.map(function (point) {
      return point[0];
    });
    var yCoords = points.map(function (point) {
      return point[1];
    });
    var bounds = {
      left: Math.min.apply(Math, _toConsumableArray(xCoords)),
      top: Math.min.apply(Math, _toConsumableArray(yCoords)),
      right: Math.max.apply(Math, _toConsumableArray(xCoords)),
      bottom: Math.max.apply(Math, _toConsumableArray(yCoords))
    };
    var map = this.parentView.viewer;
    var originalZoomRange = map.zoomRange();
    map.zoomRange({
      min: Number.NEGATIVE_INFINITY,
      max: Number.POSITIVE_INFINITY
    });
    var newView = pointAnnot ? {
      center: {
        x: bounds.left,
        y: bounds.top
      },
      zoom: false
    } : map.zoomAndCenterFromBounds(bounds, map.rotation());
    map.zoomRange({
      min: originalZoomRange.origMin,
      max: originalZoomRange.max
    });

    if (Math.abs(newView.zoom - 1.5 - map.zoom()) <= 0.5 && map.zoom() < newView.zoom) {
      newView.zoom = false;
    }

    var distance = Math.pow(Math.pow(newView.center.x - map.center().x, 2) + Math.pow(newView.center.y - map.center().y, 2), 0.5);
    map.transition({
      center: newView.center,
      zoom: newView.zoom === false ? map.zoom() : newView.zoom - 1.5,
      duration: Math.min(1000, Math.max(100, distance)),
      endClamp: false,
      interp: distance < 500 ? undefined : window.d3.interpolateZoom,
      ease: window.d3.easeExpInOut
    });
    this._skipRenderHTML = true;
  },

  /**
   * Respond to a click on the "delete" button by removing
   * the element from the element collection.
   */
  deleteElement: function deleteElement(evt, id, opts) {
    if (evt) {
      id = this._getId(evt);
    }

    if (['point', 'polyline', 'rectangle', 'ellipse', 'circle'].includes(this.collection.get(id).attributes.type)) {
      this.updateCount(this.collection.get(id).attributes.group || this.parentView._defaultGroup, -1);
    } else if (this.collection.get(id).attributes.type === 'pixelmap') {
      this.countPixelmap(this.collection.get(id), -1);
    }

    this.$(".h-element[data-id=\"".concat(id, "\"]")).remove();
    this._skipRenderHTML = true;
    this.collection.remove(id, opts);
    this.newElementDisplayIdStart = +(this.$el.find('.h-element>span.h-element-label[display_id]').last().attr('display_id') || 0);
  },

  /**
   * Add a list of elements, updating the element container efficiently.
   *
   * @params {object[]} elements The list of elements to add to the
   *    collection.
   */
  addElements: function addElements(elements) {
    this._skipRenderHTML = true;
    elements = this.collection.add(elements);
    this.$el.find('.h-elements-container').append((0, _drawWidgetElement["default"])({
      elements: elements,
      style: this._style.id,
      defaultGroup: this.parentView._defaultGroup,
      highlighted: this._highlighted,
      firstRender: false,
      updateCount: this.updateCount,
      displayIdStart: this.newElementDisplayIdStart
    }));
    this.newElementDisplayIdStart += elements.length;

    if (this.$('.h-group-count-option.pixelmap').length > 0) {
      this.$('.h-group-count-option.pixelmap').remove();
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = this.collection.models[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var element = _step2.value;

          if (element.attributes.type === 'pixelmap') {
            this.countPixelmap(element, 1);
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
  },

  /**
   * Specify how precise ellipses are when converted to polygons.
   */
  _pixelTolerance: function _pixelTolerance() {
    /* null : use default,1/10 pixel at max map zoom */
    // return null;

    /* number : pixel tolerance at current screen resolution */
    return 0.25;
    /* number / unitsPerPixel(zoom) : pixel tolerance on base image */
    // return 0.5 / this.viewer.viewer.unitsPerPixel(this.viewer.viewer.zoom();
  },

  /**
   * Apply a boolean operation to the existign polygons.
   *
   * @param {geo.annotation[]} annotations The list of specified geojs
   *      annotations.
   * @param {object} opts An object with the current boolean operation.
   * @returns {boolean} true if the operation was handled.
   */
  _applyBooleanOp: function _applyBooleanOp(annotations, evtOpts) {
    var _this4 = this;

    if (!evtOpts.asPolygonList && (annotations.length !== 1 || !annotations[0].toPolygonList)) {
      return false;
    }

    var op = evtOpts.currentBooleanOperation;

    var existing = this.viewer._annotations[this.annotation.id].features.filter(function (f) {
      return ['polygon', 'marker'].indexOf(f.featureType) >= 0;
    });

    var polylist = evtOpts.asPolygonList ? annotations : annotations[0].toPolygonList({
      pixelTolerance: this._pixelTolerance()
    });

    if (!existing.length && polylist.length < 2) {
      return false;
    }

    var searchPoly = [];
    polylist.forEach(function (poly) {
      return poly[0].forEach(function (pt) {
        return searchPoly.push({
          x: pt[0],
          y: pt[1]
        });
      });
    });
    var near = existing.map(function (f) {
      return f.polygonSearch(searchPoly, {
        partial: true
      }, null);
    });

    if (!near.some(function (n) {
      return n.found.length;
    }) && polylist.length < 2) {
      return false;
    }

    var oldids = {};
    var geojson = {
      type: 'FeatureCollection',
      features: []
    };
    near.forEach(function (n) {
      return n.found.forEach(function (element) {
        // filter to match current style group
        if (element.properties.element && element.properties.element.group !== _this4._style.get('group')) {
          return;
        }

        element.properties.annotationId = element.properties.annotation;
        geojson.features.push(element);
        oldids[element.id] = true;
      });
    });

    if (!geojson.features.length && polylist.length < 2) {
      return false;
    }

    this.viewer.annotationLayer.removeAllAnnotations(undefined, false);
    this.viewer.annotationLayer.geojson(geojson);
    var opts = {
      correspond: {},
      keepAnnotations: 'exact',
      style: this.viewer.annotationLayer,
      pixelTolerance: this._pixelTolerance()
    };
    geo.util.polyops[op](this.viewer.annotationLayer, polylist, opts);
    var newAnnot = this.viewer.annotationLayer.annotations();
    this.viewer.annotationLayer.removeAllAnnotations(undefined, false);
    var elements = newAnnot.map(function (annot) {
      var result = (0, _convert["default"])(annot);

      if (!result.id) {
        result.id = _this4.viewer._guid();
      }

      return result;
    }).filter(function (annot) {
      return !annot.points || annot.points.length;
    });
    Object.keys(oldids).forEach(function (id) {
      return _this4.deleteElement(undefined, id, {
        silent: elements.length
      });
    });
    this.addElements(_underscore["default"].map(elements, function (el) {
      el = _underscore["default"].extend(el, _underscore["default"].omit(_this4._style.toJSON(), 'id'));

      if (!_this4._style.get('group')) {
        delete el.group;
      }

      return el;
    }));
    return true;
  },

  /**
   * When the brish is set to a specific screen size, adjust the size on zoom
   * events.
   */
  _brushPan: function _brushPan() {
    var zoom = this.viewer.viewer.zoom();

    if (zoom !== this._brushZoom) {
      this._brushZoom = zoom;
      var size = parseFloat(this._editOptions.brush_size) || 50;
      size *= this.viewer.viewer.unitsPerPixel(this._brushZoom);

      this._setBrushCoordinates(this.viewer.annotationLayer.annotations()[0], size);

      this.viewer.viewer.draw();
    }
  },

  /**
   * Based on the current mouse position, compute the size and position of
   * the current brush.
   *
   * @param {geo.annotation} annot The annotation to adjust.
   * @param {number} size The size of the brush.
   */
  _setBrushCoordinates: function _setBrushCoordinates(annot, size) {
    var center = this.viewer.viewer.interactor().mouse().mapgcs || {
      x: 0,
      y: 0
    };

    annot._coordinates([{
      x: center.x - size / 2,
      y: center.y - size / 2
    }, {
      x: center.x - size / 2,
      y: center.y + size / 2
    }, {
      x: center.x + size / 2,
      y: center.y + size / 2
    }, {
      x: center.x + size / 2,
      y: center.y - size / 2
    }]);

    annot.modified();
  },

  /**
   * Handle a click or drag action for the current brush.
   *
   * @param {geo.event} evt The event that trigger this.  This will either be
   *    a cursor_action or cursor_click event.  If no boolean operation is
   *    specified, it is a union operation.
   */
  _brushAction: function _brushAction(evt) {
    var annotations = this.viewer.annotationLayer.toPolygonList({
      pixelTolerance: this._pixelTolerance()
    });
    var elements = [(0, _convert["default"])(this.viewer.annotationLayer.annotations()[0])];

    if (!elements[0].id) {
      elements[0].id = this.viewer._guid();
    }

    var opts = {
      currentBooleanOperation: evt.operation || 'union',
      asPolygonList: true
    };

    if (evt.event === geo.event.annotation.cursor_action) {
      if (evt.operation && evt.operation !== 'union' && evt.operation !== 'difference') {
        return;
      } // if this is the same action as the previous one, "blur" the brush
      // shapes along the direction of travel


      if (this._lastBrushState && this._lastBrushState.stateId && this._lastBrushState.stateId === evt.evt.state.stateId) {
        var shape = this._editOptions.brush_shape || 'square';
        var size = parseFloat(this._editOptions.brush_size) || 50;

        if (this._editOptions.brush_screen) {
          size *= this.viewer.viewer.unitsPerPixel(this._brushZoom);
        }

        var bbox1 = this.viewer.annotationLayer.annotations()[0]._coordinates();

        var bbox2 = this._lastBrushState.bbox;

        if (bbox1[0].x !== bbox2[0].x || bbox1[0].y !== bbox2[0].y) {
          var blur;

          if (shape === 'square') {
            var order = (bbox1[0].x - bbox2[0].x) * (bbox1[0].y - bbox2[0].y) < 0 ? 0 : 1;
            blur = [[[[bbox1[order].x, bbox1[order].y], [bbox1[order + 2].x, bbox1[order + 2].y], [bbox2[order + 2].x, bbox2[order + 2].y], [bbox2[order].x, bbox2[order].y]]]];
          } else {
            var c1x = (bbox1[0].x + bbox1[2].x) * 0.5;
            var c1y = (bbox1[0].y + bbox1[2].y) * 0.5;
            var c2x = (bbox2[0].x + bbox2[2].x) * 0.5;
            var c2y = (bbox2[0].y + bbox2[2].y) * 0.5;
            var ang = Math.atan2(c2y - c1y, c2x - c1x) + Math.PI / 2;
            blur = [[[[c1x + size / 2 * Math.cos(ang), c1y + size / 2 * Math.sin(ang)], [c1x - size / 2 * Math.cos(ang), c1y - size / 2 * Math.sin(ang)], [c2x - size / 2 * Math.cos(ang), c2y - size / 2 * Math.sin(ang)], [c2x + size / 2 * Math.cos(ang), c2y + size / 2 * Math.sin(ang)]]]];
          }

          annotations = geo.util.polyops.union(annotations, blur);
          elements = [{
            type: 'polyline',
            closed: true,
            points: annotations[0][0].map(function (pt) {
              return {
                x: pt[0],
                y: -pt[1],
                z: 0
              };
            }),
            id: this.viewer._guid()
          }];
        }
      }

      this._lastBrushState = evt.evt.state;
      this._lastBrushState.bbox = this.viewer.annotationLayer.annotations()[0]._coordinates();
    } else {
      this._lastBrushState = null;
    }

    this._addDrawnElements(elements, annotations, opts);

    this._setBrushMode(true); // update sooner so that the hit test will work


    this.viewer.drawAnnotation(this.annotation);
  },

  /**
   * Switch to or update brush mode.
   *
   * @param {boolean} [forceRefresh] If true, update the annotation mode even
   *      if it hasn't changed.
   */
  _setBrushMode: function _setBrushMode(forceRefresh) {
    var _this5 = this;

    if (!this._brushPanBound) {
      this._brushPanBound = _underscore["default"].bind(this._brushPan, this);
    }

    this.viewer.annotationLayer.geoOff(geo.event.annotation.state);
    this.viewer.annotationLayer.geoOff(geo.event.annotation.cursor_click);
    this.viewer.annotationLayer.geoOff(geo.event.annotation.cursor_action);
    this.viewer.annotationLayer.geoOff(geo.event.pan, this._brushPanBound);
    this.viewer.annotationLayer.removeAllAnnotations();
    this.viewer.annotationLayer.geoOn(geo.event.annotation.cursor_click, function (evt) {
      return _this5._brushAction(evt);
    });
    this.viewer.annotationLayer.geoOn(geo.event.annotation.cursor_action, function (evt) {
      return _this5._brushAction(evt);
    });
    var shape = this._editOptions.brush_shape || 'square';
    var size = parseFloat(this._editOptions.brush_size) || 50;
    var scale = this._editOptions.brush_screen;

    if (scale) {
      this.viewer.annotationLayer.geoOn(geo.event.pan, this._brushPanBound);
      this._brushZoom = this.viewer.viewer.zoom();
      size *= this.viewer.viewer.unitsPerPixel(this._brushZoom);
    }

    var annot = geo.registries.annotations[shape === 'square' ? 'rectangle' : shape].func({
      layer: this.viewer.annotationLayer
    });
    this.viewer.annotationLayer.addAnnotation(annot);

    this._setBrushCoordinates(annot, size);

    this.viewer.annotationLayer.mode(this.viewer.annotationLayer.modes.cursor, annot);
    this._drawingType = 'brush';
    this.viewer.viewer.draw();
  },

  /**
   * After determining the elements intended by the current shape, add them
   * to the existing annotations with the appropriate boolean operation.
   *
   * @param {object[]} element An array of elements in our jsonschema format.
   * @param {geo.annotation[]|geo.polygonList} annotations The annotations to
   *    add in a geojs format.
   */
  _addDrawnElements: function _addDrawnElements(element, annotations, opts) {
    var _this6 = this;

    opts = opts || {};

    if (opts.currentBooleanOperation) {
      var processed = this._applyBooleanOp(annotations, opts);

      if (processed || ['difference', 'intersect'].indexOf(opts.currentBooleanOperation) >= 0) {
        this.drawElement(undefined, this._drawingType);
        return undefined;
      }
    } // add current style group information


    this.addElements(_underscore["default"].map(element, function (el) {
      el = _underscore["default"].extend(el, _underscore["default"].omit(_this6._style.toJSON(), 'id'));

      if (!_this6._style.get('group')) {
        delete el.group;
      }

      return el;
    }));
    this.drawElement(undefined, this._drawingType);
    return undefined;
  },

  /**
   * Respond to clicking an element type by putting the image viewer into
   * "draw" mode.
   *
   * @param {jQuery.Event} [evt] The button click that triggered this event.
   *      `undefined` to use a passed-in type.
   * @param {string|null} [type] If `evt` is `undefined`, switch to this draw
   *      mode.
   * @param {boolean} [forceRefresh] If true, update the annotation mode even
   *      if it hasn't changed.
   */
  drawElement: function drawElement(evt, type, forceRefresh) {
    var _this7 = this;

    var $el;

    if (evt) {
      $el = this.$(evt.currentTarget);
      $el.tooltip('hide');
      type = $el.hasClass('active') ? null : $el.data('type');
    } else {
      $el = this.$('button.h-draw[data-type="' + type + '"]');
    }

    if (this.viewer.annotationLayer.mode() === type && this._drawingType === type && (!type || this.viewer.annotationLayer.currentAnnotation) && !forceRefresh) {
      return;
    }

    if (this.viewer.annotationLayer.mode()) {
      this._drawingType = null;
      this.viewer.annotationLayer.mode(null);
      this.viewer.annotationLayer.geoOff(geo.event.annotation.state);

      if (this._brushPanBound) {
        this.viewer.annotationLayer.geoOff(geo.event.pan, this._brushPanBound);
      }

      this.viewer.annotationLayer.removeAllAnnotations();
    }

    if (type === 'brush') {
      this._setBrushMode(forceRefresh);
    } else if (type) {
      this.parentView._resetSelection(); // always show the active annotation when drawing a new element


      this.annotation.set('displayed', true);
      this._drawingType = type;
      var options = {
        modeOptions: {}
      };

      if (this._editOptions.size_mode === 'fixed_aspect_ratio') {
        options.modeOptions.constraint = this._editOptions.fixed_width / this._editOptions.fixed_height;
      } else if (this._editOptions.size_mode === 'fixed_size') {
        options.modeOptions.constraint = {
          width: this._editOptions.fixed_width,
          height: this._editOptions.fixed_height
        };
      }

      this.viewer.startDrawMode(type, options).then(function (element, annotations, opts) {
        return _this7._addDrawnElements(element, annotations, opts);
      });
    }

    this.$('button.h-draw[data-type]').removeClass('active');

    if (this._drawingType) {
      if (this.parentView.annotationSelector) {
        this.parentView.annotationSelector.selectAnnotationByRegionCancel();
      }

      this.$('button.h-draw[data-type="' + this._drawingType + '"]').addClass('active');
    }
  },
  cancelDrawMode: function cancelDrawMode() {
    this.drawElement(undefined, null);
    this.viewer.annotationLayer._boundHUIModeChange = false;
    this.viewer.annotationLayer.geoOff(geo.event.annotation.state);
  },
  drawingType: function drawingType() {
    return this._drawingType;
  },

  /**
   * Get the element id from a click event.
   */
  _getId: function _getId(evt) {
    return this.$(evt.currentTarget).parent('.h-element').data('id');
  },

  /**
   * Fetch the current edit options from browser local storage.  This is for
   * all users.
   *
   * @returns {object} The current edit options for all users.
   */
  _getEditOptions: function _getEditOptions() {
    var hui = {};

    try {
      hui = JSON.parse(window.localStorage.getItem('histomicsui') || '{}');
    } catch (err) {}

    if (!_underscore["default"].isObject(hui)) {
      hui = {};
    }

    return hui;
  },

  /**
   * Set the current edit options for the current user.
   *
   * @param {object} [opts] A dictionary of options to update the existing
   *      options.  If unspecified, just store the current options.
   */
  _saveEditOptions: function _saveEditOptions(opts) {
    var _this8 = this;

    var update = false;

    if (opts) {
      Object.entries(opts).forEach(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            key = _ref2[0],
            value = _ref2[1];

        if (_this8._editOptions[key] !== value) {
          _this8._editOptions[key] = value;
          update = true;
        }
      });
    }

    if (update || !opts) {
      this._verifyEditOptions(this._editOptions);

      try {
        var hui = this._getEditOptions();

        hui[this._localId] = this._editOptions;
        window.localStorage.setItem('histomicsui', JSON.stringify(hui));
      } catch (err) {
        console.warn('Failed to write localStorage');
        console.log(err);
      }
    }
  },

  /**
   * Validate a set of edit options.  Optional raise on error.
   *
   * @param {object} opts The options to validate and fix.
   * @param {boolean} [raiseOnError] If true, throw an error if validation
   *      fails.
   */
  _verifyEditOptions: function _verifyEditOptions(opts, raiseOnError) {
    if (raiseOnError && opts.brush_shape && ['square', 'circle'].indexOf(opts.brush_shape) < 0) {
      throw new Error('Brush is not a valid shape');
    }

    if (!opts.brush_shape || ['square', 'circle'].indexOf(opts.brush_shape) < 0) {
      opts.brush_shape = 'square';
    }

    if (raiseOnError && opts.brush_size && !(parseFloat(opts.brush_size) > 0)) {
      throw new Error('Brush size is not a positive number');
    }

    if (!opts.brush_size || !(parseFloat(opts.brush_size) > 0)) {
      opts.brush_size = 50;
    }

    if (!opts.size_mode) {
      opts.size_mode = 'unconstrained';
    }
  },
  updateCount: function updateCount(groupName, change) {
    var groupElem = (0, _jquery["default"])('.h-group-count-options > [data-group="' + groupName + '"]');

    if (groupElem.length > 0) {
      var newCount = parseInt(groupElem.attr('data-count')) + change;
      groupElem.attr('data-count', newCount);

      if (newCount > 0) {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = (0, _jquery["default"])('.h-group-count-option').toArray()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var group = _step3.value;
            var count = parseInt((0, _jquery["default"])(group).attr('data-count'));

            if (newCount > count) {
              (0, _jquery["default"])(group).before(groupElem);
              break;
            } else if (group !== groupElem[0] && newCount === count) {
              if ((0, _jquery["default"])(group).attr('data-group') < groupName) {
                (0, _jquery["default"])(group).after(groupElem);
              } else {
                (0, _jquery["default"])(group).before(groupElem);
              }

              break;
            } else if (group === (0, _jquery["default"])('.h-group-count-options:last-child')[0]) {
              (0, _jquery["default"])(group).after(groupElem);
            }
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
              _iterator3["return"]();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }

        groupElem.html(newCount + ' ' + groupName).show();
      } else {
        groupElem.remove();
      }
    } else if (change !== 0) {
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = (0, _jquery["default"])('.h-group-count-option').toArray().reverse()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var _group = _step4.value;

          if ((0, _jquery["default"])(_group).attr('data-count') > change || (0, _jquery["default"])(_group).attr('data-count') === change && (0, _jquery["default"])(_group).attr('data-group') < groupName) {
            (0, _jquery["default"])(_group).after('<div class = h-group-count-option data-group="' + groupName + '" data-count=' + change + '>' + change + ' ' + groupName + '</div>');
            break;
          } else if (_group === (0, _jquery["default"])('.h-group-count-options:first-child')[0]) {
            (0, _jquery["default"])(_group).before('<div class = h-group-count-option data-group="' + groupName + '" data-count=' + change + '>' + change + ' ' + groupName + '</div>');
          }
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
            _iterator4["return"]();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }

      if ((0, _jquery["default"])('.h-group-count-options > [data-group="' + groupName + '"]').length === 0) {
        (0, _jquery["default"])('.h-group-count-options').append('<div class = h-group-count-option data-group="' + groupName + '" data-count=' + change + '>' + change + ' ' + groupName + '</div>');
      }
    }

    if ((0, _jquery["default"])('.h-group-count-option').length === 0) {
      (0, _jquery["default"])('.h-group-count').hide();
    } else {
      (0, _jquery["default"])('.h-group-count').show();
    }
  },
  countPixelmap: function countPixelmap(pixelmap, operation) {
    var toChange = {};

    for (var ix = 0; ix < pixelmap.get('values').length; ix++) {
      var groupName = pixelmap.get('categories')[pixelmap.get('values')[ix]].label || this.parentView._defaultGroup;

      if (toChange[groupName]) {
        toChange[groupName]++;
      } else {
        toChange[groupName] = 1;
      }
    }

    for (var group in toChange) {
      this.updateCount(group, operation * toChange[group]);
    }
  },

  /**
   * Set the current style group.  This should take a plain object, not a
   * backbone object.  Given a group name, this can be obtained by something
   * like
   *   this._setStyleGroup(this._groups.get(groupName).toJSON());
   *
   * @param {object} group The new group.
   */
  _setStyleGroup: function _setStyleGroup(group) {
    this._style.set(group);

    if (!this._style.get('group') && this._style.id !== this.parentView._defaultGroup) {
      this._style.set('group', this._style.id);
    } else if (this._style.get('group') && this._style.id === this.parentView._defaultGroup) {
      this._style.unset('group');
    }

    this.$('.h-style-group').val(group.id);

    this._saveEditOptions({
      style: group.id
    });
  },

  /**
   * Set the current style group based on the current controls.
   */
  _setToSelectedStyleGroup: function _setToSelectedStyleGroup() {
    this._setStyleGroup(this._groups.get(this.$('.h-style-group').val()).toJSON());
  },
  selectElementsInGroup: function selectElementsInGroup(evt) {
    var group = (0, _jquery["default"])(evt.target).closest('[data-group]').attr('data-group');

    this.parentView._selectElementsByGroup(group);
  },

  /**
   * For a dropdown control widget, handle expanding and collapsing.
   *
   * @param {jquery.Event} e The event that triggered this toggle.
   */
  _dropdownControlClick: function _dropdownControlClick(e) {
    e.stopImmediatePropagation();
    var content = (0, _jquery["default"])(e.target).parent().find('.h-dropdown-content');
    var isCollapsed = !content.hasClass('in');
    var buttons = (0, _jquery["default"])(e.target).closest('.h-draw-tools').find('.btn-group');
    buttons.find('.h-dropdown-content').each(function (idx, dropdown) {
      dropdown = (0, _jquery["default"])(dropdown);

      if (!dropdown.is(content) && dropdown.hasClass('in')) {
        dropdown.collapse('toggle');
        dropdown.parent().find('.icon-up-open').removeClass('icon-up-open').addClass('icon-down-open');
      }
    });
    content.collapse('toggle');
    (0, _jquery["default"])(e.target).find('.icon-down-open,.icon-up-open').removeClass(isCollapsed ? 'icon-down-open' : 'icon-up-open').addClass(isCollapsed ? 'icon-up-open' : 'icon-down-open'); // Select the corresponding radio button for the current size_mode

    (0, _jquery["default"])("input[mode=\"".concat(this._editOptions.size_mode || 'unconstrained', "\"]"), (0, _jquery["default"])(e.target.parentNode)).trigger('click');
  },

  /**
   * Change the size, shape, or screen flag on the current brush.
   */
  _changeBrush: function _changeBrush(e) {
    var opts = {
      brush_shape: this.$('.h-brush-shape:checked').attr('shape'),
      brush_size: parseFloat(this.$('.h-brush-size').val()),
      brush_screen: this.$('.h-brush-screen').is(':checked')
    };

    this._saveEditOptions(opts);

    this.$('.h-draw[data-type="brush"]').attr('shape', this._editOptions.brush_shape);

    if (this._drawingType === 'brush') {
      this.drawElement(undefined, 'brush', true);
    }
  },

  /**
   * Show or hide width/height input depending on the currently selected drawing mode.
   */
  _updateConstraintValueInputs: function _updateConstraintValueInputs() {
    if (['fixed_aspect_ratio', 'fixed_size'].includes(this.$('.h-fixed-shape:checked').attr('mode'))) {
      this.$('.h-fixed-values').show();
    } else {
      this.$('.h-fixed-values').hide();
    }
  },

  /**
   * Update the width/height constraint for a shape being drawn with a fixed
   * aspect ratio or fixed size.
   */
  _changeShapeConstraint: function _changeShapeConstraint(evt) {
    var opts = {
      size_mode: this.$('.h-fixed-shape:checked').attr('mode'),
      fixed_width: parseFloat(this.$('.h-fixed-width').val()),
      fixed_height: parseFloat(this.$('.h-fixed-height').val())
    };

    this._saveEditOptions(opts);

    this._updateConstraintValueInputs();

    if (opts.size_mode === 'fixed_aspect_ratio') {
      this.viewer.startDrawMode(this._drawingType, {
        modeOptions: {
          constraint: opts.fixed_width / opts.fixed_height
        }
      });
    } else if (opts.size_mode === 'fixed_size') {
      this.viewer.startDrawMode(this._drawingType, {
        modeOptions: {
          constraint: {
            width: opts.fixed_width,
            height: opts.fixed_height
          }
        }
      });
    } else {
      this.viewer.startDrawMode(this._drawingType);
    }
  },

  /**
   * Cycle through available brush shapes.
   */
  nextBrushShape: function nextBrushShape() {
    this.$('.h-brush-shape[name="h-brush-shape"][shape="' + this.$('.h-brush-shape[name="h-brush-shape"]:checked').attr('next_shape') + '"]').prop('checked', true);

    this._changeBrush();
  },

  /**
   * Change the current brush size.
   *
   * @param {number} A number to add to the current size.
   */
  adjustBrushSize: function adjustBrushSize(delta) {
    var newval = Math.max(1, parseFloat(this.$('.h-brush-size').val()) + delta);
    this.$('.h-brush-size').val(newval);

    this._changeBrush();
  },

  /**
   * Set the style group to the next available group in the dropdown.
   *
   * If the currently selected group is the last group in the dropdown,
   * the first group in the dropdown is selected instead.
   */
  setToNextStyleGroup: function setToNextStyleGroup() {
    var nextGroup = this.$('.h-style-group option:selected').next().val(); // A style group can have an empty string for a name, so we must explicitly
    // test if this is undefined instead of just testing truthiness.

    if (nextGroup === undefined) {
      nextGroup = this.$('.h-style-group option:first').val();
    }

    this._setStyleGroup(this._groups.get(nextGroup).toJSON());
  },

  /**
   * Set the style group to the previous available group in the dropdown.
   *
   * If the currently selected group is the first group in the dropdown,
   * the last group in the dropdown is selected instead.
   */
  setToPrevStyleGroup: function setToPrevStyleGroup() {
    var prevGroup = this.$('.h-style-group option:selected').prev().val(); // A style group can have an empty string for a name, so we must explicitly
    // test if this is undefined instead of just testing truthiness.

    if (prevGroup === undefined) {
      prevGroup = this.$('.h-style-group option:last-child').val();
    }

    this._setStyleGroup(this._groups.get(prevGroup).toJSON());
  },
  getStyleGroup: function getStyleGroup() {
    return this._style;
  },
  _styleGroupEditor: function _styleGroupEditor() {
    var _this9 = this;

    var dlg = (0, _editStyleGroups["default"])(this._style, this._groups, this.parentView._defaultGroup);
    dlg.$el.on('hidden.bs.modal', function () {
      _this9.render();

      _this9.parentView.trigger('h:styleGroupsEdited', _this9._groups);
    });
  },
  _handleStyleGroupsUpdate: function _handleStyleGroupsUpdate() {
    this.render();
    this.trigger('h:styleGroupsUpdated', this._groups);
  },
  _highlightElement: function _highlightElement(evt) {
    var id = (0, _jquery["default"])(evt.currentTarget).data('id');

    var annotType = this.collection._byId[id].get('type');

    if (this.annotationSelector._interactiveMode && ['point', 'polyline', 'rectangle', 'ellipse', 'circle'].includes(annotType)) {
      (0, _jquery["default"])(evt.currentTarget).find('.h-view-element').show();
    }

    this.parentView.trigger('h:highlightAnnotation', this.annotation.id, id);
  },
  _unhighlightElement: function _unhighlightElement(evt) {
    (0, _jquery["default"])(evt.currentTarget).find('.h-view-element').hide();
    this.parentView.trigger('h:highlightAnnotation');
  },
  _recalculateGroupAggregation: function _recalculateGroupAggregation() {
    var groups = [];
    var used = {};
    this.collection.forEach(function (el) {
      var group = el.get('group') || '__null__';

      if (!used[group]) {
        used[group] = true;

        if (group !== '__null__') {
          groups.push(group);
        }
      }
    });

    if (used.__null__) {
      groups.push(null);
    }

    this.annotation.set('groups', groups);
  }
});

var _default = DrawWidget;
exports["default"] = _default;