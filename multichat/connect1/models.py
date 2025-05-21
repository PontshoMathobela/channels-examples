from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class UserProfile(models.Model):
    """
    Extended profile for User model to track online status.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    is_online = models.BooleanField(default=False)
    last_activity = models.DateTimeField(default=timezone.now)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    is_online = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.user.username}'s profile"
    
    @property
    def has_unread_messages(self):
        """Check if user has any unread messages."""
        return Message.objects.filter(receiver=self.user, is_read=False).exists()
    
    @property
    def unread_message_count(self):
        """Get count of unread messages."""
        return Message.objects.filter(receiver=self.user, is_read=False).count()


class Message(models.Model):
    """
    Model to store chat messages.
    """
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['timestamp']
    indexes = [
        models.Index(fields=['sender', 'receiver', 'is_read']),
        models.Index(fields=['timestamp']),
        app_label =='connect'    
    ]
    

    
    def __str__(self):
        return f"From {self.sender.username} to {self.receiver.username}: {self.content[:20]}"
    
    @property
    def formatted_timestamp(self):
        """Return nicely formatted timestamp for templates."""
        if timezone.now().date() == self.timestamp.date():
            # Today, show only time
            return self.timestamp.strftime("%H:%M")
        elif timezone.now().date() - self.timestamp.date() == timezone.timedelta(days=1):
            # Yesterday
            return f"Yesterday {self.timestamp.strftime('%H:%M')}"
        else:
            # Other days
            return self.timestamp.strftime("%d %b %Y, %H:%M")

