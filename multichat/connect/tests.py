from django.test import TestCase
from channels.testing import WebsocketCommunicator

async def test_consumer():
    communicator = WebsocketCommunicator(consumer, "/ws/chat/")
    connected, _ = await communicator.connect()
    assert connected
    await communicator.disconnect()