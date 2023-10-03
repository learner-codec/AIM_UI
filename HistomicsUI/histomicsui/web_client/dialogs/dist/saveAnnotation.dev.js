"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _underscore = _interopRequireDefault(require("underscore"));

var _jquery = _interopRequireDefault(require("jquery"));

var _tinycolor = _interopRequireDefault(require("tinycolor2"));

var _constants = require("@girder/core/constants");

var _misc = require("@girder/core/misc");

var _AccessWidget = _interopRequireDefault(require("@girder/core/views/widgets/AccessWidget"));

var _View = _interopRequireDefault(require("@girder/core/views/View"));

var _MetadataWidget = _interopRequireDefault(require("../panels/MetadataWidget"));

require("../stylesheets/dialogs/saveAnnotation.styl");

var _saveAnnotation2 = _interopRequireDefault(require("../templates/dialogs/saveAnnotation.pug"));

var _utils = require("../views/utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

/**
 * Collect styleable properties from user parameters in elements.
 *
 * @param {object} styleableFuncs An object with distinct keys for functions.
 *      Modified.
 * @param {array} elements A list of elements which might contain metadata
 *      properties in the user key.
 * @param {array} [root] A list of keys within objects in an element.
 */
function collectStyleableProps(styleableFuncs, elements, root) {
  var maxCategories = 20;
  var children = {};
  root = root || [];
  var key = 'user';

  for (var j = 0; j < root.length; j += 1) {
    key += '.' + root[j];
  }

  for (var i = 0; i < elements.length; i += 1) {
    var proplist = elements[i].user;

    for (var _j = 0; _j < root.length; _j += 1) {
      if (proplist) {
        proplist = proplist[root[_j]];
      }
    }

    if (proplist !== undefined && proplist !== null) {
      if (proplist.substring || proplist.toFixed && _underscore["default"].isFinite(proplist)) {
        if (styleableFuncs[key] === undefined) {
          styleableFuncs[key] = {
            root: root,
            key: key,
            name: root.map(function (k) {
              return k.replace('_', ' ');
            }).join(' - '),
            categoric: !proplist.toFixed
          };
          styleableFuncs[key].values = [proplist];

          if (!styleableFuncs[key].categoric) {
            styleableFuncs[key].min = styleableFuncs[key].max = +proplist;
          }
        } else {
          if (styleableFuncs[key].values.length <= maxCategories) {
            if (styleableFuncs[key].values.indexOf(proplist) < 0) {
              if (styleableFuncs[key].values.length >= maxCategories) {
                styleableFuncs[key].manyValues = true;
              } else {
                styleableFuncs[key].values.push(proplist);
              }
            }
          }

          if (!styleableFuncs[key].categoric) {
            var val = +proplist;

            if (val < styleableFuncs[key].min) {
              styleableFuncs[key].min = val;
            }

            if (val > styleableFuncs[key].max) {
              styleableFuncs[key].max = val;
            }
          }
        }
      } else {
        Object.keys(proplist).forEach(function (subkey) {
          children[subkey] = true;
        });
      }
    }
  }

  Object.keys(children).forEach(function (subkey) {
    var subroot = root.slice();
    subroot.push(subkey);
    collectStyleableProps(styleableFuncs, elements, subroot);
  });
}
/**
 * Calculate the min/max values for calculated properties.
 *
 * @param {object} styleableFuncs An object with distinct keys for functions.
 *      Modified.
 * @param {array} elements A list of elements which might contain metadata
 *      properties in the user key.
 */


function rangeStyleableProps(styleableFuncs, elements) {
  var needsArea = true;
  Object.entries(styleableFuncs).forEach(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        key = _ref2[0],
        func = _ref2[1];

    if (['perimeter', 'area', 'length'].indexOf(key) >= 0) {
      needsArea = true;
      return;
    }

    if (!func.calc) {
      return;
    }

    for (var i = 0; i < elements.length; i += 1) {
      var d = elements[i];

      if (d[key] !== undefined) {
        if (func.min === undefined) {
          func.min = func.max = d[key];
        }

        if (d[key] < func.min) {
          func.min = d[key];
        }

        if (d[key] > func.max) {
          func.max = d[key];
        }
      }
    }
  });

  if (needsArea) {
    for (var i = 0; i < elements.length; i += 1) {
      var element = elements[i];

      var _elementAreaAndEdgeLe = (0, _utils.elementAreaAndEdgeLength)({
        el: element
      }),
          area = _elementAreaAndEdgeLe.area,
          edge = _elementAreaAndEdgeLe.edge;

      if (styleableFuncs.area && area) {
        if (styleableFuncs.area.min === undefined) {
          styleableFuncs.area.min = styleableFuncs.area.max = area;
          styleableFuncs.area.values = new Array(elements.length);
        }

        styleableFuncs.area.values[i] = area;

        if (area < styleableFuncs.area.min) {
          styleableFuncs.area.min = area;
        }

        if (area > styleableFuncs.area.max) {
          styleableFuncs.area.max = area;
        }
      }

      if (styleableFuncs.length && edge) {
        if (styleableFuncs.length.min === undefined) {
          styleableFuncs.length.min = styleableFuncs.length.max = edge;
          styleableFuncs.length.values = new Array(elements.length);
        }

        styleableFuncs.length.values[i] = edge;

        if (edge < styleableFuncs.length.min) {
          styleableFuncs.length.min = edge;
        }

        if (edge > styleableFuncs.length.max) {
          styleableFuncs.length.max = edge;
        }
      }

      if (styleableFuncs.perimeter && edge) {
        if (styleableFuncs.perimeter.min === undefined) {
          styleableFuncs.perimeter.min = styleableFuncs.perimeter.max = edge;
          styleableFuncs.perimeter.values = new Array(elements.perimeter);
        }

        styleableFuncs.perimeter.values[i] = edge;

        if (edge < styleableFuncs.perimeter.min) {
          styleableFuncs.perimeter.min = edge;
        }

        if (edge > styleableFuncs.perimeter.max) {
          styleableFuncs.perimeter.max = edge;
        }
      }
    }
  }
}
/**
 * Given an element and a color function, compute the color needed.
 *
 * @param {elementModel} element The element for which to compute a color
 * @param {number} idx The index in the element collection
 * @param {object} colorParam A functioon record with prepared min, max,
 *      range, minColor, and maxColor values.
 * @param {object} funcInfo Information about the function.  If calc is true,
 *      values is an array of precomputed values.  Otherwise, root is an
 *      attribute path in the element user object.
 * @returns {string} A color string.
 */


function colorFromFunc(element, idx, colorParam, funcInfo) {
  var geo = window.geo;
  var val;

  if (funcInfo.calc) {
    val = funcInfo.values[idx];
  } else {
    val = element.get('user');

    for (var i = 0; i < funcInfo.root.length; i += 1) {
      val = (val || {})[funcInfo.root[i]];
    }
  }

  if (!_underscore["default"].isFinite(val)) {
    return 'rgba(0,0,0,0)';
  }

  val = Math.max(Math.min((val - colorParam.min) / colorParam.range, 1), 0);

  if (colorParam.minColor.a === undefined) {
    colorParam.minColor.a = 1;
  }

  if (colorParam.maxColor.a === undefined) {
    colorParam.maxColor.a = 1;
  }

  var clr = {
    r: val * (colorParam.maxColor.r - colorParam.minColor.r) + colorParam.minColor.r,
    g: val * (colorParam.maxColor.g - colorParam.minColor.g) + colorParam.minColor.g,
    b: val * (colorParam.maxColor.b - colorParam.minColor.b) + colorParam.minColor.b,
    a: val * (colorParam.maxColor.a - colorParam.minColor.a) + colorParam.minColor.a
  };
  return geo.util.convertColorToRGBA(clr);
}
/**
 * Create a modal dialog with fields to edit the properties of
 * an annotation before POSTing it to the server.
 */


var SaveAnnotation = _View["default"].extend({
  events: {
    'click .h-access': 'access',
    'click .h-cancel': 'cancel',
    'input #h-annotation-fill-color': 'checkFixedIfPresent',
    'changeColor #h-annotation-colorpicker-fill-color': 'checkFixedIfPresent',
    'change #h-annotation-fill-color-func-list': 'changeFillColorFunc',
    'input #h-annotation-fill-color-min-val': function inputHAnnotationFillColorMinVal() {
      return (0, _jquery["default"])('.h-functional-value #h-annotation-fill-color-min-setval').prop('checked', true);
    },
    'input #h-annotation-fill-color-max-val': function inputHAnnotationFillColorMaxVal() {
      return (0, _jquery["default"])('.h-functional-value #h-annotation-fill-color-max-setval').prop('checked', true);
    },
    'input #h-annotation-line-color': 'checkFixedIfPresent',
    'changeColor #h-annotation-colorpicker-line-color': 'checkFixedIfPresent',
    'change #h-annotation-line-color-func-list': 'changeLineColorFunc',
    'input #h-annotation-line-color-min-val': function inputHAnnotationLineColorMinVal() {
      return (0, _jquery["default"])('.h-functional-value #h-annotation-line-color-min-setval').prop('checked', true);
    },
    'input #h-annotation-line-color-max-val': function inputHAnnotationLineColorMaxVal() {
      return (0, _jquery["default"])('.h-functional-value #h-annotation-line-color-max-setval').prop('checked', true);
    },
    'submit form': 'save'
  },
  render: function render() {
    // clean up old colorpickers when rerendering
    this.$('.h-colorpicker').colorpicker('destroy');
    var elementTypes = [];

    if (this.annotation.get('annotation').elements) {
      elementTypes = this.annotation.get('annotation').elements.map(function (element) {
        return element.type === 'polyline' ? element.closed ? 'polygon' : 'line' : element.type;
      }).filter(function (type, index, types) {
        return types.indexOf(type) === index;
      });
    } // should be updated when additional shape elements are supported


    var elementTypeProps = {
      point: [],
      polygon: ['perimeter', 'area'],
      line: ['length'],
      rectangle: ['perimeter', 'area', 'width', 'height', 'rotation'],
      arrow: ['length'],
      circle: ['perimeter', 'area', 'radius'],
      ellipse: ['perimeter', 'area', 'width', 'height', 'rotation']
    };
    var annotationHasEditableElements = _underscore["default"].filter(elementTypes, function (type) {
      return elementTypeProps[type] !== undefined;
    }).length > 0;
    var showStyleEditor = this.annotation.get('annotation').elements && !this.annotation._pageElements && annotationHasEditableElements;
    var defaultStyles = {};
    var styleableFuncs = {};

    if (showStyleEditor) {
      var scale;

      if (this.options.viewer && this.options.viewer._scale) {
        scale = this.options.viewer._scale.scale;
      }

      elementTypes.forEach(function (type) {
        (elementTypeProps[type] || []).forEach(function (key) {
          styleableFuncs[key] = {
            calc: true,
            key: key,
            scale: scale,
            name: key
          };
        });
      });
      var elements = this.annotation.get('annotation').elements;
      rangeStyleableProps(styleableFuncs, elements);
      collectStyleableProps(styleableFuncs, elements.filter(function (d) {
        return d.user;
      }));
      var firstElement = elements[0];

      if (elements.every(function (d) {
        return d.lineWidth === firstElement.lineWidth;
      })) {
        defaultStyles.lineWidth = firstElement.lineWidth;
      }

      if (elements.every(function (d) {
        return d.lineColor === firstElement.lineColor;
      })) {
        defaultStyles.lineColor = firstElement.lineColor;
      }

      if (elements.every(function (d) {
        return d.fillColor === firstElement.fillColor;
      })) {
        defaultStyles.fillColor = firstElement.fillColor;
      }
    }

    this._showStyleEditor = showStyleEditor;
    this._styleableFuncs = styleableFuncs;

    var _styleFuncs;

    if (this.annotation.attributes.annotation.attributes) {
      _styleFuncs = this.annotation.attributes.annotation.attributes._styleFuncs;
    }

    if (!_styleFuncs || !_styleFuncs.lineColor || !_styleFuncs.fillColor || !_styleFuncs.lineWidth) {
      _styleFuncs = {
        lineColor: {},
        lineWidth: {},
        fillColor: {}
      };
    }

    this.annotation._styleFuncs = _styleFuncs;
    this.$el.html((0, _saveAnnotation2["default"])({
      title: this.options.title,
      name: this.options.name,
      namePlaceholder: this.options.namePlaceholder,
      description: this.options.description,
      descriptionPlaceHolder: this.options.descriptionPlaceHolder,
      //this options comes from the setting button on the left side of annotation name
      conDName: this.options.conDName,
      updDName: this.options.updDName,
      uidDName: this.options.uidDName,
      gvDName: this.options.gvDName,
      //global version number
      permDName: this.options.permDName,
      //for save and cancel button
      saveButtonName: this.options.saveButtonName,
      cancelButtonName: this.options.cancelButtonName,
      hasAdmin: this.annotation.get('_accessLevel') >= _constants.AccessType.ADMIN,
      annotation: this.annotation.toJSON().annotation,
      model: this.annotation,
      formatDate: _misc.formatDate,
      DATE_SECOND: _misc.DATE_SECOND,
      showStyleEditor: showStyleEditor,
      styleableFuncs: styleableFuncs,
      styleFuncs: this.annotation._styleFuncs,
      defaultStyles: defaultStyles
    })).girderModal(this);
    this.$('.h-colorpicker').colorpicker();

    if (this.annotation.id) {
      if (!this.annotation.meta) {
        this.annotation._meta = Object.assign({}, (this.annotation.get('annotation') || {}).attributes || {});
        delete this.annotation._meta._styleFuncs;
      } // copy the metadata to a place that is expected for the widget


      if (!this.metadataWidget) {
        this.metadataWidget = new _MetadataWidget["default"]({
          item: this.annotation,
          parentView: this,
          fieldName: '_meta',
          accessLevel: this.annotation.get('_accessLevel'),
          panel: false,
          noSave: true
        });
      }

      this.metadataWidget.setItem(this.annotation);
      this.metadataWidget.accessLevel = this.annotation.get('_accessLevel');
      this.metadataWidget.setElement(this.$('.hui-annotation-metadata')).render();
    }

    this.$el.find('.modal-dialog').addClass('hui-save-annotation-dialog');

    this._updateFuncValues();

    return this;
  },
  access: function access(evt) {
    var _this = this;

    evt.preventDefault();
    this.annotation.off('g:accessListSaved');
    new _AccessWidget["default"]({
      el: (0, _jquery["default"])('#g-dialog-container'),
      type: 'annotation',
      hideRecurseOption: true,
      parentView: this,
      model: this.annotation,
      noAccessFlag: true
    }).on('g:accessListSaved', function () {
      _this.annotation.fetch();
    });
  },
  cancel: function cancel(evt) {
    if (this.annotation) {
      delete this.annotation._meta;
      delete this.annotation._styleFuncs;
    }

    evt.preventDefault();
    this.$el.modal('hide');
  },
  changeFillColorFunc: function changeFillColorFunc() {
    (0, _jquery["default"])('.h-functional-value #h-annotation-fill-color-func').prop('checked', true);

    this._updateFuncValues();
  },
  changeLineColorFunc: function changeLineColorFunc() {
    (0, _jquery["default"])('.h-functional-value #h-annotation-line-color-func').prop('checked', true);

    this._updateFuncValues();
  },
  checkFixedIfPresent: function checkFixedIfPresent(evt) {
    var val = (0, _jquery["default"])(evt.target).closest('.row').find('input[type="text"]').val();

    if ((val || '').trim().length) {
      (0, _jquery["default"])(evt.target).closest('.row').find('input[type="radio"]').prop('checked', true);
    }
  },
  _updateFuncValues: function _updateFuncValues() {
    var _this2 = this;

    var names = ['fill-color', 'line-color'];
    names.forEach(function (name) {
      var curfunc = _this2.$el.find('#h-annotation-' + name + '-func-list').val();

      var mintext = '';
      var maxtext = '';

      if (_this2._styleableFuncs[curfunc]) {
        if (!_this2._styleableFuncs[curfunc].categoric) {
          mintext = 'Minimum value: ' + _this2._styleableFuncs[curfunc].min;
          maxtext = 'Maximum value: ' + _this2._styleableFuncs[curfunc].max;
        }
      }

      _this2.$el.find('#h-annotation-' + name + '-min-auto').parent().attr('title', mintext);

      _this2.$el.find('#h-annotation-' + name + '-min-setval').parent().attr('title', mintext);

      _this2.$el.find('#h-annotation-' + name + '-max-auto').parent().attr('title', maxtext);

      _this2.$el.find('#h-annotation-' + name + '-max-setval').parent().attr('title', maxtext);
    });
  },
  _getFunctionalProps: function _getFunctionalProps(name, key, valueParam, setValue, color) {
    var geo = window.geo;
    var valueFunc = this.annotation._styleFuncs[key];
    valueFunc.useFunc = this.$('#h-annotation-' + name + '-func').prop('checked');
    valueFunc.key = this.$('#h-annotation-' + name + '-func-list').val();
    valueFunc.minColor = (0, _tinycolor["default"])(this.$('#h-annotation-' + name + '-min').val()).toRgbString();
    valueFunc.minSet = this.$('#h-annotation-' + name + '-min-setval').prop('checked');
    valueFunc.minValue = parseFloat(this.$('#h-annotation-' + name + '-min-val').val());
    valueFunc.minValue = _underscore["default"].isFinite(valueFunc.minValue) ? valueFunc.minValue : undefined;
    valueFunc.maxColor = (0, _tinycolor["default"])(this.$('#h-annotation-' + name + '-max').val()).toRgbString();
    valueFunc.maxSet = this.$('#h-annotation-' + name + '-max-setval').prop('checked');
    valueFunc.maxValue = parseFloat(this.$('#h-annotation-' + name + '-max-val').val());
    valueFunc.maxValue = _underscore["default"].isFinite(valueFunc.maxValue) ? valueFunc.maxValue : undefined;

    if (valueFunc.useFunc) {
      setValue = 'func';
    }

    valueParam.key = valueFunc.key;

    if (this._styleableFuncs[valueFunc.key]) {
      valueParam.min = valueFunc.minSet && _underscore["default"].isFinite(valueFunc.minValue) ? valueFunc.minValue : this._styleableFuncs[valueFunc.key].min;
      valueParam.max = valueFunc.maxSet && _underscore["default"].isFinite(valueFunc.maxValue) ? valueFunc.maxValue : this._styleableFuncs[valueFunc.key].max;
      valueParam.range = valueParam.max - valueParam.min || 1;
      valueParam.minColor = geo.util.convertColor(valueFunc.minColor);
      valueParam.maxColor = geo.util.convertColor(valueFunc.maxColor);
    } else if (setValue === 'func') {
      setValue = false;
    }

    return setValue;
  },

  /**
   * Respond to form submission.  Triggers a `g:save` event on the
   * AnnotationModel.
   */
  save: function save(evt) {
    var _this3 = this;

    evt.preventDefault();
    var validation = '';

    if (!this.$('#h-annotation-name').val()) {
      this.$('#h-annotation-name').parent().addClass('has-error');
      validation += 'Please enter a name. ';
    }

    var setFillColor = !!this.$('#h-annotation-fill-color').val();
    var fillColor = (0, _tinycolor["default"])(this.$('#h-annotation-fill-color').val()).toRgbString();
    var setLineColor = !!this.$('#h-annotation-line-color').val();
    var lineColor = (0, _tinycolor["default"])(this.$('#h-annotation-line-color').val()).toRgbString();
    var setLineWidth = !!this.$('#h-annotation-line-width').val();
    var lineWidth = parseFloat(this.$('#h-annotation-line-width').val());

    if (setLineWidth && (lineWidth < 0 || !isFinite(lineWidth))) {
      validation += 'Invalid line width. ';
      this.$('#h-annotation-line-width').parent().addClass('has-error');
    }

    var fillColorParam = {};
    var lineColorParam = {};

    if (this._showStyleEditor && Object.keys(this._styleableFuncs || {}).length) {
      // get functional values
      setFillColor = this._getFunctionalProps('fill-color', 'fillColor', fillColorParam, fillColor, setFillColor, true);
      setLineColor = this._getFunctionalProps('line-color', 'lineColor', lineColorParam, lineColor, setLineColor, true);
    }

    if (validation) {
      this.$('.g-validation-failed-message').text(validation.trim()).removeClass('hidden');
      return;
    } // all valid


    if (setFillColor || setLineColor || setLineWidth) {
      this.annotation.elements().each(function (element, idx) {
        /* eslint-disable backbone/no-silent */
        if (setFillColor) {
          if (setFillColor === 'func') {
            fillColor = colorFromFunc(element, idx, fillColorParam, _this3._styleableFuncs[fillColorParam.key]);
          }

          element.set('fillColor', fillColor, {
            silent: true
          });
        }

        if (setLineColor) {
          if (setLineColor === 'func') {
            lineColor = colorFromFunc(element, idx, lineColorParam, _this3._styleableFuncs[lineColorParam.key]);
          }

          element.set('lineColor', lineColor, {
            silent: true
          });
        }

        if (setLineWidth) {
          element.set('lineWidth', lineWidth, {
            silent: true
          });
        }
      });

      var annotationData = _underscore["default"].extend({}, this.annotation.get('annotation'));

      annotationData.elements = this.annotation.elements().toJSON();
      this.annotation.set('annotation', annotationData, {
        silent: true
      });
    }

    _underscore["default"].extend(this.annotation.get('annotation'), {
      name: this.$('#h-annotation-name').val(),
      description: this.$('#h-annotation-description').val()
    });

    this.annotation.attributes.annotation.attributes = Object.assign({}, this.annotation._meta);
    this.annotation.attributes.annotation.attributes._styleFuncs = this.annotation._styleFuncs;
    delete this.annotation._meta;
    delete this.annotation._styleFuncs;
    this.annotation.trigger('change:annotation', this.annotation, {});
    this.trigger('g:submit');
    this.$el.modal('hide');
  },
  destroy: function destroy() {
    this.$('.h-colorpicker').colorpicker('destroy');
    SaveAnnotation.prototype.destroy.call(this);
  }
});
/**
 * Create a singleton instance of this widget that will be rendered
 * when `show` is called.
 */


var dialog = new SaveAnnotation({
  parentView: null
});
/**
 * Show the save dialog box.  Watch for the `g:submit` event on the
 * view to respond to user submission of the form.
 *
 * @param {AnnotationModel} annotationElement The element to edit
 * @returns {SaveAnnotation} The dialog's view
 */

function show(annotation, options) {
  _underscore["default"].defaults(options, {
    title: 'Create annotation',
    name: 'Name',
    description: 'Description'
  });

  delete annotation._meta;
  dialog.annotation = annotation;
  dialog.options = options;
  dialog.setElement('#g-dialog-container').render();
  return dialog;
}

var _default = show;
exports["default"] = _default;