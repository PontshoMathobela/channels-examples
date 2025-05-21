from django.apps import AppConfig

    def ready(self):
       import chat.signals
         # Import the signals module to ensure the signal handlers are registered
         from django.apps import AppConfig

class ConnectChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'connect'
    label = 'connect'  # Explicitly set the label

 