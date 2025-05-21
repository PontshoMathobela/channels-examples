// Global WebSocket connection
let chatSocket;
// Current selected user for chatting
let selectedUser = null;
// Current user's ID and username
let currentUserId;
let currentUsername;
// Typing timer
let typingTimer;
// Status toast instance
let statusToast;

/**
 * Initialize the chat application
 * @param {number} userId - The current user's ID
 * @param {string} username - The current user's username
 */
function initChat(userId, username) {
    currentUserId = userId;
    currentUsername = username;
    
    // Connect to WebSocket
    connectWebSocket();
    
    // Initialize event listeners
    initEventListeners();
    
    // Initialize Bootstrap toast
    statusToast = new bootstrap.Toast(document.getElementById('statusToast'));
    
    // Set up search functionality
    setupSearch();
}

/**
 * Connect to the WebSocket server
 */
function connectWebSocket() {
    // Close any existing socket
    if (chatSocket) {
        chatSocket.close();
    }
    
    // Create a new WebSocket connection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/chat/`;
    
    chatSocket = new WebSocket(wsUrl);
    
    // Connection opened
    chatSocket.onopen = function(e) {
        console.log("WebSocket connection established");
        
        // For reconnection cases, reload the user list
        updateUserList();
        
        // If there was a selected user, reopen that conversation
        if (selectedUser) {
            loadUserMessages(selectedUser.id);
        }
    };
    
    // Listen for messages
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        handleWebSocketMessage(data);
    };
    
    // Connection closed
    chatSocket.onclose = function(e) {
        console.log("WebSocket connection closed");
        
        // Attempt to reconnect after 3 seconds
        setTimeout(function() {
            connectWebSocket();
        }, 3000);
    };
    
    // Connection error
    chatSocket.onerror = function(e) {
        console.error("WebSocket error:", e);
    };
}

/**
 * Handle incoming WebSocket messages
 * @param {object} data - The message data
 */
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'chat_message':
            handleChatMessage(data);
            break;
        case 'message_sent':
            handleMessageSent(data);
            break;
        case 'messages_read':
            handleMessagesRead(data);
            break;
        case 'typing_status':
            handleTypingStatus(data);
            break;
        case 'user_status':
            handleUserStatus(data);
            break;
        default:
            console.log("Unknown message type:", data.type);
    }
}

/**
 * Handle incoming chat messages
 * @param {object} data - The message data
 */
function handleChatMessage(data) {
    // If this message is from the currently selected user, add it to the chat
    if (selectedUser && data.sender_id === selectedUser.id) {
        appendMessage({
            id: data.message_id,
            content: data.message,
            timestamp: data.timestamp,
            is_sent_by_me: false
        });
        
        // Mark the message as read
        sendReadReceipt(data.sender_id);
    }
    
    // Update the user list to show unread count
    updateUserList();
    
    // Play notification sound if the message is not from the selected user
    if (!selectedUser || data.sender_id !== selectedUser.id) {
        playNotificationSound();
    }
}

/**
 * Handle confirmation of sent messages
 * @param {object} data - The message data
 */
function handleMessageSent(data) {
    // If this message is for the currently selected user
    if (selectedUser && data.receiver_id === selectedUser.id) {
        // Find the temporary message and update it with the confirmed one
        const tempMessage = document.querySelector(`.message[data-temp-id="${data.message_id}"]`);
        if (tempMessage) {
            tempMessage.setAttribute('data-message-id', data.message_id);
            tempMessage.removeAttribute('data-temp-id');
            
            // Update timestamp
            const timestampElement = tempMessage.querySelector('.message-timestamp');
            if (timestampElement) {
                const date = new Date(data.timestamp);
                timestampElement.textContent = formatTime(date);
            }
        } else {
            // If temp message not found, just append the confirmed message
            appendMessage({
                id: data.message_id,
                content: data.message,
                timestamp: data.timestamp,
                is_sent_by_me: true
            });
        }
    }
    
    // Update the user list to show the latest message
    updateUserList();
}

/**
 * Handle messages read notifications
 * @param {object} data - The notification data
 */
function handleMessagesRead(data) {
    // Mark messages as read in UI
    if (selectedUser && data.reader_id === selectedUser.id) {
        const sentMessages = document.querySelectorAll('.message.sent:not(.read)');
        sentMessages.forEach(message => {
            message.classList.add('read');
            
            // Add read indicator
            const readIndicator = document.createElement('div');
            readIndicator.className = 'read-indicator';
            readIndicator.innerHTML = '<i class="fas fa-check-double"></i>';
            message.appendChild(readIndicator);
        });
    }
}

/**
 * Handle typing status notifications
 * @param {object} data - The typing status data
 */
function handleTypingStatus(data) {
    // If this typing status is from the currently selected user
    if (selectedUser && data.user_id === selectedUser.id) {
        const typingIndicator = document.getElementById('typingIndicator');
        const typingText = typingIndicator.querySelector('.typing-text');
        
        if (data.is_typing) {
            typingText.textContent = `${selectedUser.username} is typing...`;
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    }
}

/**
 * Handle user online/offline status changes
 * @param {object} data - The status data
 */
function handleUserStatus(data) {
    // Update status indicators in the user list
    const userItem = document.querySelector(`.user-item[data-user-id="${data.user_id}"]`);
    if (userItem) {
        const statusIndicator = userItem.querySelector('.status-indicator');
        if (statusIndicator) {
            if (data.status === 'online') {
                statusIndicator.classList.add('online');
                statusIndicator.classList.remove('offline');
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.classList.add('offline');
            }
        }
    }
    
    // Update status in chat header if this is the selected user
    if (selectedUser && data.user_id === selectedUser.id) {
        const chatStatusIndicator = document.getElementById('chatStatusIndicator');
        const chatStatus = document.getElementById('chatStatus');
        
        if (data.status === 'online') {
            chatStatusIndicator.classList.add('online');
            chatStatusIndicator.classList.remove('offline');
            chatStatus.textContent = 'Online';
        } else {
            chatStatusIndicator.classList.remove('online');
            chatStatusIndicator.classList.add('offline');
            chatStatus.textContent = 'Offline';
        }
    }
    
    // Show status toast notification
    if (data.user_id !== currentUserId) {
        // Get the username
        let username = "A user";
        if (userItem) {
            username = userItem.getAttribute('data-username');
        } else if (selectedUser && data.user_id === selectedUser.id) {
            username = selectedUser.username;
        }
        
        const statusToastBody = document.getElementById('statusToastBody');
        statusToastBody.textContent = `${username} is now ${data.status}.`;
        statusToast.show();
    }
}

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // User selection from the sidebar
    document.querySelectorAll('.user-item').forEach(item => {
        item.addEventListener('click', function() {
            const userId = parseInt(this.dataset.userId);
            const username = this.dataset.username;
            selectUser(userId, username);
        });
    });
    
    // Send message when button is clicked
    document.getElementById('sendMessage').addEventListener('click', sendMessage);
    
    // Send message when Enter key is pressed (without shift)
    document.getElementById('messageInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Enable/disable send button based on input
    document.getElementById('messageInput').addEventListener('input', function() {
        document.getElementById('sendMessage').disabled = this.value.trim() === '';
        
        // Send typing indicator
        if (selectedUser) {
            sendTypingStatus(true);
            
            // Clear existing timer
            clearTimeout(typingTimer);
            
            // Set new timer to stop typing indicator after 2 seconds of inactivity
            typingTimer = setTimeout(function() {
                sendTypingStatus(false);
            }, 2000);
        }
    });
    
    // Window beforeunload event to close WebSocket properly
    window.addEventListener('beforeunload', function() {
        if (chatSocket) {
            chatSocket.close();
        }
    });
}

/**
 * Setup the user search functionality
 */
function setupSearch() {
    const searchInput = document.getElementById('userSearch');
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const userItems = document.querySelectorAll('.user-item');
        
        userItems.forEach(item => {
            const username = item.dataset.username.toLowerCase();
            if (username.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

/**
 * Select a user to chat with
 * @param {number} userId - The user ID
 * @param {string} username - The username
 */
function selectUser(userId, username) {
    // Update selected user
    selectedUser = { id: userId, username: username };
    
    // Update active user in sidebar
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    const selectedItem = document.querySelector(`.user-item[data-user-id="${userId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
        selectedItem.classList.remove('has-unread');
    }
    
    // Show chat header and input container
    document.getElementById('emptyChatPlaceholder').style.display = 'none';
    document.getElementById('chatHeader').style.display = 'block';
    document.getElementById('messagesContainer').style.display = 'block';
    document.getElementById('messageInputContainer').style.display = 'block';
    
    // Update chat header
    document.getElementById('chatUsername').textContent = username;
    document.getElementById('chatAvatarPlaceholder').textContent = username.charAt(0).toUpperCase();
    
    // Load chat messages
    loadUserMessages(userId);
}

/**
 * Load messages for the selected user
 * @param {number} userId - The user ID
 */
function loadUserMessages(userId) {
    fetch(`/get_messages/${userId}/`)
        .then(response => response.json())
        .then(data => {
            // Clear existing messages
            document.getElementById('messages').innerHTML = '';
            
            // Update user online status in chat header
            const chatStatusIndicator = document.getElementById('chatStatusIndicator');
            const chatStatus = document.getElementById('chatStatus');
            
            if (data.user.is_online) {
                chatStatusIndicator.classList.add('online');
                chatStatusIndicator.classList.remove('offline');
                chatStatus.textContent = 'Online';
            } else {
                chatStatusIndicator.classList.remove('online');
                chatStatusIndicator.classList.add('offline');
                chatStatus.textContent = 'Offline';
            }
            
            // Add messages to the chat
            if (data.messages.length === 0) {
                // Show empty state
                const emptyState = document.createElement('div');
                emptyState.className = 'text-center p-4 text-muted';
                emptyState.innerHTML = `
                    <i class="fas fa-comment-dots fa-3x mb-3"></i>
                    <h5>No messages yet</h5>
                    <p>Start the conversation with ${selectedUser.username}</p>
                `;
                document.getElementById('messages').appendChild(emptyState);
            } else {
                // Display messages
                data.messages.forEach(message => {
                    appendMessage(message);
                });
            }
            
            // Send read receipt for unread messages
            sendReadReceipt(userId);
            
            // Focus on the message input
            document.getElementById('messageInput').focus();

        })
        .catch(error => {
            console.error('Error loading messages:', error);
        });
}

/**
 * Send a message to the selected user
 */
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageContent = messageInput.value.trim();
    
    if (messageContent === '' || !selectedUser) {
        return;
    }
    
    // Generate a temporary ID for the message
    const tempId = Date.now();
    
    // Add message to the UI immediately
    appendMessage({
        id: tempId,
        content: messageContent,
        timestamp: new Date().toISOString(),
        is_sent_by_me: true,
        is_temp: true
    });
    
    // Send the message through WebSocket
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            type: 'chat_message',
            message: messageContent,
            receiver_id: selectedUser.id
        }));
    } else {
        console.error('WebSocket is not connected');
        // Show error message in the UI
        showErrorMessage('Connection lost. Reconnecting...');
        // Try to reconnect
        connectWebSocket();
    }
    
    // Clear the input
    messageInput.value = '';
    messageInput.focus();
    
    // Disable send button
    document.getElementById('sendMessage').disabled = true;
    
    // Stop typing indicator
    sendTypingStatus(false);
}

/**
 * Send read receipt for messages
 * @param {number} senderId - The sender's user ID
 */
function sendReadReceipt(senderId) {
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            type: 'read_messages',
            sender_id: senderId
        }));
    }
}

/**
 * Send typing status
 * @param {boolean} isTyping - Whether the user is typing
 */
function sendTypingStatus(isTyping) {
    if (selectedUser && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            type: 'typing_status',
            receiver_id: selectedUser.id,
            is_typing: isTyping
        }));
    }
}

/**
 * Append a message to the chat
 * @param {object} message - The message object
 */
function appendMessage(message) {
    const messagesContainer = document.getElementById('messages');
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.is_sent_by_me ? 'sent' : 'received'}`;
    
    // Set data attributes
    if (message.is_temp) {
        messageElement.setAttribute('data-temp-id', message.id);
    } else {
        messageElement.setAttribute('data-message-id', message.id);
    }
    
    // Format the message timestamp
    const date = new Date(message.timestamp);
    const formattedTime = formatTime(date);
    
    // Build message content
    messageElement.innerHTML = `
        <div class="message-content">${formatMessageText(message.content)}</div>
        <div class="message-timestamp">${formattedTime}</div>
    `;
    
    // Add to the DOM
    messagesContainer.prepend(messageElement);
}

/**
 * Format message text (convert URLs to links, etc.)
 * @param {string} text - The raw message text
 * @returns {string} The formatted message text
 */
function formatMessageText(text) {
    // Replace URLs with clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const formattedText = text.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
    
    // Return HTML-escaped text (except for the a tags we just added)
    return formattedText;
}

/**
 * Format a timestamp
 * @param {Date} date - The date object
 * @returns {string} The formatted time
 */
function formatTime(date) {
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;
    
    if (isToday) {
        return time;
    } else if (isYesterday) {
        return `Yesterday ${time}`;
    } else {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month} ${time}`;
    }
}

/**
 * Update the user list
 */
function updateUserList() {
    fetch('/get_users/')
        .then(response => response.json())
        .then(data => {
            const userListContent = document.getElementById('userListContent');
            
            // Store the current scroll position
            const scrollTop = userListContent.scrollTop;
            
            // Update user items
            data.users.forEach(user => {
                let userItem = document.querySelector(`.user-item[data-user-id="${user.id}"]`);
                
                // Update or create user item
                if (userItem) {
                    // Update existing user item
                    const statusIndicator = userItem.querySelector('.status-indicator');
                    if (statusIndicator) {
                        if (user.is_online) {
                            statusIndicator.classList.add('online');
                            statusIndicator.classList.remove('offline');
                        } else {
                            statusIndicator.classList.remove('online');
                            statusIndicator.classList.add('offline');
                        }
                    }
                    
                    // Update unread count
                    let unreadCountElement = userItem.querySelector('.unread-count');
                    if (user.unread_count > 0) {
                        if (unreadCountElement) {
                            unreadCountElement.textContent = user.unread_count;
                        } else {
                            // Create unread count element
                            unreadCountElement = document.createElement('div');
                            unreadCountElement.className = 'unread-count';
                            unreadCountElement.textContent = user.unread_count;
                            userItem.querySelector('.user-meta').appendChild(unreadCountElement);
                        }
                        
                        // Add has-unread class if not the selected user
                        if (!selectedUser || user.id !== selectedUser.id) {
                            userItem.classList.add('has-unread');
                        }
                    } else {
                        // Remove unread count element
                        if (unreadCountElement) {
                            unreadCountElement.remove();
                        }
                        
                        // Remove has-unread class
                        userItem.classList.remove('has-unread');
                    }
                } else {
                    // Create new user item
                    userItem = document.createElement('div');
                    userItem.className = 'user-item';
                    userItem.setAttribute('data-user-id', user.id);
                    userItem.setAttribute('data-username', user.username);
                    
                    userItem.innerHTML = `
                        <div class="user-avatar">
                            <div class="avatar-placeholder">${user.username.charAt(0).toUpperCase()}</div>
                            <span class="status-indicator ${user.is_online ? 'online' : 'offline'}"></span>
                        </div>
                        <div class="user-info">
                            <div class="user-name">${user.username}</div>
                            <div class="last-message">Start a conversation</div>
                        </div>
                        <div class="user-meta">
                            ${user.unread_count > 0 ? `<div class="unread-count">${user.unread_count}</div>` : ''}
                        </div>
                    `;
                    
                    // Add click event listener
                    userItem.addEventListener('click', function() {
                        const userId = parseInt(this.dataset.userId);
                        const username = this.dataset.username;
                        selectUser(userId, username);
                    });
                    
                    userListContent.appendChild(userItem);
                }
            });
            
            // Restore scroll position
            userListContent.scrollTop = scrollTop;
        })
        .catch(error => {
            console.error('Error updating user list:', error);
        });
}

/**
 * Show an error message in the chat
 * @param {string} message - The error message
 */
function showErrorMessage(message) {
    const messagesContainer = document.getElementById('messages');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    messagesContainer.prepend(errorElement);
}

/**
 * Play a notification sound
 */
function playNotificationSound() {
    // Create a simple beep sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Could not play notification sound', e);
    }
}
