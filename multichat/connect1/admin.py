from django.contrib import admin
from .models import Message, UserProfile

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'timestamp', 'is_read')
    list_filter = ('is_read', 'timestamp')
    search_fields = ('content', 'sender__username', 'receiver__username')
    date_hierarchy = 'timestamp'
    raw_id_fields = ('sender', 'receiver')
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f"{updated} messages marked as read")
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f"{updated} messages marked as unread")

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_online', 'last_activity')
    list_filter = ('is_online',)
    search_fields = ('user__username', 'user__email')
    date_hierarchy = 'last_activity'
    list_editable = ('is_online',)
    raw_id_fields = ('user',)