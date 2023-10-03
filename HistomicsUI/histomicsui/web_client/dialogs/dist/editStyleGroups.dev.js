"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _tinycolor = _interopRequireDefault(require("tinycolor2"));

var _underscore = _interopRequireDefault(require("underscore"));

var _jquery = _interopRequireDefault(require("jquery"));

var _View = _interopRequireDefault(require("@girder/core/views/View"));

var _events = _interopRequireDefault(require("@girder/core/events"));

var _rest = require("@girder/core/rest");

var _auth = require("@girder/core/auth");

var _StyleModel = _interopRequireDefault(require("../models/StyleModel"));

var _editStyleGroups = _interopRequireDefault(require("../templates/dialogs/editStyleGroups.pug"));

require("@girder/core/utilities/jquery/girderModal");

require("../stylesheets/dialogs/editStyleGroups.styl");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Create a modal dialog with fields to edit and create annotation
 * style groups.
 */
var EditStyleGroups = _View["default"].extend({
  events: {
    'click .h-create-new-style': '_createNewStyle',
    'click .h-save-new-style': '_saveNewStyle',
    'click .h-delete-style': '_deleteStyle',
    'click #h-reset-defaults': '_resetDefaults',
    'click #h-set-defaults': '_setDefaults',
    'click #h-export': '_exportGroups',
    'click #h-import': '_selectImportGroups',
    'click #h-import-replace': '_toggleImportReplace',
    'change #h-import-groups': '_importGroups',
    'change .h-style-def': '_updateStyle',
    'changeColor .h-colorpicker': '_updateStyle',
    'change select': '_setStyle'
  },
  render: function render() {
    this.$('.h-colorpicker').colorpicker('destroy');
    this.$el.html((0, _editStyleGroups["default"])({
      collection: this.collection,
      model: this.model,
      newStyle: this._newStyle,
      //modified
      titleDName: "编辑注释样式",
      //Edit annotation styles
      nameDName: "名称",
      //Name
      labelDName: "标签",
      //Label
      lwDName: "线的宽度",
      //Line width
      lcDname: '线条颜色',
      //Line color
      fcDName: "填色",
      //Fill color
      rtdDName: "重置为默认值",
      //Reset to Defaults
      sadDName: "另存为默认值",
      //Save as Defaults
      expoetDName: "导出",
      //Export
      importDName: "导入",
      cancelDName: "取消",
      //Cancel
      saveDName: "保存",
      //save
      user: (0, _auth.getCurrentUser)() || {}
    }));
    this.$('.h-colorpicker').colorpicker();
    return this;
  },
  _setStyle: function _setStyle(evt) {
    evt.preventDefault();
    this.model.set(this.collection.get(this.$('.h-group-name').val()).toJSON());
    this.render();
  },
  _updateStyle: function _updateStyle(evt) {
    evt.preventDefault();
    var data = {};
    var label = this.$('#h-element-label').val();
    var validation = '';
    data.id = this.$('.h-group-name :selected').val() || this.$('.h-new-group-name').val().trim();

    if (!data.id) {
      validation += 'A style name is required';
      this.$('.h-new-group-name').parent().addClass('has-error');
    }

    data.label = label ? {
      value: label
    } : {};
    var group = data.id;
    data.group = group && group !== this._defaultGroup ? group : undefined;
    var lineWidth = this.$('#h-element-line-width').val();

    if (lineWidth) {
      data.lineWidth = parseFloat(lineWidth);

      if (data.lineWidth < 0 || !isFinite(data.lineWidth)) {
        validation += 'Invalid line width. ';
        this.$('#h-element-line-width').parent().addClass('has-error');
      }
    }

    var lineColor = this.$('#h-element-line-color').val();

    if (lineColor) {
      data.lineColor = this.convertColor(lineColor);
    }

    var fillColor = this.$('#h-element-fill-color').val();

    if (fillColor) {
      data.fillColor = this.convertColor(fillColor);
    }

    if (validation) {
      this.$('.g-validation-failed-message').text(validation).removeClass('hidden');
    }

    this.model.set(data);
  },

  /**
   * A helper function converting a string into normalized rgb/rgba
   * color value.  If no value is given, then it returns a color
   * with opacity 0.
   */
  convertColor: function convertColor(val) {
    if (!val) {
      return 'rgba(0,0,0,0)';
    }

    return (0, _tinycolor["default"])(val).toRgbString();
  },
  _createNewStyle: function _createNewStyle(evt) {
    evt.preventDefault();
    this._newStyle = true;
    this.render();
  },
  _saveNewStyle: function _saveNewStyle(evt) {
    this._updateStyle(evt);

    this._newStyle = false;
    this.collection.create(this.model.toJSON());
    this.render();
  },
  _deleteStyle: function _deleteStyle(evt) {
    evt.preventDefault(); // if we are creating a new style, cancel that and go back to a
    // previous style.

    if (this._newStyle) {
      this._newStyle = false;
    } else {
      var id = this.$('.h-group-name :selected').val();
      var model = this.collection.get(id);
      model.destroy();
      this.collection.remove(model);
    }

    this.model.set(this.collection.at(0).toJSON());
    this.render();
  },
  _resetDefaults: function _resetDefaults(evt) {
    var _this = this;

    (0, _rest.restRequest)({
      method: 'GET',
      url: 'histomicsui/settings'
    }).done(function (resp) {
      var styleJSON = resp['histomicsui.default_draw_styles'],
          oldid = _this.model && _this.model.id,
          styles = [],
          styleModels;
      styles = styleJSON ? JSON.parse(styleJSON) : [];
      styleModels = _underscore["default"].map(styles, function (style) {
        return new _StyleModel["default"](style);
      });

      while (_this.collection.length) {
        _this.collection.first().destroy();
      }

      _this.collection.reset(styleModels); // make sure we have at least a default style


      if (!_this.collection.get(_this._defaultGroup)) {
        _this.collection.push(new _StyleModel["default"]({
          id: _this._defaultGroup
        }));
      }

      _this.model.set(_this.collection.at(0).toJSON());

      if (oldid && _this.collection.get(oldid)) {
        _this.model.set(_this.collection.get(oldid).toJSON());
      }

      _this.collection.each(function (model) {
        model.save();
      });

      _this._newStyle = false;

      _this.render();
    });
  },
  _setDefaults: function _setDefaults(evt) {
    return (0, _rest.restRequest)({
      method: 'PUT',
      url: 'system/setting',
      data: {
        list: JSON.stringify([{
          key: 'histomicsui.default_draw_styles',
          value: JSON.stringify(this.collection.toJSON())
        }])
      }
    }).done(function () {
      _events["default"].trigger('g:alert', {
        icon: 'ok',
        text: 'Settings saved.',
        type: 'success',
        timeout: 4000
      });
    });
  },
  _exportGroups: function _exportGroups(evt) {
    this.collection.add(this.model.toJSON(), {
      merge: true
    });
    var data = new Blob([JSON.stringify(this.collection.toJSON(), undefined, 2)], {
      type: 'text/plain'
    });
    var url = window.URL.createObjectURL(data);
    this.$el.find('#h-export-link').attr('href', url);
    this.$el.find('#h-export-link')[0].click();
  },
  _selectImportGroups: function _selectImportGroups(evt) {
    this.$el.find('#h-import-groups').click();
  },
  _toggleImportReplace: function _toggleImportReplace(evt) {
    evt.stopPropagation();
  },
  _importGroups: function _importGroups(evt) {
    var _this2 = this;

    // disable the UI until we succeed or fail
    this.$el.find('input').girderEnable(false);
    var replace = this.$el.find('#h-import-replace').prop('checked');
    var files = evt.target.files;

    if (files.length === 1) {
      var fr = new FileReader();

      fr.onload = function (evt) {
        _this2.$el.find('input').girderEnable(true);

        try {
          var groups = JSON.parse(evt.target.result);
          var styleModels = groups.map(function (group) {
            return new _StyleModel["default"](group);
          });
        } catch (err) {
          _this2.$('.g-validation-failed-message').text('Failed to parse style specifications.').removeClass('hidden');

          return;
        }

        if (replace) {
          // remove all if we are replacing
          while (_this2.collection.length) {
            _this2.collection.first().destroy();
          }

          _this2.collection.reset(styleModels);
        } else {
          // For merge, completely replace existing styles
          for (var i = _this2.collection.length - 1; i >= 0; i -= 1) {
            if (styleModels.some(function (model) {
              return model.id === _this2.collection.at(i).id;
            })) {
              _this2.collection.at(i).destroy();
            }
          }

          _this2.collection.add(styleModels, {
            merge: true
          });
        } // make sure we have at least a default style


        if (!_this2.collection.get(_this2._defaultGroup)) {
          _this2.collection.push(new _StyleModel["default"]({
            id: _this2._defaultGroup
          }));
        }

        _this2.model.set(_this2.collection.at(0).toJSON());

        _this2.collection.each(function (model) {
          model.save();
        });

        _this2._newStyle = false;

        _this2.$('.g-validation-failed-message').addClass('hidden');

        _this2.render();
      };

      fr.onerror = function (evt) {
        _this2.$el.find('input').girderEnable(true);

        _this2.$('.g-validation-failed-message').text('Failed to read file').removeClass('hidden');
      };

      fr.readAsText(files[0]);
    }
  }
});

var EditStyleGroupsDialog = _View["default"].extend({
  events: {
    'click .h-submit': '_submit',
    'click .h-cancel': '_cancelChanges'
  },
  initialize: function initialize() {
    // save the collection and current model so we can restore everything
    // when we cancel
    this.originalCollectionData = this.collection.toJSON();
    this.originalModelData = this.model.toJSON();
    this.originalModelId = this.model.id;
    this.form = new EditStyleGroups({
      parentView: this,
      model: new _StyleModel["default"](this.model.toJSON()),
      collection: this.collection
    });
  },
  render: function render() {
    this.$el.html('<div class="h-style-editor"/>');
    this.form.setElement(this.$('.h-style-editor')).render();
    this.$el.girderModal(this);
    return this;
  },
  _submit: function _submit(evt) {
    evt.preventDefault();
    this.model.set(this.form.model.toJSON());
    this.collection.add(this.form.model.toJSON(), {
      merge: true
    });
    this.collection.get(this.model.id).save();
    this.$el.modal('hide');
  },
  _cancelChanges: function _cancelChanges(evt) {
    var styleModels = _underscore["default"].map(this.originalCollectionData, function (style) {
      return new _StyleModel["default"](style);
    });

    while (this.collection.length) {
      this.collection.first().destroy();
    }

    this.collection.reset(styleModels, {
      merge: true
    });
    this.model.set(this.originalModelData);
    this.collection.each(function (model) {
      model.save();
    });
    this.$el.modal('hide');
  }
});
/**
 * Show the edit dialog box.  Watch for change events on the passed
 * `ElementModel` to respond to user submission of the form.
 *
 * @param {StyleGroupCollection} collection
 * @returns {EditStyleGroup} The dialog's view
 */


function show(style, groups, defaultGroup) {
  var dialog = new EditStyleGroupsDialog({
    parentView: null,
    collection: groups,
    model: style,
    el: (0, _jquery["default"])('#g-dialog-container')
  });
  dialog.form._defaultGroup = defaultGroup || 'default';
  return dialog.render();
}

var _default = show;
exports["default"] = _default;