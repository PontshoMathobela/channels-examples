"""
ASGI config for connect project.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import connect.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'connect_settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            connect.routing.websocket_urlpatterns
        )
    ),
})
