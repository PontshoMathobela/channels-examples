$(document).ready(function() {
    // Chat application core functionality
    var ChatApp = {
        init: function() {
            this.cacheElements();
            this.bindEvents();
            this.connectWebSocket();
            this.setupUI();
        },
        
        cacheElements: function() {
            this.$chatWindow = $('#chat-log');
            this.$messageInput = $('#message-input');
            this.$sendButton = $('#send-button');
            this.$typingIndicator = $('#typing-indicator');
            this.$userList = $('#user-list');
            this.$chatContainer = $('#chat-container');
            this.$roomList = $('.rooms');
        },
        
        bindEvents: function() {
            this.$sendButton.on('click', $.proxy(this.sendMessage, this));
            this.$messageInput.on('keydown', $.proxy(this.handleKeyDown, this));
            this.$messageInput.on('input', $.proxy(this.handleTyping, this));
            this.$roomList.on('click', 'li', $.proxy(this.joinRoom, this));
        },
        
        connectWebSocket: function() {
            // Determine WebSocket protocol (ws:// or wss://)
            var wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
            this.socket = new WebSocket(
                wsScheme + '://' + window.location.host + '/ws/chat/'
            );
            
            this.socket.onmessage = $.proxy(this.handleMessage, this);
            this.socket.onclose = $.proxy(this.handleClose, this);
            this.socket.onerror = $.proxy(this.handleError, this);
        },
        
        setupUI: function() {
            // Auto-scroll to bottom of chat
            this.$chatWindow.scrollTop(this.$chatWindow[0].scrollHeight);
            
            // Focus input field
            this.$messageInput.focus();
            
            // Setup smooth scrolling for new messages
            this.$chatContainer.on('DOMNodeInserted', function() {
                $(this).scrollTop(this.scrollHeight);
            });
        },
        
        sendMessage: function() {
            var message = this.$messageInput.val().trim();
            if (message) {
                var msgData = {
                    'message': message,
                    'room': this.currentRoom || 'lobby'
                };
                
                this.socket.send(JSON.stringify(msgData));
                this.$messageInput.val('');
                this.stopTyping();
                
                // Add message to UI immediately (optimistic update)
                this.addMessageToUI({
                    username: 'You',
                    message: message,
                    timestamp: new Date().toISOString()
                });
            }
        },
        
        handleKeyDown: function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        },
        
        handleTyping: function() {
            if (!this.isTyping) {
                this.isTyping = true;
                this.socket.send(JSON.stringify({
                    'type': 'typing',
                    'typing': true,
                    'room': this.currentRoom || 'lobby'
                }));
            }
            
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout($.proxy(function() {
                this.isTyping = false;
                this.socket.send(JSON.stringify({
                    'type': 'typing',
                    'typing': false,
                    'room': this.currentRoom || 'lobby'
                }));
            }, this), 2000);
        },
        
        stopTyping: function() {
            this.isTyping = false;
            clearTimeout(this.typingTimeout);
            this.socket.send(JSON.stringify({
                'type': 'typing',
                'typing': false,
                'room': this.currentRoom || 'lobby'
            }));
        },
        
        handleMessage: function(e) {
            var data = JSON.parse(e.data);
            
            switch(data.type) {
                case 'chat_message':
                    this.addMessageToUI(data);
                    break;
                case 'user_join':
                    this.addSystemMessage(data.username + ' joined the room');
                    this.updateUserList(data.users);
                    break;
                case 'user_leave':
                    this.addSystemMessage(data.username + ' left the room');
                    this.updateUserList(data.users);
                    break;
                case 'typing':
                    this.showTypingIndicator(data);
                    break;
                case 'room_list':
                    this.updateRoomList(data.rooms);
                    break;
                case 'room_change':
                    this.handleRoomChange(data);
                    break;
                default:
                    console.log('Unknown message type:', data.type);
            }
        },
        
        addMessageToUI: function(data) {
            var isCurrentUser = data.username === 'You';
            var messageClass = isCurrentUser ? 'sent' : 'received';
            
            var $message = $('<div class="message">').addClass(messageClass);
            var $content = $('<div class="message-content">');
            
            if (!isCurrentUser) {
                $content.append($('<div class="username">').text(data.username));
            }
            
            $content.append($('<div class="message-text">').text(data.message));
            $content.append($('<div class="timestamp">').text(
                new Date(data.timestamp).toLocaleTimeString()
            ));
            
            $message.append($content);
            this.$chatWindow.append($message);
            
            // Scroll to bottom
            this.$chatWindow.scrollTop(this.$chatWindow[0].scrollHeight);
        },
        
        addSystemMessage: function(text) {
            var $message = $('<div class="contextual-message">').text(text);
            this.$chatWindow.append($message);
            this.$chatWindow.scrollTop(this.$chatWindow[0].scrollHeight);
        },
        
        showTypingIndicator: function(data) {
            if (data.username === 'You') return;
            
            if (data.typing) {
                this.$typingIndicator.find('.typing-user').text(data.username);
                this.$typingIndicator.fadeIn();
            } else {
                this.$typingIndicator.fadeOut();
            }
        },
        
        updateUserList: function(users) {
            this.$userList.empty();
            $.each(users, function(index, username) {
                this.$userList.append($('<li>').text(username));
            }.bind(this));
        },
        
        updateRoomList: function(rooms) {
            this.$roomList.empty();
            $.each(rooms, function(index, room) {
                var $room = $('<li>').text(room.name);
                if (room.joined) {
                    $room.addClass('joined');
                }
                this.$roomList.append($room);
            }.bind(this));
        },
        
        joinRoom: function(e) {
            var roomName = $(e.target).text().trim();
            if (roomName === this.currentRoom) return;
            
            this.socket.send(JSON.stringify({
                'type': 'join_room',
                'room': roomName
            }));
            
            this.currentRoom = roomName;
            this.$chatWindow.empty();
            this.addSystemMessage('You joined ' + roomName);
            
            // Update room list UI
            this.$roomList.find('li').removeClass('joined');
            $(e.target).addClass('joined');
        },
        
        handleRoomChange: function(data) {
            this.currentRoom = data.room;
            this.$chatWindow.empty();
            this.addSystemMessage('Welcome to ' + data.room);
            this.updateUserList(data.users);
        },
        
        handleClose: function(e) {
            console.error('Chat socket closed unexpectedly');
            this.addSystemMessage('Connection lost. Attempting to reconnect...');
            
            setTimeout($.proxy(function() {
                this.connectWebSocket();
            }, this), 5000);
        },
        
        handleError: function(e) {
            console.error('WebSocket error:', e);
            this.addSystemMessage('Connection error');
        }
    };
    
    // Initialize the chat application
    ChatApp.init();
    
    // Additional UI enhancements
    function enhanceUI() {
        // Make messages selectable but not draggable
        $('.messages').disableSelection().css('user-select', 'text');
        
        // Add hover effects to messages
        $('.messages').on('mouseenter', '.message', function() {
            $(this).addClass('hover');
        }).on('mouseleave', '.message', function() {
            $(this).removeClass('hover');
        });
        
        // Add click effect to buttons
        $('button').on('mousedown', function() {
            $(this).addClass('active');
        }).on('mouseup mouseleave', function() {
            $(this).removeClass('active');
        });
        
        // Responsive adjustments
        $(window).on('resize', function() {
            var windowWidth = $(window).width();
            if (windowWidth < 768) {
                $('.chat-container').addClass('mobile');
            } else {
                $('.chat-container').removeClass('mobile');
            }
        }).trigger('resize');
    }
    
    // Run UI enhancements
    enhanceUI();
});