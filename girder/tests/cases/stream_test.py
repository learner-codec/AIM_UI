# -*- coding: utf-8 -*-
import os
import requests
import time

from .. import base
from girder import config
from girder.api import access
from girder.api.rest import Resource, iterBody

_chunks = []
os.environ['GIRDER_PORT'] = os.environ.get('GIRDER_TEST_PORT', '20200')
config.loadConfig()  # Must reload config to pickup correct port


def setUpModule():
    server = base.startServer(mock=False)
    server.root.api.v1.stream_test = StreamTestResource()


def tearDownModule():
    base.stopServer()


class StreamTestResource(Resource):
    def __init__(self):
        super().__init__()
        self.resourceName = 'stream_test'
        self.route('POST', ('input_stream',), self.inputStream)

    @access.public
    def inputStream(self, params):
        # Read body 5 bytes at a time so we can test chunking a small body
        strictLength = self.boolParam('strictLength', params, False)
        for chunk in iterBody(5, strictLength=strictLength):
            _chunks.append(chunk.decode())
        return _chunks


class StreamTestCase(base.TestCase):
    def setUp(self):
        super().setUp()

        global _chunks
        _chunks = []

        self.apiUrl = 'http://localhost:%s/api/v1' % os.environ['GIRDER_PORT']

    def _genChunks(self, strictLength=False):
        """
        Passing a generator to requests.request as the data argument causes
        a chunked transfer encoding, where each yielded buffer is sent as
        a separate chunk.
        """
        for i in range(1, 4):
            buf = 'chunk%d' % i
            yield buf.encode()
            start = time.time()
            while len(_chunks) != i:
                time.sleep(.1)
                # Wait for server thread to read the chunk
                if time.time() - start > 5:
                    print('ERROR: Timeout waiting for chunk %d' % i)
                    return

            if not strictLength:
                self.assertEqual(len(_chunks), i)
                self.assertEqual(_chunks[-1], buf)

    def testChunkedTransferEncoding(self):
        """
        This test verifies that chunked transfer encoding bodies are received
        as the chunks are sent, rather than waiting for the final chunk to
        be sent.
        """
        resp = requests.post(self.apiUrl + '/stream_test/input_stream',
                             data=self._genChunks(False))
        if resp.status_code != 200:
            print(resp.json())
            raise Exception('Server returned exception status %s' %
                            resp.status_code)
        self.assertEqual(resp.json(), ['chunk1', 'chunk2', 'chunk3'])

    def testStrictLength(self):
        """
        Tests the strictLength=True behavior using a chunked transfer encoding.
        """
        resp = requests.post(
            self.apiUrl + '/stream_test/input_stream', params={
                'strictLength': True
            }, data=self._genChunks(True))
        if resp.status_code != 200:
            print(resp.json())
            raise Exception('Server returned exception status %s' %
                            resp.status_code)
        self.assertEqual(resp.json(), ['chunk', '1chun', 'k2chu', 'nk3'])

    def testKnownLengthBodyReady(self):
        """
        This exercises the behavior of iterBody in the case of requests with
        Content-Length passed.
        """
        resp = requests.post(self.apiUrl + '/stream_test/input_stream',
                             data='hello world')
        resp.raise_for_status()
        self.assertEqual(resp.json(), ['hello', ' worl', 'd'])
