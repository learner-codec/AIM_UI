"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _jquery = _interopRequireDefault(require("jquery"));

var _underscore = _interopRequireDefault(require("underscore"));

var _View = _interopRequireDefault(require("@girder/core/views/View"));

var _constants = require("@girder/core/constants");

var _dialog = require("@girder/core/dialog");

var _events = _interopRequireDefault(require("@girder/core/events"));

var _misc = require("@girder/core/misc");

var _jsonMetadatumEditWidget = _interopRequireDefault(require("@girder/core/templates/widgets/jsonMetadatumEditWidget.pug"));

var _jsonMetadatumView = _interopRequireDefault(require("@girder/core/templates/widgets/jsonMetadatumView.pug"));

var _metadataWidget = _interopRequireDefault(require("@girder/core/templates/widgets/metadataWidget.pug"));

var _metadatumEditWidget = _interopRequireDefault(require("@girder/core/templates/widgets/metadatumEditWidget.pug"));

var _metadatumView = _interopRequireDefault(require("@girder/core/templates/widgets/metadatumView.pug"));

require("@girder/core/stylesheets/widgets/metadataWidget.styl");

var _jsoneditor = _interopRequireDefault(require("jsoneditor/dist/jsoneditor.js"));

require("jsoneditor/dist/jsoneditor.css");

require("bootstrap/js/dropdown");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

// can't 'jsoneditor'
var MetadatumWidget = _View["default"].extend({
  className: 'g-widget-metadata-row',
  events: {
    'click .g-widget-metadata-edit-button': 'editMetadata'
  },
  initialize: function initialize(settings) {
    if (!_underscore["default"].has(this.parentView.modes, settings.mode)) {
      throw new Error('Unsupported metadatum mode ' + settings.mode + ' detected.');
    }

    this.mode = settings.mode;
    this.key = settings.key;
    this.value = settings.value;
    this.accessLevel = settings.accessLevel;
    this.parentView = settings.parentView;
    this.fieldName = settings.fieldName;
    this.apiPath = settings.apiPath;
    this.onMetadataEdited = settings.onMetadataEdited;
    this.onMetadataAdded = settings.onMetadataAdded;
  },
  _validate: function _validate(from, to, value) {
    var newMode = this.parentView.modes[to];

    if (_underscore["default"].has(newMode, 'validation') && _underscore["default"].has(newMode.validation, 'from') && _underscore["default"].has(newMode.validation.from, from)) {
      var validate = newMode.validation.from[from][0];
      var msg = newMode.validation.from[from][1];

      if (!validate(value)) {
        _events["default"].trigger('g:alert', {
          text: msg,
          type: 'warning'
        });

        return false;
      }
    }

    return true;
  },
  // @todo too much duplication with editMetadata
  toggleEditor: function toggleEditor(event, newEditorMode, existingEditor, overrides) {
    var fromEditorMode = existingEditor instanceof JsonMetadatumEditWidget ? 'json' : 'simple';
    var newValue = (overrides || {}).value || existingEditor.$el.attr('g-value');

    if (!this._validate(fromEditorMode, newEditorMode, newValue)) {
      return;
    }

    var row = existingEditor.$el;
    existingEditor.destroy();
    row.addClass('editing').empty();

    var opts = _underscore["default"].extend({
      el: row,
      item: this.parentView.item,
      key: row.attr('g-key'),
      value: row.attr('g-value'),
      accessLevel: this.accessLevel,
      newDatum: false,
      parentView: this,
      fieldName: this.fieldName,
      apiPath: this.apiPath,
      onMetadataEdited: this.onMetadataEdited,
      onMetadataAdded: this.onMetadataAdded
    }, overrides || {});

    this.parentView.modes[newEditorMode].editor(opts).render();
  },
  editMetadata: function editMetadata(event) {
    this.$el.addClass('editing');
    this.$el.empty();
    var opts = {
      item: this.parentView.item,
      key: this.$el.attr('g-key'),
      value: this.$el.attr('g-value'),
      accessLevel: this.accessLevel,
      newDatum: false,
      parentView: this,
      fieldName: this.fieldName,
      apiPath: this.apiPath,
      onMetadataEdited: this.onMetadataEdited,
      onMetadataAdded: this.onMetadataAdded
    }; // If they're trying to open false, null, 6, etc which are not stored as strings

    if (this.mode === 'json') {
      try {
        var jsonValue = JSON.parse(this.$el.attr('g-value'));

        if (jsonValue !== undefined && !_underscore["default"].isObject(jsonValue)) {
          opts.value = jsonValue;
        }
      } catch (e) {}
    }

    this.parentView.modes[this.mode].editor(opts).render().$el.appendTo(this.$el);
  },
  render: function render() {
    this.$el.attr({
      'g-key': this.key,
      'g-value': _underscore["default"].bind(this.parentView.modes[this.mode].displayValue, this)()
    }).empty();
    this.$el.html(this.parentView.modes[this.mode].template({
      key: this.key,
      value: _underscore["default"].bind(this.parentView.modes[this.mode].displayValue, this)(),
      accessLevel: this.accessLevel,
      AccessType: _constants.AccessType
    }));
    return this;
  }
});

var MetadatumEditWidget = _View["default"].extend({
  events: {
    'click .g-widget-metadata-cancel-button': 'cancelEdit',
    'click .g-widget-metadata-save-button': 'save',
    'click .g-widget-metadata-delete-button': 'deleteMetadatum',
    'click .g-widget-metadata-toggle-button': function clickGWidgetMetadataToggleButton(event) {
      var editorType; // @todo modal
      // in the future this event will have the new editorType (assuming a dropdown)

      if (this instanceof JsonMetadatumEditWidget) {
        editorType = 'simple';
      } else {
        editorType = 'json';
      }

      this.parentView.toggleEditor(event, editorType, this, {
        // Save state before toggling editor
        key: this.$el.find('.g-widget-metadata-key-input').val(),
        value: this.getCurrentValue()
      });
    }
  },
  initialize: function initialize(settings) {
    this.item = settings.item;
    this.key = settings.key || '';
    this.fieldName = settings.fieldName || 'meta';
    this.value = settings.value !== undefined ? settings.value : '';
    this.accessLevel = settings.accessLevel;
    this.newDatum = settings.newDatum;
    this.fieldName = settings.fieldName;
    this.apiPath = settings.apiPath;
    this.onMetadataEdited = settings.onMetadataEdited;
    this.onMetadataAdded = settings.onMetadataAdded;
  },
  editTemplate: _metadatumEditWidget["default"],
  getCurrentValue: function getCurrentValue() {
    return this.$el.find('.g-widget-metadata-value-input').val();
  },
  deleteMetadatum: function deleteMetadatum(event) {
    var _this = this;

    event.stopImmediatePropagation();
    var target = (0, _jquery["default"])(event.currentTarget);
    var metadataList = target.parent().parent();
    var params = {
      text: 'Are you sure you want to delete the metadatum <b>' + _underscore["default"].escape(this.key) + '</b>?',
      escapedHtml: true,
      yesText: 'Delete',
      confirmCallback: function confirmCallback() {
        _this.item.removeMetadata(_this.key, function () {
          metadataList.remove();
        }, null, {
          field: _this.fieldName,
          path: _this.apiPath
        });
      }
    };
    (0, _dialog.confirm)(params);
  },
  cancelEdit: function cancelEdit(event) {
    event.stopImmediatePropagation();
    var target = (0, _jquery["default"])(event.currentTarget);
    var curRow = target.parent().parent();

    if (this.newDatum) {
      curRow.remove();
    } else {
      this.parentView.render();
    }
  },
  save: function save(event, value) {
    var _this2 = this;

    event.stopImmediatePropagation();
    var target = (0, _jquery["default"])(event.currentTarget);
    var curRow = target.parent(),
        tempKey = curRow.find('.g-widget-metadata-key-input').val(),
        tempValue = value !== undefined ? value : curRow.find('.g-widget-metadata-value-input').val();

    if (this.newDatum && tempKey === '') {
      _events["default"].trigger('g:alert', {
        text: 'A key is required for all metadata.',
        type: 'warning'
      });

      return;
    }

    var saveCallback = function saveCallback() {
      _this2.key = tempKey;
      _this2.value = tempValue;
      _this2.parentView.key = _this2.key;
      _this2.parentView.value = _this2.value;

      if (_this2 instanceof JsonMetadatumEditWidget) {
        _this2.parentView.mode = 'json';
      } else {
        _this2.parentView.mode = 'simple';
      }

      _this2.parentView.render();

      _this2.newDatum = false;
    };

    var errorCallback = function errorCallback(out) {
      _events["default"].trigger('g:alert', {
        text: out.message,
        type: 'danger'
      });
    };

    if (this.newDatum) {
      if (this.onMetadataAdded) {
        this.onMetadataAdded(tempKey, tempValue, saveCallback, errorCallback);
      } else {
        this.item.addMetadata(tempKey, tempValue, saveCallback, errorCallback, {
          field: this.fieldName,
          path: this.apiPath
        });
      }
    } else {
      if (this.onMetadataEdited) {
        this.onMetadataEdited(tempKey, this.key, tempValue, saveCallback, errorCallback);
      } else {
        this.item.editMetadata(tempKey, this.key, tempValue, saveCallback, errorCallback, {
          field: this.fieldName,
          path: this.apiPath
        });
      }
    }
  },
  render: function render() {
    this.$el.html(this.editTemplate({
      item: this.item,
      key: this.key,
      value: this.value,
      accessLevel: this.accessLevel,
      newDatum: this.newDatum,
      AccessType: _constants.AccessType
    }));
    this.$el.find('.g-widget-metadata-key-input').trigger('focus');
    return this;
  }
});

var JsonMetadatumEditWidget = MetadatumEditWidget.extend({
  editTemplate: _jsonMetadatumEditWidget["default"],
  getCurrentValue: function getCurrentValue() {
    return this.editor.getText();
  },
  save: function save(event) {
    try {
      MetadatumEditWidget.prototype.save.call(this, event, this.editor.get());
    } catch (err) {
      _events["default"].trigger('g:alert', {
        text: 'The field contains invalid JSON and can not be saved.',
        type: 'warning'
      });
    }
  },
  render: function render() {
    MetadatumEditWidget.prototype.render.apply(this, arguments);
    var jsonEditorEl = this.$el.find('.g-json-editor');
    this.editor = new _jsoneditor["default"](jsonEditorEl[0], {
      mode: 'tree',
      modes: ['code', 'tree'],
      onError: function onError() {
        _events["default"].trigger('g:alert', {
          text: 'The field contains invalid JSON and can not be viewed in Tree Mode.',
          type: 'warning'
        });
      }
    });

    if (this.value !== undefined) {
      this.editor.setText(JSON.stringify(this.value));
      this.editor.expandAll();
    }

    return this;
  }
});
/**
 * This widget shows a list of metadata in a given item.
 */

var MetadataWidget = _View["default"].extend({
  events: {
    'click .g-add-json-metadata': function clickGAddJsonMetadata(event) {
      this.addMetadata(event, 'json');
    },
    'click .g-add-simple-metadata': function clickGAddSimpleMetadata(event) {
      this.addMetadata(event, 'simple');
    }
  },

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
    this.item = settings.item;
    this.fieldName = settings.fieldName || 'meta';
    this.title = settings.title || 'Metadata';
    this.apiPath = settings.apiPath;
    this.accessLevel = settings.accessLevel;
    this.onMetadataEdited = settings.onMetadataEdited;
    this.onMetadataAdded = settings.onMetadataAdded;
    this.item.on('g:changed', function () {
      this.render();
    }, this);
    this.render();
  },
  modes: {
    simple: {
      editor: function editor(args) {
        return new MetadatumEditWidget(args);
      },
      displayValue: function displayValue() {
        return this.value;
      },
      template: _metadatumView["default"]
    },
    json: {
      editor: function editor(args) {
        if (args.value !== undefined) {
          args.value = JSON.parse(args.value);
        }

        return new JsonMetadatumEditWidget(args);
      },
      displayValue: function displayValue() {
        return JSON.stringify(this.value, null, 4);
      },
      validation: {
        from: {
          simple: [function (value) {
            try {
              JSON.parse(value);
              return true;
            } catch (e) {}

            return false;
          }, 'The simple field is not valid JSON and can not be converted.']
        }
      },
      template: _jsonMetadatumView["default"]
    }
  },
  setItem: function setItem(item) {
    this.item = item;
    return this;
  },
  // Does not support modal editing
  getModeFromValue: function getModeFromValue(value) {
    return _underscore["default"].isString(value) ? 'simple' : 'json';
  },
  addMetadata: function addMetadata(event, mode) {
    var EditWidget = this.modes[mode].editor;
    var value = mode === 'json' ? '{}' : '';
    var widget = new MetadatumWidget({
      className: 'g-widget-metadata-row editing',
      mode: mode,
      key: '',
      value: value,
      item: this.item,
      fieldName: this.fieldName,
      apiPath: this.apiPath,
      accessLevel: this.accessLevel,
      parentView: this,
      onMetadataEdited: this.onMetadataEdited,
      onMetadataAdded: this.onMetadataAdded
    });
    widget.$el.appendTo(this.$('.g-widget-metadata-container'));
    new EditWidget({
      item: this.item,
      key: '',
      value: value,
      fieldName: this.fieldName,
      apiPath: this.apiPath,
      accessLevel: this.accessLevel,
      newDatum: true,
      parentView: widget,
      onMetadataEdited: this.onMetadataEdited,
      onMetadataAdded: this.onMetadataAdded
    }).render().$el.appendTo(widget.$el);
  },
  render: function render() {
    var metaDict = this.item.get(this.fieldName) || {};
    var metaKeys = Object.keys(metaDict);
    metaKeys.sort(_misc.localeSort); // Metadata header

    this.$el.html((0, _metadataWidget["default"])({
      item: this.item,
      title: this.title,
      accessLevel: this.accessLevel,
      AccessType: _constants.AccessType
    })); // Append each metadatum

    _underscore["default"].each(metaKeys, function (metaKey) {
      this.$el.find('.g-widget-metadata-container').append(new MetadatumWidget({
        mode: this.getModeFromValue(metaDict[metaKey]),
        key: metaKey,
        value: metaDict[metaKey],
        accessLevel: this.accessLevel,
        parentView: this,
        fieldName: this.fieldName,
        apiPath: this.apiPath,
        onMetadataEdited: this.onMetadataEdited,
        onMetadataAdded: this.onMetadataAdded
      }).render().$el);
    }, this);

    return this;
  }
});

var _default = MetadataWidget;
exports["default"] = _default;