import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Message, UserProfile


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if not self.user.is_authenticated:
            # Reject the connection if user is not authenticated
            await self.close()
            return
        
        # Update user's online status
        await self.update_user_status(True)
        
        # Join a group for the user to receive personal messages
        self.user_group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        # Join a general group to broadcast online status
        await self.channel_layer.group_add(
            'all_users',
            self.channel_name
        )
        
        await self.accept()
        
        # Broadcast to all users that this user is online
        await self.channel_layer.group_send(
            'all_users',
            {
                'type': 'user_status',
                'user_id': self.user.id,
                'status': 'online'
            }
        )

    async def disconnect(self, close_code):
        # Update user's offline status
        await self.update_user_status(False)
        
        # Leave user's personal group
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )
        
        # Leave the general group
        await self.channel_layer.group_discard(
            'all_users',
            self.channel_name
        )
        
        # Broadcast to all users that this user is offline
        await self.channel_layer.group_send(
            'all_users',
            {
                'type': 'user_status',
                'user_id': self.user.id,
                'status': 'offline'
            }
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'chat_message')
        
        if message_type == 'chat_message':
            message = data['message']
            receiver_id = data['receiver_id']
            
            # Save message to database
            message_obj = await self.save_message(receiver_id, message)
            
            # Send message to personal group of receiver
            receiver_group_name = f"user_{receiver_id}"
            await self.channel_layer.group_send(
                receiver_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender_id': self.user.id,
                    'sender_username': self.user.username,
                    'message_id': message_obj.id,
                    'timestamp': message_obj.timestamp.isoformat()
                }
            )
            
            # Send confirmation back to sender
            await self.channel_layer.group_send(
                self.user_group_name,
                {
                    'type': 'message_sent',
                    'message': message,
                    'receiver_id': receiver_id,
                    'message_id': message_obj.id,
                    'timestamp': message_obj.timestamp.isoformat()
                }
            )
            
        elif message_type == 'read_messages':
            sender_id = data['sender_id']
            await self.mark_messages_as_read(sender_id)
            
            # Notify sender that messages were read
            sender_group_name = f"user_{sender_id}"
            await self.channel_layer.group_send(
                sender_group_name,
                {
                    'type': 'messages_read',
                    'reader_id': self.user.id
                }
            )
            
        elif message_type == 'typing_status':
            receiver_id = data['receiver_id']
            is_typing = data['is_typing']
            
            # Send typing status to receiver
            receiver_group_name = f"user_{receiver_id}"
            await self.channel_layer.group_send(
                receiver_group_name,
                {
                    'type': 'typing_status',
                    'user_id': self.user.id,
                    'is_typing': is_typing
                }
            )

    async def chat_message(self, event):
        """
        Send message to WebSocket.
        """
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'message_id': event['message_id'],
            'timestamp': event['timestamp']
        }))

    async def message_sent(self, event):
        """
        Confirm message was sent.
        """
        await self.send(text_data=json.dumps({
            'type': 'message_sent',
            'message': event['message'],
            'receiver_id': event['receiver_id'],
            'message_id': event['message_id'],
            'timestamp': event['timestamp']
        }))

    async def messages_read(self, event):
        """
        Notify that messages were read.
        """
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'reader_id': event['reader_id']
        }))

    async def typing_status(self, event):
        """
        Notify about typing status.
        """
        await self.send(text_data=json.dumps({
            'type': 'typing_status',
            'user_id': event['user_id'],
            'is_typing': event['is_typing']
        }))

    async def user_status(self, event):
        """
        Broadcast user online/offline status.
        """
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'user_id': event['user_id'],
            'status': event['status']
        }))
    
    @database_sync_to_async
    def update_user_status(self, is_online):
        """
        Update user's online status in database.
        """
        profile, created = UserProfile.objects.get_or_create(user=self.user)
        profile.is_online = is_online
        profile.last_activity = timezone.now()
        profile.save()
        return profile

    @database_sync_to_async
    def save_message(self, receiver_id, content):
        """
        Save message to database.
        """
        receiver = User.objects.get(id=receiver_id)
        message = Message.objects.create(
            sender=self.user,
            receiver=receiver,
            content=content
        )
        return message

    @database_sync_to_async
    def mark_messages_as_read(self, sender_id):
        """
        Mark messages from sender as read.
        """
        sender = User.objects.get(id=sender_id)
        Message.objects.filter(
            sender=sender,
            receiver=self.user,
            is_read=False
        ).update(is_read=True)
