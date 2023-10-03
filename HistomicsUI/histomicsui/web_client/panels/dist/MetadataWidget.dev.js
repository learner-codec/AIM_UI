"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _jquery = _interopRequireDefault(require("jquery"));

var _underscore = _interopRequireDefault(require("underscore"));

var _Panel = _interopRequireDefault(require("@girder/slicer_cli_web/views/Panel"));

var _constants = require("@girder/core/constants");

var _metadataWidget = require("@girder/large_image/views/metadataWidget");

var _metadataWidgetPanel = _interopRequireDefault(require("../templates/panels/metadataWidgetPanel.pug"));

require("../stylesheets/panels/metadataWidget.styl");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * This widget shows a list of metadata in a given item.
 */
var MetadataWidgetPanel = _Panel["default"].extend({
  events: _underscore["default"].extend(_Panel["default"].prototype.events, _metadataWidget.MetadataWidget.prototype.events, {
    'click .h-panel-maximize': function clickHPanelMaximize(event) {
      this.expand(event);
      this.$('.s-panel-content').addClass('in');
      var panelElem = this.$el.closest('.s-panel');
      var maximize = !panelElem.hasClass('h-panel-maximized');
      panelElem.toggleClass('h-panel-maximized', maximize);
      panelElem.toggleClass('s-no-panel-toggle', maximize);
    }
  }),

  /**
   * Creates a widget to display and optionally edit metadata fields.
   *
   * @param settings.item {Model} The model object whose metadata to display.
   *    Can be any model type that inherits MetadataMixin.
   * @param [settings.fieldName='meta'] {string} The name of the model attribute
   *    to display/edit. The model attribute with this name should be an object
   *    whose top level keys represent metadata keys.
   * @param [settings.title='Metadata'] {string} Title for the widget.
   * @param [settings.apiPath] {string} The relative API path to use when editing
   *    metadata keys for this model. Defaults to using the MetadataMixin default path.
   * @param [settings.accessLevel=AccessType.READ] {AccessType} The
   *    access level for this widget. Use READ for read-only, or WRITE (or greater)
   *    for adding editing capabilities as well.
   * @param [settings.onMetadataAdded] {Function} A custom callback for when a
   *    new metadata key is added to the list. If passed, will override the
   *    default behavior of calling MetadataMixin.addMetadata.
   * @param [settings.onMetadataEdited] {Function} A custom callback for when an
   *    existing metadata key is updated. If passed, will override the default
   *    behavior of calling MetadataMixin.editMetadata.
   */
  initialize: function initialize(settings) {
    var _this = this;

    _metadataWidget.MetadataWidget.prototype.initialize.call(this, settings);

    this.panel = settings.panel === undefined ? true : settings.panel; // the event is created

    this.on('li-metadata-widget-update', function (event) {
      _this.renderMetadataWidgetHeader(event);
    });
  },
  renderMetadataWidgetHeader: function renderMetadataWidgetHeader() {
    // prevent automatically collapsing the widget after rendering again
    this.render();
  },
  render: function render() {
    var _this2 = this;

    if (this.item && this.item.id) {
      var func = this.item.getAccessLevel;

      if (this.item.get('_modelType') === 'annotation') {
        func = function func(callback) {
          var accessLevel = _this2.item.getAccessLevel();

          callback(accessLevel);
        };
      }

      func.call(this.item, function (accessLevel) {
        _this2.accessLevel = accessLevel;

        _metadataWidget.MetadataWidget.prototype.render.call(_this2);
      });
    }

    return this;
  },
  _renderHeader: function _renderHeader(contents) {
    contents = (0, _jquery["default"])(contents).closest('.btn-group.pull-right').html();
    var firstKey = this._sortedMetaKeys[0];
    var firstValue = this._renderedMetaDict[firstKey];
    firstKey = (0, _metadataWidget.liMetadataKeyEntry)(this._limetadata, firstKey) ? (0, _metadataWidget.liMetadataKeyEntry)(this._limetadata, firstKey).title || firstKey : firstKey;

    if (_underscore["default"].isObject(firstValue)) {
      // if the value is a json object, JSON.stringify to make it more readable
      firstValue = JSON.stringify(firstValue);
    }

    this.$el.html((0, _metadataWidgetPanel["default"])({
      contents: contents,
      accessLevel: this.item.attributes._accessLevel,
      AccessType: _constants.AccessType,
      firstKey: firstKey,
      firstValue: firstValue,
      panel: this.panel,
      // title: "this.title",
      title: "元数据",
      collapsed: this.panel && !this.$('.s-panel-content').hasClass('in') && !this.$el.closest('.s-panel').hasClass('h-panel-maximized')
    }));
  }
});

MetadataWidgetPanel.prototype.modes = _metadataWidget.MetadataWidget.prototype.modes;
MetadataWidgetPanel.prototype.setItem = _metadataWidget.MetadataWidget.prototype.setItem;
MetadataWidgetPanel.prototype.getModeFromValue = _metadataWidget.MetadataWidget.prototype.getModeFromValue;

MetadataWidgetPanel.prototype.addMetadata = function (evt, mode) {
  // expand the widget when adding new metadata
  this.$('.s-panel-content').collapse('show');
  return _metadataWidget.MetadataWidget.prototype.addMetadata.call(this, evt, mode);
};

MetadataWidgetPanel.prototype.addMetadataByKey = function (evt) {
  // expand the widget when adding new metadata
  this.$('.s-panel-content').collapse('show');
  return _metadataWidget.MetadataWidget.prototype.addMetadataByKey.call(this, evt);
};

var _default = MetadataWidgetPanel;
exports["default"] = _default;