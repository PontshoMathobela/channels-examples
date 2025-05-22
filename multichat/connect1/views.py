from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db.models import Count, Q, Max
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST
from .forms import CustomUserCreationForm, CustomAuthenticationForm
from .models import Message, UserProfile
import json
from connect.models import Message, UserProfile


def home(request):
    return HttpResponse("Welcome to MultiChat!")


@login_required
def index(request):
    """
    Main chat page view.
    """
    # Get all users except the current user, with their online status
    users = User.objects.exclude(id=request.user.id).annotate(
        unread_count=Count(
            'sent_messages',
            filter=Q(sent_messages__receiver=request.user, sent_messages__is_read=False)
        )
    ).select_related('profile')
    
    # Get the last message for each conversation
    conversations = []
    for user in users:
        last_message = Message.objects.filter(
            Q(sender=request.user, receiver=user) | Q(sender=user, receiver=request.user)
        ).order_by('-timestamp').first()
        
        if last_message:
            conversations.append({
                'user': user,
                'last_message': last_message,
                'unread_count': user.unread_count,
            })
    
    # Sort conversations with most recent message first
    conversations.sort(key=lambda x: x['last_message'].timestamp, reverse=True)
    
    return render(request, 'chat/index.html', {
        'conversations': conversations,
        'users': users,
    })


def login_view(request):
    """
    Login view.
    """
    if request.user.is_authenticated:
        return redirect('index')
    
    if request.method == 'POST':
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                # Update user's online status
                profile, created = UserProfile.objects.get_or_create(user=user)
                profile.is_online = True
                profile.save()
                return redirect('index')
    else:
        form = CustomAuthenticationForm()
    
    return render(request, 'chat/login.html', {'form': form})


def register_view(request):
    """
    User registration view.
    """
    if request.user.is_authenticated:
        return redirect('index')
    
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            # Create a profile for the new user if it doesn't exist already
            UserProfile.objects.get_or_create(user=user)
            # Log the user in
            login(request, user)
            return redirect('index')
    else:
        form = CustomUserCreationForm()
    
    return render(request, 'chat/register.html', {'form': form})


@login_required
def get_messages(request, user_id):
    """
    API endpoint to get message history with a specific user.
    """
    try:
        other_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    
    # Get messages between current user and the other user
    messages = Message.objects.filter(
        (Q(sender=request.user) & Q(receiver=other_user)) |
        (Q(sender=other_user) & Q(receiver=request.user))
    ).order_by('timestamp')
    
    # Mark messages from other user as read
    Message.objects.filter(sender=other_user, receiver=request.user, is_read=False).update(is_read=True)
    
    # Format messages for JSON response
    message_list = []
    for msg in messages:
        message_list.append({
            'id': msg.id,
            'content': msg.content,
            'timestamp': msg.timestamp.isoformat(),
            'formatted_timestamp': msg.formatted_timestamp,
            'is_read': msg.is_read,
            'is_sent_by_me': msg.sender.id == request.user.id,
        })
    
    return JsonResponse({
        'messages': message_list,
        'user': {
            'id': other_user.id,
            'username': other_user.username,
            'is_online': getattr(getattr(other_user, 'profile', None), 'is_online', False),
        }
    })


@login_required
def get_users(request):
    """
    API endpoint to get user list with status and unread message counts.
    """
    users = User.objects.exclude(id=request.user.id).annotate(
        unread_count=Count(
            'sent_messages',
            filter=Q(sent_messages__receiver=request.user, sent_messages__is_read=False)
        )
    ).values('id', 'username', 'unread_count')
    
    # Add online status to each user
    for user in users:
        try:
            profile = UserProfile.objects.get(user_id=user['id'])
            user['is_online'] = profile.is_online
        except UserProfile.DoesNotExist:
            user['is_online'] = False
    
    return JsonResponse({'users': list(users)})
