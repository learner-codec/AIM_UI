import $ from 'jquery';

import BrowserWidget from '@girder/core/views/widgets/BrowserWidget';
import ItemModel from '@girder/core/models/ItemModel';
import FolderModel from '@girder/core/models/FolderModel';

import events from '../events';
import router from '../router';

var dialog;

function createDialog(item, itemParent) {
    var widget = new BrowserWidget({
        parentView: null,
        titleText: '选一个 WSI 幻灯片...',//'Select a slide...',
        submitText: '打开',//'Open',
        cancelText: '取消',
        showItems: true,
        selectedItemPlaceholder:"选定的",
        selectItem: true,
        helpText: '单击要打开的 WSI 图像...',
        root: itemParent,
        rootSelectorSettings: {
            pageLimit: 0,
            selectByResource: itemParent
        },
        validate: function (item) {
            if (!item.has('largeImage')) {
                return $.Deferred().reject('Please select a "large image" item.').promise();
            }
            return $.Deferred().resolve().promise();
        },
        highlightItem: true,
        paginated: true,
        defaultSelectedResource: item
    });
    widget.on('g:saved', (model) => {
        if (!model) {
            return;
        }
        let folderId = null;
        if (widget.root && widget.root.attributes.isVirtual) {
            // in case of a virtual parent folder keep the folder in the loop
            folderId = widget.root.id;
        }
        // reset image bounds when opening a new image
        router.setQuery('bounds', null, {trigger: false});
        router.setQuery('folder', folderId, {trigger: false});
        router.setQuery('image', model.id, {trigger: true});
        $('.modal').girderModal('close');
    });
    return widget;
}

events.on('h:openImageUi', function () {
    var itemId = router.getQuery('image');
    if (itemId) {
        var item = new ItemModel();
        item.set({_id: router.getQuery('image')}).once('g:fetched', () => {
            if (router.getQuery('folder')) {
                var folder = new FolderModel();
                var folderId = router.getQuery('folder');
                folder.set({_id: folderId}).once('g:fetched', () => {
                    dialog = createDialog(item, folder);
                    dialog.setElement($('#g-dialog-container')).render();
                }).fetch();
            } else {
                dialog = createDialog(item);
                dialog.setElement($('#g-dialog-container')).render();
            }
        }).fetch();
    } else {
        if (!dialog) {
            dialog = createDialog();
        }
        dialog.setElement($('#g-dialog-container')).render();
    }
});
