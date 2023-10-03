"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _underscore = _interopRequireDefault(require("underscore"));

var _jquery = _interopRequireDefault(require("jquery"));

var _Panel = _interopRequireDefault(require("@girder/slicer_cli_web/views/Panel"));

var _editRegionOfInterest = _interopRequireDefault(require("../dialogs/editRegionOfInterest"));

var _zoomWidget = _interopRequireDefault(require("../templates/panels/zoomWidget.pug"));

require("../stylesheets/panels/zoomWidget.styl");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Define a widget for controlling the view magnification with
 * a dynamic slider and buttons.
 *
 * Note: This code juggles three different representations
 * of the magnification:
 *
 *   * The "osm-like" zoom level:
 *       0: 1x1 global tiles
 *       1: 2x2 global tiles
 *       N: N+1xN+1 global tiles
 *
 *   * The image magnification:
 *       m = M 2^(z - Z)
 *         for max magnification M
 *             max zoom level Z
 *             current zoom level z
 *
 *   * The value of the range slider for log scaling:
 *       val = log2(m)
 *         for magnification m
 */
var ZoomWidget = _Panel["default"].extend({
  events: _underscore["default"].extend(_Panel["default"].prototype.events, {
    'click .h-zoom-button': '_zoomButton',
    'input .h-zoom-slider': '_zoomSliderInput',
    'click .h-download-button-view': '_downloadView',
    'click .h-download-button-area': '_downloadArea',
    'click #h-zoom-range-increase': '_increaseZoomRange',
    'click #h-zoom-range-decrease': '_decreaseZoomRange'
  }),
  initialize: function initialize() {
    // set defaults that will be overwritten when a viewer is added
    this._maxMag = 20;
    this._maxZoom = 8;
    this._minZoom = 0;
    this._cancelSelection = false; // bind the context of the viewer zoom handler

    this._zoomChanged = _underscore["default"].bind(this._zoomChanged, this);
  },
  render: function render() {
    var _this = this;

    var value = 0;
    var min,
        max,
        step = 0.025;
    var buttons;

    if (this.viewer) {
      // get current magnification from the renderer
      value = this.zoomToMagnification(this.renderer.zoom());
    } // get the minimum value of the slider on a logarithmic scale
    // (here we expand the range slightly to make sure valid ranges
    // aren't clipped due to the slider step size)


    min = Math.floor((Math.log2(this.zoomToMagnification(this._minZoom)) - Math.log2(this._maxMag)) / step) * step;
    max = 0; // get a list of discrete values to show as buttons

    buttons = _underscore["default"].filter([1, 2.5, 5, 10, 20, 40, 80, 160], function (v) {
      return v <= _this._maxMag;
    });
    buttons = _underscore["default"].last(buttons, 6);
    buttons = buttons !== undefined ? [0].concat(buttons) : [0];
    this.$el.html((0, _zoomWidget["default"])({
      id: 'zoom-panel-container',
      title: '缩放',
      title_download_view: '下载查看',
      title_download_area: '下载区',
      min: min,
      max: max,
      maxNaturalMag: this._maxNaturalMag + 0.01,
      minMag: this.zoomToMagnification(this._minZoom),
      step: step,
      value: Math.log2(value) - Math.log2(this._maxMag),
      disabled: !this.renderer,
      buttons: buttons,
      collapsed: this.$('.s-panel-content.collapse').length && !this.$('.s-panel-content').hasClass('in')
    })); // enable or disable zoom range buttons

    this._zoomRangeControls(); // show tooltip of different download button


    this.$('[data-toggle="tooltip"]').tooltip(); // set the text value on the readonly input box

    this._zoomSliderInput();

    return this;
  },

  /**
   * Set the viewer instance and set several internal variables used
   * to convert between magnification and zoom level.
   */
  setViewer: function setViewer(viewer) {
    var geo = window.geo;
    var range;
    this.viewer = viewer;
    this.renderer = viewer.viewer;

    if (this.renderer) {
      this.renderer.geoOn(geo.event.zoom, this._zoomChanged);
      range = this.renderer.zoomRange();
      this._maxZoom = range.max;
      this._minZoom = range.min;
    }

    return this;
  },

  /**
   * Set the native magnification from the current image.  This
   * is given in the /item/{id}/tiles endpoint from large_image.
   */
  setMaxMagnification: function setMaxMagnification(magnification, increase, increaseRange) {
    this._increaseZoom2x = increase || 0;
    this._increaseZoom2xRange = increaseRange || {
      min: this._increaseZoom2x,
      max: this._increaseZoom2x
    };
    this._maxNaturalMag = magnification;
    this._maxMag = magnification * Math.pow(2, this._increaseZoom2x);

    this._zoomRangeControls();
  },

  /**
   * Set the controls to the given magnification level.
   */
  setMagnification: function setMagnification(val) {
    this._setSliderValue(val);

    this._zoomSliderInput();
  },

  /**
   * Convert from magnification to zoom level.
   */
  magnificationToZoom: function magnificationToZoom(magnification) {
    return this._maxZoom - Math.log2(this._maxMag / magnification);
  },

  /**
   * Convert from zoom level to magnification.
   */
  zoomToMagnification: function zoomToMagnification(zoom) {
    return this._maxMag * Math.pow(2, zoom - this._maxZoom);
  },

  /**
   * Get the value of the slider in magnification scale.
   */
  _getSliderValue: function _getSliderValue() {
    return Math.pow(2, Math.log2(this._maxMag) + parseFloat(this.$('.h-zoom-slider').val()));
  },

  /**
   * Set the slider value to a specific magnification.
   */
  _setSliderValue: function _setSliderValue(val) {
    if (val > 0) {
      val = Math.log2(val) - Math.log2(this._maxMag);
    } else {
      val = 0;
    }

    this.$('.h-zoom-slider').val(val);
  },

  /**
   * A handler called when the viewer's zoom level changes.
   */
  _zoomChanged: function _zoomChanged() {
    if (!this.renderer) {
      return;
    }

    this._inZoomChange = true;
    this.setMagnification(this.zoomToMagnification(this.renderer.zoom()));
    this._inZoomChange = false;
  },

  /**
   * A handler called when one of the magnification buttons is clicked.
   */
  _zoomButton: function _zoomButton(evt) {
    this.setMagnification(this.$(evt.currentTarget).data('value'));

    this._zoomSliderInput();
  },

  /**
   * A handler called when the download view button is clicked.
   */
  _downloadView: function _downloadView(evt) {
    var bounds = this.viewer.viewer.bounds();

    var params = _jquery["default"].param({
      width: window.innerWidth,
      height: window.innerHeight,
      left: bounds.left < 0 ? 0 : Math.round(bounds.left),
      top: bounds.top < 0 ? 0 : Math.round(bounds.top),
      right: bounds.right < 0 ? 0 : Math.round(bounds.right),
      bottom: bounds.bottom < 0 ? 0 : Math.round(bounds.bottom),
      contentDisposition: 'attachment'
    });

    var urlView = this.viewer.getFrameAndUrl().url.replace('/zxy/{z}/{x}/{y}', '/region');
    urlView += (urlView.indexOf('?') >= 0 ? '&' : '?') + params;

    if (this._cancelSelection) {
      this.viewer.annotationLayer.mode(null);
      this._cancelSelection = false;
      this.$('.h-download-button-area').removeClass('h-download-area-button-selected');
    }

    this.$('a.h-download-link#download-view-link').attr({
      href: urlView
    });
  },

  /**
   * Let the user draw a rectangle and then show a dialog.
   */
  _downloadArea: function _downloadArea(evt) {
    var _this2 = this;

    var mag = Math.round(this._getSliderValue() * 10) / 10;
    var maxZoom = this._maxZoom;
    var maxMag = this._maxMag;

    if (this._cancelSelection) {
      this.viewer.annotationLayer.mode(null);
      this._cancelSelection = false;
      this.$('.h-download-button-area').removeClass('h-download-area-button-selected');
    } else {
      this.$('.h-download-button-area').addClass('h-download-area-button-selected');
      this._cancelSelection = true;
      this.viewer.drawRegion().then(function (coord) {
        var areaParams = {
          left: coord[0],
          top: coord[1],
          width: coord[2],
          height: coord[3],
          magnification: mag,
          maxZoom: maxZoom,
          maxMag: maxMag,
          frameAndUrl: _this2.viewer.getFrameAndUrl()
        };
        _this2._cancelSelection = false;

        _this2.$('.h-download-button-area').removeClass('h-download-area-button-selected');

        (0, _editRegionOfInterest["default"])(areaParams);
        return _this2;
      });
    }
  },

  /**
   * A handler called as the slider is moved.
   */
  _zoomSliderInput: function _zoomSliderInput() {
    var val = this._getSliderValue();

    if (this.renderer && !this._inZoomChange) {
      this.renderer.zoom(this.magnificationToZoom(val));
    }

    this.$('.h-zoom-value').text(val.toFixed(1));
  },
  _zoomRangeControls: function _zoomRangeControls() {
    if (this._increaseZoom2xRange) {
      this.$('#h-zoom-range-increase').toggleClass('disabled', this._increaseZoom2x >= this._increaseZoom2xRange.max);
      this.$('#h-zoom-range-decrease').toggleClass('disabled', this._increaseZoom2x <= this._increaseZoom2xRange.min);
    }
  },
  _increaseZoomRange: function _increaseZoomRange() {
    if (this._increaseZoom2x < this._increaseZoom2xRange.max) {
      this._increaseZoom2x += 1;
      var oldmax = parseInt(this.$('.h-zoom-slider').attr('max'), 10);
      this.$('.h-zoom-slider').attr('max', oldmax + 1);
      this.renderer.zoomRange({
        max: this.renderer.zoomRange().max + 1
      });
    }

    this._zoomRangeControls();
  },
  _decreaseZoomRange: function _decreaseZoomRange() {
    if (this._increaseZoom2x > this._increaseZoom2xRange.min) {
      this._increaseZoom2x -= 1;
      var oldmax = parseInt(this.$('.h-zoom-slider').attr('max'), 10);
      this.$('.h-zoom-slider').attr('max', oldmax - 1);
      this.renderer.zoomRange({
        max: this.renderer.zoomRange().max - 1
      });
    }

    this._zoomRangeControls();
  }
});

var _default = ZoomWidget;
exports["default"] = _default;