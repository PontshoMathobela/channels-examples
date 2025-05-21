from django.contrib import admin

from django.contrib import admin
from .models import Message, UserProfile

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'timestamp', 'is_read')
    list_filter = ('is_read', 'timestamp')
    search_fields = ('content', 'sender__username', 'receiver__username')
    date_hierarchy = 'timestamp'

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_online', 'last_activity')
    list_filter = ('is_online',)
    search_fields = ('user__username',)
