import girder_large_image
from girder.api import access
from girder.api.describe import Description, autoDescribeRoute
from girder.api.v1.item import Item as ItemResource
from girder.constants import AccessType, TokenScope
from girder.exceptions import RestException
from girder.models.folder import Folder


def _isLargeImageItem(item):
    return item.get('largeImage', {}).get('fileId') is not None


class ImageBrowseResource(ItemResource):
    """Extends the "item" resource to iterate through images im a folder."""

    def __init__(self, apiRoot):
        # Don't call the parent (Item) constructor, to avoid redefining routes,
        # but do call the grandparent (Resource) constructor
        super(ItemResource, self).__init__()

        self.resourceName = 'item'
        apiRoot.item.route('GET', (':id', 'next_image'), self.getNextImage)
        apiRoot.item.route('GET', (':id', 'previous_image'), self.getPreviousImage)
        apiRoot.item.route('GET', (':id', 'adjacent_images'), self.getPreviousAndNextImages)

    def getAdjacentImages(self, currentImage, currentFolder=None):
        folderModel = Folder()
        if currentFolder:
            folder = currentFolder
        else:
            folder = folderModel.load(
                currentImage['folderId'], user=self.getCurrentUser(), level=AccessType.READ)

        sort = [('name', 1)]
        try:
            conf = girder_large_image.YAMLConfigFile(
                folder, '.large_image_config.yaml', self.getCurrentUser())
            if conf['itemList']['defaultSort']:
                sort = [(
                    ('meta.' if entry['type'] == 'metadata' else '') + entry['value'],
                    1 if entry['dir'] == 'down' else -1)
                    for entry in conf['itemList']['defaultSort']]
        except Exception:
            pass

        if folder.get('isVirtual'):
            children = folderModel.childItems(folder, sort=sort, includeVirtual=True)
        else:
            children = folderModel.childItems(folder, sort=sort)

        allImages = [item for item in children if _isLargeImageItem(item)]
        try:
            index = allImages.index(currentImage)
        except ValueError:
            raise RestException('Id is not an image', 404)

        return {
            'previous': allImages[index - 1],
            'next': allImages[(index + 1) % len(allImages)],
            'index': index,
            'count': len(allImages),
        }

    @access.public(scope=TokenScope.DATA_READ)
    @autoDescribeRoute(
        Description('Get the next image in the same folder as the given item.')
        .modelParam('id', 'The current image ID',
                    model='item', destName='image', paramType='path', level=AccessType.READ)
        .modelParam('folderId', 'The (virtual) folder ID the image is located in',
                    model='folder', destName='folder', paramType='query', level=AccessType.READ,
                    required=False)
        .errorResponse()
        .errorResponse('Image not found', code=404)
    )
    def getNextImage(self, image, folder):
        return self.getAdjacentImages(image, folder)['next']

    @access.public(scope=TokenScope.DATA_READ)
    @autoDescribeRoute(
        Description('Get the previous image in the same folder as the given item.')
        .modelParam('id', 'The current item ID',
                    model='item', destName='image', paramType='path', level=AccessType.READ)
        .modelParam('folderId', 'The (virtual) folder ID the image is located in',
                    model='folder', destName='folder', paramType='query', level=AccessType.READ,
                    required=False)
        .errorResponse()
        .errorResponse('Image not found', code=404)
    )
    def getPreviousImage(self, image, folder):
        return self.getAdjacentImages(image, folder)['previous']

    @access.public(scope=TokenScope.DATA_READ)
    @autoDescribeRoute(
        Description('Get the previous and next image in the same folder as the given item.')
        .modelParam('id', 'The current item ID',
                    model='item', destName='image', paramType='path', level=AccessType.READ)
        .modelParam('folderId', 'The (virtual) folder ID the image is located in',
                    model='folder', destName='folder', paramType='query', level=AccessType.READ,
                    required=False)
        .errorResponse()
        .errorResponse('Image not found', code=404)
    )
    def getPreviousAndNextImages(self, image, folder):
        return self.getAdjacentImages(image, folder)
