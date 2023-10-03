"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _jquery = _interopRequireDefault(require("jquery"));

var _backbone = _interopRequireDefault(require("backbone"));

var _router = _interopRequireDefault(require("@girder/core/router"));

var _View = _interopRequireDefault(require("@girder/core/views/View"));

var _events = _interopRequireDefault(require("@girder/core/events"));

var _auth = require("@girder/core/auth");

var _layoutGlobalNav = _interopRequireDefault(require("@girder/core/templates/layout/layoutGlobalNav.pug"));

require("@girder/core/stylesheets/layout/globalNav.styl");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * This view shows a list of global navigation links that should be
 * displayed at all times.
 */
var LayoutGlobalNavView = _View["default"].extend({
  events: {
    'click .g-nav-link': function clickGNavLink(event) {
      event.preventDefault(); // so we can keep the href

      var link = (0, _jquery["default"])(event.currentTarget);

      _router["default"].navigate(link.attr('g-target'), {
        trigger: true
      }); // Must call this after calling navigateTo, since that
      // deactivates all global nav links.


      link.parent().addClass('g-active');
    }
  },
  initialize: function initialize(settings) {
    _events["default"].on('g:highlightItem', this.selectForView, this);

    _events["default"].on('g:login', this.render, this);

    _events["default"].on('g:logout', this.render, this);

    _events["default"].on('g:login-changed', this.render, this);

    settings = settings || {};

    if (settings.navItems) {
      this.navItems = settings.navItems;
    } else {
      this.defaultNavItems = [{
        name: '文件夹',
        //Collections
        icon: 'icon-sitemap',
        target: 'collections'
      }, {
        name: '组',
        //Groups
        icon: 'icon-users',
        target: 'groups'
      }];
    }
  },
  render: function render() {
    var navItems;

    if (this.navItems) {
      navItems = this.navItems;
    } else {
      navItems = this.defaultNavItems;

      if ((0, _auth.getCurrentUser)()) {
        // copy navItems so that this.defaultNavItems is unchanged
        navItems = navItems.slice();
        navItems.push({
          name: '用户',
          //Users
          icon: 'icon-user',
          target: 'users'
        });

        if ((0, _auth.getCurrentUser)().get('admin')) {
          navItems.push({
            name: '管理控制台',
            //Admin Console
            icon: 'icon-wrench',
            target: 'admin'
          });
        }
      }
    }

    this.$el.html((0, _layoutGlobalNav["default"])({
      navItems: navItems
    }));

    if (_backbone["default"].history.fragment) {
      this.$('[g-target="' + _backbone["default"].history.fragment + '"]').parent().addClass('g-active');
    }

    return this;
  },

  /**
   * Highlight the item with the given target attribute, which is the name
   * of the view it navigates to.
   */
  selectForView: function selectForView(viewName) {
    this.deactivateAll();
    this.$('[g-name="' + viewName.slice(0, -4) + '"]').parent().addClass('g-active');
  },
  deactivateAll: function deactivateAll() {
    this.$('.g-global-nav-li').removeClass('g-active');
  }
});

var _default = LayoutGlobalNavView;
exports["default"] = _default;