"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _underscore = _interopRequireDefault(require("underscore"));

var _HeaderUserView = _interopRequireDefault(require("@girder/core/views/layout/HeaderUserView"));

var _router = _interopRequireDefault(require("@girder/core/router"));

var _SearchFieldWidget = _interopRequireDefault(require("@girder/core/views/widgets/SearchFieldWidget"));

var _View = _interopRequireDefault(require("@girder/core/views/View"));

var _layoutHeader = _interopRequireDefault(require("@girder/core/templates/layout/layoutHeader.pug"));

require("@girder/core/stylesheets/layout/header.styl");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * This view shows the header in the layout.
 */
var LayoutHeaderView = _View["default"].extend({
  events: {
    'click .g-app-title': function clickGAppTitle() {
      _router["default"].navigate('', {
        trigger: true
      });
    }
  },
  initialize: function initialize(settings) {
    this.brandName = settings.brandName || 'Girder';
    this.bannerColor = settings.bannerColor || '#3F3B3B';
    this.userView = new _HeaderUserView["default"]({
      parentView: this,
      registrationPolicy: settings.registrationPolicy
    });
    /*
     * The order of types correspond to the order of the displayed types results on the dialog box.
     */

    this.searchWidget = new _SearchFieldWidget["default"]({
      placeholder: 'Quick search...',
      types: ['collection', 'folder', 'item', 'group', 'user'],
      parentView: this
    }).on('g:resultClicked', function (result) {
      this.searchWidget.resetState();

      _router["default"].navigate(result.type + '/' + result.id, {
        trigger: true
      });
    }, this);
  },
  render: function render() {
    var textColor = this._getTextColor(this.bannerColor);

    this.$el.html((0, _layoutHeader["default"])({
      brandName: this.brandName,
      bannerColor: this.bannerColor,
      textColor: textColor
    }));
    this.userView.setElement(this.$('.g-current-user-wrapper')).render();

    if (textColor !== '#ffffff') {
      // We will lose the hover color by setting this, so only do that if necessary
      this.userView.$('.g-user-text a').css('color', textColor);
    }

    this.searchWidget.setElement(this.$('.g-quick-search-container')).render();
    return this;
  },
  _getTextColor: function _getTextColor(bannerColor) {
    // https://stackoverflow.com/a/3943023
    var hexRed = bannerColor.substr(1, 2);
    var hexGreen = bannerColor.substr(3, 2);
    var hexBlue = bannerColor.substr(5, 2);

    var sRGB = _underscore["default"].map([hexRed, hexGreen, hexBlue], function (hexComponent) {
      return parseInt(hexComponent, 16) / 255.0;
    });

    var linearRBG = _underscore["default"].map(sRGB, function (component) {
      return component <= 0.03928 ? component / 12.92 : Math.pow((component + 0.055) / 1.055, 2.4);
    });

    var L = 0.2126 * linearRBG[0] + 0.7152 * linearRBG[1] + 0.0722 * linearRBG[2];
    return (L + 0.05) / (0.0 + 0.05) > (1.0 + 0.05) / (L + 0.05) ? '#000000' : '#ffffff';
  }
});

var _default = LayoutHeaderView;
exports["default"] = _default;