"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _underscore = _interopRequireDefault(require("underscore"));

var _Panel = _interopRequireDefault(require("@girder/slicer_cli_web/views/Panel"));

var _setFrameQuad = _interopRequireDefault(require("@girder/large_image/views/imageViewerWidget/setFrameQuad.js"));

var _overviewWidget = _interopRequireDefault(require("../templates/panels/overviewWidget.pug"));

require("../stylesheets/panels/overviewWidget.styl");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/* global geo */
var OverviewWidget = _Panel["default"].extend({
  render: function render() {
    var _this = this;

    this.$el.html((0, _overviewWidget["default"])({
      id: 'overview-panel-container',
      title: "视图",
      collapsed: this.$('.s-panel-content.collapse').length && !this.$('.s-panel-content').hasClass('in')
    }));
    window.setTimeout(function () {
      _this._createOverview();
    }, 1);
    return this;
  },

  /**
   * Set the viewer instance and set several internal variables used
   * to convert between magnification and zoom level.
   */
  setViewer: function setViewer(viewer) {
    if (viewer !== this.parentViewer) {
      if (this.parentViewer && this.parentViewer.viewer && this._boundOnParentPan) {
        this.parentViewer.viewer.geoOff(geo.event.pan, this._boundOnParentPan);
        this._boundOnParentPan = null;
      }

      this.parentViewer = viewer;

      this._createOverview();
    }

    return this;
  },
  setImage: function setImage(tiles) {
    if (!_underscore["default"].isEqual(tiles, this._tiles)) {
      this._tiles = tiles;

      this._createOverview();
    }

    return this;
  },
  _createOverview: function _createOverview() {
    var _this2 = this;

    if (!this._tiles || !this.parentViewer || !this.parentViewer.viewer || !this.$el.find('.h-overview-image').length) {
      if (this.viewer) {
        this.viewer.exit();
        this.viewer = null;
      }

      return;
    }

    var tiles = this._tiles;
    var params = geo.util.pixelCoordinateParams(this.$el.find('.h-overview-image'), tiles.sizeX, tiles.sizeY, tiles.tileWidth, tiles.tileHeight);
    params.layer.useCredentials = true;
    params.layer.url = this.parentViewer.getFrameAndUrl().url;

    if (tiles.tileWidth > 8192 || tiles.tileHeight > 8192) {
      params.layer.renderer = 'canvas';
    }
    /* We want the actions to trigger on the overview, but affect the main
     * image, so we have to rerig all of the actions */


    params.map.interactor = geo.mapInteractor({
      actions: [{
        action: 'overview_pan',
        input: 'left',
        modifiers: {
          shift: false,
          ctrl: false
        },
        owner: 'histomicsui.overview',
        name: 'button pan'
      }, {
        action: 'overview_zoomselect',
        input: 'left',
        modifiers: {
          shift: true,
          ctrl: false
        },
        selectionRectangle: geo.event.zoomselect,
        owner: 'histomicsui.overview',
        name: 'drag zoom'
      }],
      keyboard: {
        actions: {}
      }
    });
    this.viewer = geo.map(params.map);

    if (window.ResizeObserver) {
      this._observer = new window.ResizeObserver(function () {
        if (_this2.viewer.node().width()) {
          _this2.viewer.size({
            width: _this2.viewer.node().width(),
            height: _this2.viewer.node().height()
          });
        }
      });

      this._observer.observe(this.viewer.node()[0]);
    }

    params.layer.autoshareRenderer = false;
    this._tileLayer = this.viewer.createLayer('osm', params.layer);

    if (this.parentViewer._layer && this.parentViewer._layer.setFrameQuad) {
      (0, _setFrameQuad["default"])((this.parentViewer._layer.setFrameQuad.status || {}).tileinfo, this._tileLayer, (this.parentViewer._layer.setFrameQuad.status || {}).options);

      this._tileLayer.setFrameQuad(0);
    }

    this._featureLayer = this.viewer.createLayer('feature', {
      features: ['polygon']
    });
    this._outlineFeature = this._featureLayer.createFeature('polygon', {
      style: {
        stroke: true,
        strokeColor: 'black',
        strokeWidth: 2,
        fill: false
      }
    });
    this._panOutlineDistance = 5;
    /* Clicking in the overview recenters to that spot */

    this._featureLayer.geoOn(geo.event.mouseclick, function (evt) {
      _this2.parentViewer.viewer.center(evt.geo);
    });

    this._featureLayer.geoOn(geo.event.actiondown, function (evt) {
      _this2._downState = {
        state: evt.state,
        mouse: evt.mouse,
        center: _this2.parentViewer.viewer.center(),
        zoom: _this2.parentViewer.viewer.zoom(),
        rotate: _this2.parentViewer.viewer.rotation(),
        distanceToOutline: geo.util.distanceToPolygon2d(evt.mouse.geo, _this2._outlineFeature.data()[0]) / _this2.viewer.unitsPerPixel(_this2.viewer.zoom())
      };
    });

    this._featureLayer.geoOn(geo.event.actionmove, function (evt) {
      switch (evt.state.action) {
        case 'overview_pan':
          {
            if (!_this2._downState || _this2._downState.distanceToOutline < -_this2._panOutlineDistance) {
              return;
            }

            var delta = {
              x: evt.mouse.geo.x - _this2._downState.mouse.geo.x,
              y: evt.mouse.geo.y - _this2._downState.mouse.geo.y
            };

            var center = _this2.parentViewer.viewer.center();

            delta.x -= center.x - _this2._downState.center.x;
            delta.y -= center.y - _this2._downState.center.y;

            if (delta.x || delta.y) {
              _this2.parentViewer.viewer.center({
                x: center.x + delta.x,
                y: center.y + delta.y
              });
            }
          }
          break;
      }
    });

    this._featureLayer.geoOn(geo.event.actionselection, function (evt) {
      if (evt.lowerLeft.x === evt.upperRight.x || evt.lowerLeft.y === evt.upperRight.y) {
        return;
      }

      var map = _this2.parentViewer.viewer;
      var mapsize = map.size();
      var lowerLeft = map.gcsToDisplay(_this2.viewer.displayToGcs(evt.lowerLeft));
      var upperRight = map.gcsToDisplay(_this2.viewer.displayToGcs(evt.upperRight));
      var scaling = {
        x: Math.abs((upperRight.x - lowerLeft.x) / mapsize.width),
        y: Math.abs((upperRight.y - lowerLeft.y) / mapsize.height)
      };
      var center = map.displayToGcs({
        x: (lowerLeft.x + upperRight.x) / 2,
        y: (lowerLeft.y + upperRight.y) / 2
      }, null);
      var zoom = map.zoom() - Math.log2(Math.max(scaling.x, scaling.y));
      map.zoom(zoom);
      map.center(center, null);
    });

    this.viewer.draw();
    this._boundOnParentPan = _underscore["default"].bind(this._onParentPan, this);
    this.parentViewer.viewer.geoOn(geo.event.pan, this._boundOnParentPan);

    this._onParentPan();

    this.parentViewer.on('g:imageFrameChanged', function () {
      _this2._tileLayer.url(_this2.parentViewer.getFrameAndUrl().url);

      if (_this2.parentViewer._layer && _this2.parentViewer._layer.setFrameQuad) {
        _this2._tileLayer.setFrameQuad((_this2.parentViewer._layer.setFrameQuad.status || {}).frame);
      }
    });
  },
  _onParentPan: function _onParentPan() {
    var parent = this.parentViewer.viewer;

    if (parent.rotation() !== this.viewer.rotation()) {
      this.viewer.rotation(parent.rotation());
      this.viewer.zoom(this.viewer.zoom() - 1);
    }

    var size = parent.size();

    this._outlineFeature.data([[parent.displayToGcs({
      x: 0,
      y: 0
    }), parent.displayToGcs({
      x: size.width,
      y: 0
    }), parent.displayToGcs({
      x: size.width,
      y: size.height
    }), parent.displayToGcs({
      x: 0,
      y: size.height
    })]]).draw();
  }
});

var _default = OverviewWidget;
exports["default"] = _default;