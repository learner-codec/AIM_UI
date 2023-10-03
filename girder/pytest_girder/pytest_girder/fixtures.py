import hashlib
import mongomock
import os
import pytest
import shutil
import unittest.mock

from .plugin_registry import PluginRegistry
from .utils import MockSmtpReceiver, serverContext


def _uid(node):
    """
    Generate a unique name from a pytest request node object.
    """
    return '_'.join((node.module.__name__, node.cls.__name__ if node.cls else '', node.name))


@pytest.fixture(scope='session', autouse=True)
def _disableRealDatabaseConnectivity():
    from girder.utility.config import getConfig

    class MockDict(dict):
        def get(self, *args, **kwargs):
            raise Exception('You must use the "db" fixture in tests that connect to the database.')

    with unittest.mock.patch.dict(getConfig(), {'database': MockDict()}):
        yield


@pytest.fixture
def db(request):
    """
    Require a Mongo test database.

    Provides a Mongo test database named after the requesting test function. Mongo databases are
    created/destroyed based on the URI provided with the --mongo-uri option and tear-down
    behavior is modified by the --keep-db option.
    """
    from girder.models import _dbClients, getDbConnection, pymongo
    from girder.models import model_base
    from girder.models.user import User

    mockDb = request.config.getoption('--mock-db')
    dbUri = request.config.getoption('--mongo-uri')
    dbName = 'girder_test_%s' % hashlib.md5(_uid(request.node).encode('utf8')).hexdigest()
    keepDb = request.config.getoption('--keep-db')
    realMongoClient = pymongo.MongoClient

    if mockDb:
        pymongo.MongoClient = mongomock.MongoClient

    connection = getDbConnection(uri='%s/%s' % (dbUri, dbName), quiet=False)

    # Force getDbConnection from models to return our connection
    _dbClients[(None, None)] = connection

    connection.drop_database(dbName)

    # Since models store a local reference to the current database, we need to force them all to
    # reconnect
    for model in model_base._modelSingletons:
        model.reconnect()

    # Use faster password hashing to avoid unnecessary testing bottlenecks. Any test case
    # that creates a user goes through the password hashing process, so we avoid actual bcrypt.
    originalCryptContext = User()._cryptContext
    User()._cryptContext = originalCryptContext.copy(schemes=['plaintext'])

    yield connection

    User()._cryptContext = originalCryptContext

    if not keepDb:
        connection.drop_database(dbName)

    connection.close()

    # Clear connection cache and model singletons
    _dbClients.clear()
    for model in model_base._modelSingletons:
        model.__class__._instance = None

    if mockDb:
        pymongo.MongoClient = realMongoClient


def _getPluginsFromMarker(request, registry):
    plugins = []

    if request.node.get_closest_marker('plugin') is not None:
        for pluginMarker in request.node.iter_markers('plugin'):
            pluginName = pluginMarker.args[0]
            if len(pluginMarker.args) > 1:
                registry.registerTestPlugin(*pluginMarker.args, **pluginMarker.kwargs)
            plugins.append(pluginName)
    return plugins


@pytest.fixture
def server(db, request):
    """
    Require a CherryPy embedded server.

    Provides a started CherryPy embedded server with a request method for
    performing local requests against it. Note: this fixture requires the db
    fixture.
    """
    registry = PluginRegistry()
    with registry():
        plugins = _getPluginsFromMarker(request, registry)
        with serverContext(plugins) as server:
            yield server


@pytest.fixture
def boundServer(db, request):
    """
    Require a CherryPy server that listens on a port.

    Provides a started CherryPy server with a bound port and a request method
    for performing local requests against it. Note: this fixture requires the
    db fixture.  The returned value has an `boundPort` property identifying
    where the server can be reached.  The server can then be accessed via http
    via an address like `'http://127.0.0.1:%d/api/v1/...' %
    boundServer.boundPort`.
    """
    registry = PluginRegistry()
    with registry():
        plugins = _getPluginsFromMarker(request, registry)
        with serverContext(plugins, bindPort=True) as server:
            yield server


@pytest.fixture
def smtp(db, server):
    """
    Provides a mock SMTP server for testing.
    """
    # TODO strictly speaking, this does not depend on the server itself, but does
    # depend on the events daemon, which is currently managed by the server fixture.
    # We should sort this out so that the daemon is its own fixture rather than being
    # started/stopped via the cherrypy server lifecycle.
    from girder.models.setting import Setting
    from girder.settings import SettingKey

    receiver = MockSmtpReceiver()
    receiver.start()

    host, port = receiver.address
    Setting().set(SettingKey.SMTP_HOST, host)
    Setting().set(SettingKey.SMTP_PORT, port)

    yield receiver

    receiver.stop()


@pytest.fixture
def admin(db):
    """
    Require an admin user.

    Provides a user with the admin flag set to True.
    """
    from girder.models.user import User
    u = User().createUser(email='admin@girder.test', login='admin', firstName='Admin',
                          lastName='Admin', password='password', admin=True)

    yield u


@pytest.fixture
def user(db, admin):
    """
    Require a user.

    Provides a regular user with no additional privileges. Note this fixture requires
    the admin fixture since an administrative user must exist before a regular user can.
    """
    from girder.models.user import User
    u = User().createUser(email='user@girder.test', login='user', firstName='user',
                          lastName='user', password='password', admin=False)

    yield u


@pytest.fixture
def fsAssetstore(db, request):
    """
    Require a filesystem assetstore. Its location will be derived from the test function name.
    """
    from girder.constants import ROOT_DIR
    from girder.models.assetstore import Assetstore

    name = _uid(request.node)
    path = os.path.join(ROOT_DIR, 'tests', 'assetstore', name)

    if os.path.isdir(path):
        shutil.rmtree(path)

    yield Assetstore().createFilesystemAssetstore(name=name, root=path)

    if os.path.isdir(path):
        shutil.rmtree(path)


__all__ = ('admin', 'db', 'fsAssetstore', 'server', 'boundServer', 'user', 'smtp')
