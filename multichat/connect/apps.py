from django.apps import AppConfig

class ConnectChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'connect'
    label = 'connect'  # Explicitly set the label

    def ready(self):
        pass

