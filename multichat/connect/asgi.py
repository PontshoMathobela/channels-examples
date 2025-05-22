"""
ASGI config for connect project.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# Make sure this matches your actual settings file location:
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'connect.settings')  # <-- Common default

import connect.routing  # Make sure connect/routing.py exists

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            connect.routing.websocket_urlpatterns
        )
    ),
})
