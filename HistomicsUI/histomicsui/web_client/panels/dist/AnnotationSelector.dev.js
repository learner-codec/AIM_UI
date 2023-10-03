"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _underscore = _interopRequireDefault(require("underscore"));

var _jquery = _interopRequireDefault(require("jquery"));

var _rest = require("@girder/core/rest");

var _constants = require("@girder/core/constants");

var _EventStream = _interopRequireDefault(require("@girder/core/utilities/EventStream"));

var _auth = require("@girder/core/auth");

var _Panel = _interopRequireDefault(require("@girder/slicer_cli_web/views/Panel"));

var _AnnotationModel = _interopRequireDefault(require("@girder/large_image_annotation/models/AnnotationModel"));

var _core = require("@girder/core");

var _events = _interopRequireDefault(require("../events"));

var _saveAnnotation2 = _interopRequireDefault(require("../dialogs/saveAnnotation"));

var _annotationSelector = _interopRequireDefault(require("../templates/panels/annotationSelector.pug"));

require("../stylesheets/panels/annotationSelector.styl");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

// Too many elements in the draw panel will crash the browser,
// so we only allow editing of annnotations with less than this
// many elements.
var MAX_ELEMENTS_LIST_LENGTH = 5000;
/**
 * Create a panel controlling the visibility of annotations
 * on the image view.
 */

var AnnotationSelector = _Panel["default"].extend({
  events: _underscore["default"].extend(_Panel["default"].prototype.events, {
    'click .h-annotation-name': '_editAnnotation',
    'click .h-toggle-annotation': 'toggleAnnotation',
    'click .h-delete-annotation': 'deleteAnnotation',
    'click .h-create-annotation': 'createAnnotation',
    'click .h-edit-annotation-metadata': 'editAnnotationMetadata',
    'click .h-show-all-annotations': 'showAllAnnotations',
    'click .h-hide-all-annotations': 'hideAllAnnotations',
    'mouseenter .h-annotation': '_highlightAnnotation',
    'mouseleave .h-annotation': '_unhighlightAnnotation',
    'change #h-toggle-labels': 'toggleLabels',
    'change #h-toggle-interactive': 'toggleInteractiveMode',
    'input #h-annotation-opacity': '_changeGlobalOpacity',
    'input #h-annotation-fill-opacity': '_changeGlobalFillOpacity',
    'click .h-annotation-select-by-region': 'selectAnnotationByRegion',
    'click .h-annotation-group-name': '_toggleExpandGroup'
  }),

  /**
   * Create the panel.
   *
   * @param {object} settings
   * @param {AnnotationCollection} settings.collection
   *     The collection representing the annotations attached
   *     to the current image.
   */
  initialize: function initialize() {
    var _this = this;

    var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    this._expandedGroups = new Set();
    this._opacity = settings.opacity || 0.9;
    this._fillOpacity = settings.fillOpacity || 1.0;
    this._showAllAnnotationsState = false;
    this.listenTo(this.collection, 'sync remove update reset change:displayed change:loading', this._debounceRender);
    this.listenTo(this.collection, 'change:highlight', this._changeAnnotationHighlight);
    this.listenTo(_EventStream["default"], 'g:event.job_status', _underscore["default"].debounce(this._onJobUpdate, 500));
    this.listenTo(_EventStream["default"], 'g:eventStream.start', this._refreshAnnotations);
    this.listenTo(_EventStream["default"], 'g:event.large_image_annotation.create', this._refreshAnnotations);
    this.listenTo(_EventStream["default"], 'g:event.large_image_annotation.remove', this._refreshAnnotations);
    this.listenTo(this.collection, 'change:annotation change:groups', this._saveAnnotation);
    this.listenTo(_core.events, 'g:login', function () {
      _this.collection.reset();

      _this._parentId = undefined;
    });
  },
  render: function render() {
    this._debounceRenderRequest = null;

    if (this.parentItem && this.parentItem.get('folderId')) {
      var annotationGroups = this._getAnnotationGroups();

      if (!this.viewer) {
        this.$el.empty();
        return;
      }

      this.$el.html((0, _annotationSelector["default"])({
        id: 'annotation-panel-container',
        title: '附注',
        activeAnnotation: this._activeAnnotation ? this._activeAnnotation.id : '',
        showLabels: this._showLabels,
        labeltitle: "标签",
        user: (0, _auth.getCurrentUser)() || {},
        creationAccess: this.creationAccess || this._writeAccess >= _constants.AccessType.WRITE,
        writeAccessLevel: _constants.AccessType.WRITE,
        writeAccess: this._writeAccess,
        opacity: this._opacity,
        fillOpacity: this._fillOpacity,
        interactiveMode: this._interactiveMode,
        interactivetitle: "注释",
        expandedGroups: this._expandedGroups,
        annotationGroups: annotationGroups,
        annotationAccess: this._annotationAccess,
        newButtonName: "加薪的",
        collapsed: this.$('.s-panel-content.collapse').length && !this.$('.s-panel-content').hasClass('in'),
        _: _underscore["default"]
      }));

      this._changeGlobalOpacity();

      this._changeGlobalFillOpacity();

      if (this._showAllAnnotationsState) {
        this.showAllAnnotations();
      }

      if (this._annotationAccess === undefined) {
        this._setCreationAccess(this, this.parentItem.get('folderId'));
      }
    }

    return this;
  },
  _debounceRender: function _debounceRender() {
    var _this2 = this;

    if (!this._debounceRenderRequest) {
      this._debounceRenderRequest = window.requestAnimationFrame(function () {
        _this2.render();
      });
    }

    return this;
  },

  /**
   * Set the ItemModel associated with the annotation collection.
   * As a side effect, this resets the AnnotationCollection and
   * fetches annotations from the server associated with the
   * item.
   *
   * @param {ItemModel} item
   */
  setItem: function setItem(item) {
    if (this._parentId === item.id) {
      return;
    }

    this.parentItem = item;
    this._parentId = item.id;
    delete this._setCreationRequest;
    delete this._annotationAccess;

    if (!this._parentId) {
      this.collection.reset();

      this._debounceRender();

      return;
    }

    this.collection.offset = 0;
    this.collection.reset();
    this.collection.fetch({
      itemId: this._parentId
    });
    return this;
  },

  /**
   * Set the image "viewer" instance.  This should be a subclass
   * of `large_image/imageViewerWidget` that is capable of rendering
   * annotations.
   */
  setViewer: function setViewer(viewer) {
    this.viewer = viewer;
    return this;
  },

  /**
   * Toggle the rendering of a specific annotation.  Sets the `displayed`
   * attribute of the `AnnotationModel`.
   */
  toggleAnnotation: function toggleAnnotation(evt) {
    var id = (0, _jquery["default"])(evt.currentTarget).parents('.h-annotation').data('id');
    var model = this.collection.get(id); // any manual change in the display state will reset the "forced display" behavior

    this._showAllAnnotationsState = false;
    model.set('displayed', !model.get('displayed'));

    if (!model.get('displayed')) {
      model.unset('highlight');

      this._deselectAnnotationElements(model);

      this._deactivateAnnotation(model);
    }
  },

  /**
   * Delete an annotation from the server.
   */
  deleteAnnotation: function deleteAnnotation(evt) {
    var _this3 = this;

    var id = (0, _jquery["default"])(evt.currentTarget).parents('.h-annotation').data('id');
    var model = this.collection.get(id);

    if (model) {
      var name = (model.get('annotation') || {}).name || 'unnamed annotation';

      _events["default"].trigger('h:confirmDialog', {
        title: 'Warning',
        message: "Are you sure you want to delete ".concat(name, "?"),
        submitButton: 'Delete',
        onSubmit: function onSubmit() {
          _this3.trigger('h:deleteAnnotation', model);

          model.unset('displayed');
          model.unset('highlight');

          _this3.collection.remove(model);

          if (model._saving) {
            model._saveAgain = 'delete';
          } else {
            model.destroy();
          }
        }
      });
    }
  },
  //for editing annotations data once created 
  editAnnotationMetadata: function editAnnotationMetadata(evt) {
    var _this4 = this;

    var id = (0, _jquery["default"])(evt.currentTarget).parents('.h-annotation').data('id');
    var model = this.collection.get(id);
    this.listenToOnce((0, _saveAnnotation2["default"])(model, {
      title: '修改标注',
      name: "标注名称",
      namePlaceholder: "输入您的标注的名称",
      description: "标注说明",
      descriptionPlaceHolder: "输入可选的描述",
      conDName: "创建日期",
      updDName: '更新日期',
      uidDName: "唯一ID",
      gvDName: "全球版",
      permDName: "编辑权限",
      saveButtonName: "保存",
      cancelButtonName: "取消",
      viewer: this.viewer
    }), 'g:submit', function () {
      if (model.get('displayed')) {
        _this4.trigger('h:redraw', model);
      }
    });
  },
  _setCreationAccess: function _setCreationAccess(root, folderId) {
    var _this5 = this;

    if (!this._setCreationRequest) {
      this._setCreationRequest = (0, _rest.restRequest)({
        type: 'GET',
        url: 'annotation/folder/' + folderId + '/create',
        error: null
      });
    }

    this._setCreationRequest.done(function (createResp) {
      root.creationAccess = createResp;
      root.$('.h-create-annotation').toggleClass('hidden', !createResp);

      if (_this5.parentItem && _this5.parentItem.get('folderId') === folderId) {
        _this5._annotationAccess = true;
      }
    }).fail(function () {
      root.$('.h-create-annotation').toggleClass('hidden', true);

      if (_this5.parentItem && _this5.parentItem.get('folderId') === folderId) {
        _this5._annotationAccess = false;
      }
    });
  },
  _onJobUpdate: function _onJobUpdate(evt) {
    if (this.parentItem && evt.data.status > 2) {
      this._refreshAnnotations();
    }
  },
  _refreshAnnotations: function _refreshAnnotations() {
    var _this6 = this;

    if (this._norefresh) {
      delete this._norefresh;
      return;
    }

    if (!this.parentItem || !this.parentItem.id || !this.viewer) {
      return;
    } // if any annotations are saving, defer this


    if (!this.viewer._saving) {
      this.viewer._saving = {};
    }

    delete this.viewer._saving.refresh;

    if (Object.keys(this.viewer._saving).length) {
      this.viewer._saving.refresh = true;
      return;
    }

    var models = this.collection.indexBy(_underscore["default"].property('id'));
    this.collection.offset = 0;
    this.collection.fetch({
      itemId: this.parentItem.id
    }).then(function () {
      var activeId = (_this6._activeAnnotation || {}).id;

      _this6.collection.each(function (model) {
        if (!_underscore["default"].has(models, model.id)) {
          model.set('displayed', true);
        } else {
          var refreshed = false;

          if (models[model.id].get('displayed')) {
            if (model.get('_version') !== models[model.id].get('_version')) {
              model.refresh(true);
              model.set('displayed', true);
              refreshed = true;
            } else {
              model._centroids = models[model.id]._centroids;
              model._elements = models[model.id]._elements;
            }
          }

          if (!refreshed) {
            // set without triggering a change; a change reloads
            // and rerenders, which is only done if it has changed
            // (above)
            model.attributes.displayed = models[model.id].get('displayed');
          }
        }
      });

      _this6._debounceRender();

      _this6._activeAnnotation = null;

      if (activeId) {
        _this6._setActiveAnnotation(_this6.collection.get(activeId));
      } // remove annotations that are displayed but have been deleted


      Object.keys(models).forEach(function (id) {
        if (!_this6.collection.get(id) && models[id].get('displayed')) {
          _this6._deselectAnnotationElements(models[id]);

          _this6.viewer.removeAnnotation(models[id]);
        }

        if (activeId === id) {
          _this6.trigger('h:deleteAnnotation', models[id]);
        }
      });
      return null;
    });
  },
  toggleLabels: function toggleLabels(evt) {
    this._showLabels = !this._showLabels;
    this.trigger('h:toggleLabels', {
      show: this._showLabels
    });
  },
  toggleInteractiveMode: function toggleInteractiveMode(evt) {
    this._interactiveMode = !this._interactiveMode;
    this.trigger('h:toggleInteractiveMode', this._interactiveMode);
  },
  interactiveMode: function interactiveMode() {
    return this._interactiveMode;
  },
  _editAnnotation: function _editAnnotation(evt) {
    var id = (0, _jquery["default"])(evt.currentTarget).parents('.h-annotation').data('id');
    this.editAnnotation(this.collection.get(id));
  },
  editAnnotation: function editAnnotation(model) {
    // deselect the annotation if it is already selected
    if (this._activeAnnotation && model && this._activeAnnotation.id === model.id) {
      this._activeAnnotation = null;
      this.trigger('h:editAnnotation', null);

      this._debounceRender();

      return;
    }

    if (!this._writeAccess(model)) {
      _events["default"].trigger('g:alert', {
        text: 'You do not have write access to this annotation.',
        type: 'warning',
        timeout: 2500,
        icon: 'info'
      });

      return;
    }

    this._setActiveAnnotation(model);
  },
  _setActiveAnnotation: function _setActiveAnnotation(model) {
    var _this7 = this;

    this._activeAnnotation = model || null;

    if (this._activeAnnotation === null) {
      return;
    }

    if (!((model.get('annotation') || {}).elements || []).length) {
      // Only load the annotation if it hasn't already been loaded.
      // Technically, an annotation *could* have 0 elements, in which
      // case loading it again should be quick.  There doesn't seem
      // to be any other way to detect an unloaded annotation.
      model.set('loading', true);
      model.fetch().done(function () {
        _this7._setActiveAnnotationWithoutLoad(model);
      }).always(function () {
        model.unset('loading');
      });
    } else {
      this._setActiveAnnotationWithoutLoad(model);
    }
  },
  _setActiveAnnotationWithoutLoad: function _setActiveAnnotationWithoutLoad(model) {
    var numElements = ((model.get('annotation') || {}).elements || []).length;

    if (this._activeAnnotation && this._activeAnnotation.id !== model.id) {
      return;
    }

    model.set('displayed', true);

    if (numElements > MAX_ELEMENTS_LIST_LENGTH || model._pageElements) {
      _events["default"].trigger('g:alert', {
        text: 'This annotation has too many elements to be edited.',
        type: 'warning',
        timeout: 5000,
        icon: 'info'
      });

      this._activeAnnotation = null;
      this.trigger('h:editAnnotation', null);
    } else {
      this.trigger('h:editAnnotation', model);
    }
  },
  createAnnotation: function createAnnotation(evt) {
    var _this8 = this;

    var model = new _AnnotationModel["default"]({
      itemId: this.parentItem.id,
      annotation: {}
    });
    this.listenToOnce((0, _saveAnnotation2["default"])(model, {
      title: '创建标注',
      name: "标注名称",
      namePlaceholder: "输入您的标注的名称",
      description: "标注说明",
      descriptionPlaceHolder: "输入可选的描述",
      saveButtonName: "保存",
      cancelButtonName: "取消"
    }), 'g:submit', function () {
      _this8._norefresh = true;
      model.save().done(function () {
        model.set('displayed', true);

        _this8.collection.add(model);

        _this8.trigger('h:editAnnotation', model);

        _this8._activeAnnotation = model;
      });
    });
  },
  _saveAnnotation: function _saveAnnotation(annotation) {
    var _this9 = this;

    if (this.viewer !== null && this.viewer !== undefined && !this.viewer._saving) {
      this.viewer._saving = {};
    }

    if (!annotation._saving && !annotation._inFetch && !annotation.get('loading')) {
      this.viewer._saving[annotation.id] = true;
      this.$el.addClass('saving');
      var lastSaveAgain = annotation._saveAgain;
      annotation._saving = true;
      annotation._saveAgain = false;

      if (annotation.elements().models.filter(function (model) {
        return model.get('type') === 'pixelmap';
      }).length === 0) {
        this.trigger('h:redraw', annotation);
      }

      annotation.save().fail(function () {
        /* If we fail to save (possible because the server didn't
         * respond), try again, gradually backing off the frequency
         * of retries. */
        annotation._saveAgain = Math.min(lastSaveAgain ? lastSaveAgain * 2 : 5, 300);
      }).always(function () {
        annotation._saving = false;

        if (_this9.viewer === null || _this9.viewer === undefined) {
          return;
        }

        delete _this9.viewer._saving[annotation.id];

        if (annotation._saveAgain !== undefined && annotation._saveAgain !== false) {
          if (annotation._saveAgain === 'delete') {
            annotation.destroy();
          } else if (!annotation._saveAgain) {
            _this9._saveAnnotation(annotation);
          } else {
            _this9.viewer._saving[annotation.id] = true;
            window.setTimeout(function () {
              if (annotation._saveAgain !== undefined && annotation._saveAgain !== false) {
                _this9._saveAnnotation(annotation);
              }
            }, annotation._saveAgain * 1000);
          }
        }

        if (Object.keys(_this9.viewer._saving).length === 1 && _this9.viewer._saving.refresh) {
          _this9._refreshAnnotations();
        }

        if (!Object.keys(_this9.viewer._saving).length || Object.keys(_this9.viewer._saving).length === 1 && _this9.viewer._saving.refresh) {
          _this9.$el.removeClass('saving');
        }
      });
    } else if (!annotation._inFetch && !annotation.get('loading')) {
      /* if we are saving, flag that we need to save again after we
       * finish as there are newer changes. */
      if (annotation._saveAgain !== 'delete') {
        annotation._saveAgain = 0;
      }

      if (annotation.elements().models.filter(function (model) {
        return model.get('type') === 'pixelmap';
      }).length === 0) {
        this.trigger('h:redraw', annotation);
      }
    } else {
      annotation._saveAgain = false;
      delete this.viewer._saving[annotation.id];

      if (annotation.elements().models.filter(function (model) {
        return model.get('type') === 'pixelmap';
      }).length === 0) {
        this.trigger('h:redraw', annotation);
      }

      if (Object.keys(this.viewer._saving).length === 1 && this.viewer._saving.refresh) {
        this._refreshAnnotations();
      }

      if (!Object.keys(this.viewer._saving).length || Object.keys(this.viewer._saving).length === 1 && this.viewer._saving.refresh) {
        this.$el.removeClass('saving');
      }
    }
  },
  _writeAccess: function _writeAccess(annotation) {
    return annotation.get('_accessLevel') >= _constants.AccessType.ADMIN;
  },
  _deactivateAnnotation: function _deactivateAnnotation(model) {
    if (this._activeAnnotation && this._activeAnnotation.id === model.id) {
      this._activeAnnotation = null;
      this.trigger('h:editAnnotation', null);

      this._debounceRender();
    }
  },
  _deselectAnnotationElements: function _deselectAnnotationElements(model) {
    this.parentView.trigger('h:deselectAnnotationElements', {
      model: model
    });
  },
  showAllAnnotations: function showAllAnnotations() {
    this._showAllAnnotationsState = true;
    this.collection.each(function (model) {
      model.set('displayed', true);
    });
  },
  hideAllAnnotations: function hideAllAnnotations() {
    var _this10 = this;

    this._showAllAnnotationsState = false;
    this.collection.each(function (model) {
      model.set('displayed', false);

      _this10._deselectAnnotationElements(model);

      _this10._deactivateAnnotation(model);
    });
  },
  selectAnnotationByRegionActive: function selectAnnotationByRegionActive() {
    var btn = this.$('.h-annotation-select-by-region');
    return !!btn.hasClass('active');
  },
  selectAnnotationByRegion: function selectAnnotationByRegion(polygon) {
    var _this11 = this;

    var btn = this.$('.h-annotation-select-by-region'); // listen to escape key

    (0, _jquery["default"])(document).on('keydown.h-annotation-select-by-region', function (evt) {
      if (evt.keyCode === 27) {
        _this11.selectAnnotationByRegionCancel();
      }
    });
    this.listenToOnce(this.parentView, 'h:selectedElementsByRegion', function () {
      btn.removeClass('active');
      (0, _jquery["default"])(document).off('keydown.h-annotation-select-by-region');
    });

    if (!btn.hasClass('active')) {
      btn.addClass('active');
      this.parentView.trigger('h:selectElementsByRegion', {
        polygon: polygon === true
      });
    } else {
      this.selectAnnotationByRegionCancel();
    }
  },
  selectAnnotationByRegionCancel: function selectAnnotationByRegionCancel() {
    var btn = this.$('.h-annotation-select-by-region');

    if (btn.hasClass('active')) {
      btn.removeClass('active');
      (0, _jquery["default"])(document).off('keydown.h-annotation-select-by-region');
      this.parentView.trigger('h:selectElementsByRegionCancel');
    }
  },
  _highlightAnnotation: function _highlightAnnotation(evt) {
    var id = (0, _jquery["default"])(evt.currentTarget).data('id');
    var model = this.collection.get(id);

    if (model.get('displayed')) {
      this.parentView.trigger('h:highlightAnnotation', id);
    }
  },
  _unhighlightAnnotation: function _unhighlightAnnotation() {
    this.parentView.trigger('h:highlightAnnotation');
  },
  _changeAnnotationHighlight: function _changeAnnotationHighlight(model) {
    this.$(".h-annotation[data-id=\"".concat(model.id, "\"]")).toggleClass('h-highlight-annotation', model.get('highlighted'));
  },
  _changeGlobalOpacity: function _changeGlobalOpacity() {
    this._opacity = this.$('#h-annotation-opacity').val();
    this.$('.h-annotation-opacity-container').attr('title', "Annotation total opacity ".concat((this._opacity * 100).toFixed(), "%"));
    this.trigger('h:annotationOpacity', this._opacity);
  },
  _changeGlobalFillOpacity: function _changeGlobalFillOpacity() {
    this._fillOpacity = this.$('#h-annotation-fill-opacity').val();
    this.$('.h-annotation-fill-opacity-container').attr('title', "Annotation fill opacity ".concat((this._fillOpacity * 100).toFixed(), "%"));
    this.trigger('h:annotationFillOpacity', this._fillOpacity);
  },
  _toggleExpandGroup: function _toggleExpandGroup(evt) {
    var name = (0, _jquery["default"])(evt.currentTarget).parent().data('groupName');

    if (this._expandedGroups.has(name)) {
      this._expandedGroups["delete"](name);
    } else {
      this._expandedGroups.add(name);
    }

    this._debounceRender();
  },
  _getAnnotationGroups: function _getAnnotationGroups() {
    var _this12 = this;

    // Annotations without elements don't have any groups, so we inject the null group
    // so that they are displayed in the panel.
    this.collection.each(function (a) {
      var groups = a.get('groups') || [];

      if (!groups.length) {
        groups.push(null);
      }
    });
    var groupObject = {};

    var groups = _underscore["default"].union.apply(_underscore["default"], _toConsumableArray(this.collection.map(function (a) {
      return a.get('groups');
    })));

    _underscore["default"].each(groups, function (group) {
      var groupList = _this12.collection.filter(function (a) {
        return _underscore["default"].contains(a.get('groups'), group);
      });

      if (group === null) {
        group = '其他';
      }

      groupObject[group] = _underscore["default"].sortBy(groupList, function (a) {
        return a.get('created');
      });
    });

    this._triggerGroupCountChange(groupObject);

    return groupObject;
  },
  _triggerGroupCountChange: function _triggerGroupCountChange(groups) {
    var _this13 = this;

    var groupCount = {};

    _underscore["default"].each(groups, function (annotations, name) {
      if (name !== 'Other') {
        groupCount[name] = annotations.length;
      } else {
        groupCount[_this13.parentView._defaultGroup || 'default'] = annotations.length;
      }
    });

    this.trigger('h:groupCount', groupCount);
  }
});

var _default = AnnotationSelector;
exports["default"] = _default;