from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views  # Importing auth views
from chat.views import index  # Importing index view

urlpatterns = [
    path('', index, name='index'), # Home page
    path('accounts/', include('django.contrib.auth.urls')),  # Includes all auth URLs
    path('admin/', admin.site.urls),
]