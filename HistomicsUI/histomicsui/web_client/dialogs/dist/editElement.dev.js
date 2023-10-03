"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _tinycolor = _interopRequireDefault(require("tinycolor2"));

var _View = _interopRequireDefault(require("@girder/core/views/View"));

var _EditHeatmapOrGridDataContainer = _interopRequireDefault(require("../vue/components/EditHeatmapOrGridDataContainer.vue"));

var _editElement = _interopRequireDefault(require("../templates/dialogs/editElement.pug"));

require("@girder/core/utilities/jquery/girderModal");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Create a modal dialog with fields to edit the properties of
 * an annotation element.
 */
var EditElement = _View["default"].extend({
  events: {
    'click .h-submit': 'getData',
    'submit form': 'getData',
    'hide.bs.modal ': 'endEdit'
  },
  render: function render() {
    this.$el.html((0, _editElement["default"])({
      element: this.annotationElement.toJSON(),
      titleDName: "编辑注释样式",
      //Edit annotation styles
      nameDName: "编辑组名",
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
      saveDName: "保存" //save

    })).girderModal(this);
    this.createVueModal();
    return this;
  },
  createVueModal: function createVueModal() {
    var el = this.$('.vue-component-heatmap').get(0);
    var vm = new _EditHeatmapOrGridDataContainer["default"]({
      el: el,
      propsData: {
        element: this.annotationElement,
        parentView: this
      }
    });
    this.vueApp = vm;
  },
  closeVueModal: function closeVueModal() {
    this.$el.modal('hide');
    this.vueApp.$destroy();
  },

  /**
   * Get all data from the form and set the attributes of the
   * attached ElementModel (triggering a change event).
   */
  getData: function getData(evt) {
    evt.preventDefault();
    var data = {};
    var validation = '';
    var label = this.$('#h-element-label').val();
    data.label = label ? {
      value: label
    } : {};
    var group = this.$('#h-group-name').val();
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
      return;
    }

    this.trigger('h:editElement', {
      element: this.annotationElement,
      data: data,
      edited: true
    });
    this.annotationElement.set(data);
    this.$el.modal('hide');
  },

  /**
   * Trigger the draw widget's edit element event listener when the form isn't
   * submitted, to prevent later edits from being considered multiple times
   */
  endEdit: function endEdit() {
    this.trigger('h:editElement', {
      edited: false
    });
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
  }
});
/**
 * Create a singleton instance of this widget that will be rendered
 * when `show` is called.
 */


var dialog = new EditElement({
  parentView: null
});
/**
 * Show the edit dialog box.  Watch for change events on the passed
 * `ElementModel` to respond to user submission of the form.
 *
 * @param {ElementModel} annotationElement The element to edit
 * @returns {EditAnnotation} The dialog's view
 */

function show(annotationElement, defaultGroup) {
  dialog.annotationElement = annotationElement;
  dialog._defaultGroup = defaultGroup || 'default';
  dialog.setElement('#g-dialog-container').render();
  return dialog;
}

var _default = show;
exports["default"] = _default;