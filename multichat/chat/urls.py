from django.urls import path
from . import views
from django.contrib.auth.views import LogoutView

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login_view, name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('register/', views.register_view, name='register'),
    path('get_messages/<int:user_id>/', views.get_messages, name='get_messages'),
    path('get_users/', views.get_users, name='get_users'),
]
