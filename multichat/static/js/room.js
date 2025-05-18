// Global variables
let chatSocket;
let currentUser = {};
let chatUser = {};
let typingTimer;
let statusToast;
let messageQueue = [];
let reconnectAttempts = 0;
let reconnectInterval = null;

/**
 * Initialize the chat room
 * @param {Object} config - Configuration object
 */
function initChatRoom(config) {
    // Store user information
    currentUser = {
        id: config.currentUserId,
        username: config.currentUsername
    };
    
    chatUser = {
        id: config.chatUserId,
        username: config.chatUsername,
        isOnline: config.isOnline
    };
    
    // Initialize UI components
    initUIComponents();
    
    // Connect to WebSocket
    connectWebSocket();
    
    // Initialize event listeners
    initEventListeners();
    
    // Mark messages as read (if any)
    markMessagesAsRead();
    
    // Scroll to the latest message
    scrollToLatestMessage();
}

/**
 * Initialize UI components
 */
function initUIComponents() {
    // Initialize Bootstrap tooltip for buttons
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize status toast
    statusToast = new bootstrap.Toast(document.getElementById('statusToast'));
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
        
        // Reset reconnect attempts
        reconnectAttempts = 0;
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
        
        // Send any queued messages
        if (messageQueue.length > 0) {
            messageQueue.forEach(message => {
                chatSocket.send(JSON.stringify(message));
            });
            messageQueue = [];
        }
        
        // Mark messages as read
        markMessagesAsRead();
    };
    
    // Listen for messages
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        handleWebSocketMessage(data);
    };
    
    // Connection closed
    chatSocket.onclose = function(e) {
        console.log("WebSocket connection closed");
        
        // Attempt to reconnect with exponential backoff
        reconnectAttempts += 1;
        const backoffTime = Math.min(30, Math.pow(2, reconnectAttempts)) * 1000;
        
        // Display disconnected status
        updateConnectionStatus('disconnected');
        
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                connectWebSocket();
            }, backoffTime);
        }
    };
    
    // Connection error
    chatSocket.onerror = function(e) {
        console.error("WebSocket error:", e);
        updateConnectionStatus('error');
    };
}

/**
 * Update connection status in the UI
 * @param {string} status - The connection status
 */
function updateConnectionStatus(status) {
    const connectionStatusElement = document.createElement('div');
    connectionStatusElement.className = 'connection-status';
    
    switch (status) {
        case 'disconnected':
            connectionStatusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Disconnected. Reconnecting...';
            connectionStatusElement.classList.add('disconnected');
            break;
        case 'reconnected':
            connectionStatusElement.innerHTML = '<i class="fas fa-check-circle"></i> Reconnected!';
            connectionStatusElement.classList.add('reconnected');
            
            // Remove the status after 3 seconds
            setTimeout(() => {
                const existingStatus = document.querySelector('.connection-status.reconnected');
                if (existingStatus) {
                    existingStatus.remove();
                }
            }, 3000);
            break;
        case 'error':
            connectionStatusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Connection error. Retrying...';
            connectionStatusElement.classList.add('error');
            break;
    }
    
    // Remove any existing disconnected or error status
    const existingStatus = document.querySelector('.connection-status.disconnected, .connection-status.error');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    // Add to the top of the messages container
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.prepend(connectionStatusElement);
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Send message button
    const sendButton = document.getElementById('sendButton');
    sendButton.addEventListener('click', sendMessage);
    
    // Message input
    const messageInput = document.getElementById('messageInput');
    
    // Enable/disable send button based on input content
    messageInput.addEventListener('input', function() {
        sendButton.disabled = this.value.trim() === '';
        
        // Send typing status
        sendTypingStatus(true);
        
        // Clear existing typing timer
        clearTimeout(typingTimer);
        
        // Set new timer to stop typing indicator after 2 seconds of inactivity
        typingTimer = setTimeout(() => {
            sendTypingStatus(false);
        }, 2000);
    });
    
    // Send message on Enter (not Shift+Enter)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Format buttons
    document.getElementById('boldButton').addEventListener('click', function() {
        formatText('**', '**', 'bold text');
    });
    
    document.getElementById('italicButton').addEventListener('click', function() {
        formatText('_', '_', 'italic text');
    });
    
    document.getElementById('linkButton').addEventListener('click', function() {
        const url = prompt('Enter the URL:');
        if (url) {
            insertTextAtCursor(url);
        }
    });
    
    // Emoji button
    document.getElementById('emojiButton').addEventListener('click', function() {
        // Simple emoji insertion - in a real app, you'd use an emoji picker library
        const emojis = ['😊', '👍', '❤️', '😂', '🙌', '🎉', '🔥', '💯'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        insertTextAtCursor(randomEmoji);
    });
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', function() {
        // Reload the current page
        window.location.reload();
    });
}

/**
 * Handle incoming WebSocket messages
 * @param {Object} data - The message data
 */
function handleWebSocketMessage(data) {
    console.log("Received message:", data);
    
    switch (data.type) {
        case 'chat_message':
            // Only handle messages from the chat user
            if (data.sender_id === chatUser.id) {
                handleNewMessage(data);
                markMessagesAsRead();
            }
            break;
            
        case 'message_sent':
            // Confirm that our message was sent
            updateTempMessage(data);
            break;
            
        case 'messages_read':
            // The other user has read our messages
            if (data.reader_id === chatUser.id) {
                markMessagesAsReadInUI();
            }
            break;
            
        case 'typing_status':
            // Show typing indicator when the chat user is typing
            if (data.user_id === chatUser.id) {
                toggleTypingIndicator(data.is_typing);
            }
            break;
            
        case 'user_status':
            // Update user status when it changes
            if (data.user_id === chatUser.id) {
                updateUserStatus(data.status === 'online');
            }
            break;
    }
}

/**
 * Handle a new chat message
 * @param {Object} data - The message data
 */
function handleNewMessage(data) {
    const messagesContainer = document.getElementById('messagesContainer');
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'message received';
    messageElement.setAttribute('data-message-id', data.message_id);
    
    // Format message timestamp
    const timestamp = new Date(data.timestamp);
    const formattedTimestamp = formatTimestamp(timestamp);
    
    // Set message content
    messageElement.innerHTML = `
        <div class="message-content">${formatMessageContent(data.message)}</div>
        <div class="message-timestamp">${formattedTimestamp}</div>
    `;
    
    // Add to the DOM
    messagesContainer.prepend(messageElement);
    
    // Remove "no messages" placeholder if it exists
    const noMessages = document.querySelector('.no-messages');
    if (noMessages) {
        noMessages.remove();
    }
    
    // Play notification sound
    playNotificationSound();
}

/**
 * Update a temporary message with the confirmed data
 * @param {Object} data - The message data
 */
function updateTempMessage(data) {
    const tempMessage = document.querySelector(`.message[data-temp-id="${data.message_id}"]`);
    
    if (tempMessage) {
        // Update the message with confirmed ID
        tempMessage.setAttribute('data-message-id', data.message_id);
        tempMessage.removeAttribute('data-temp-id');
        
        // Update timestamp with server timestamp
        const timestampElement = tempMessage.querySelector('.message-timestamp');
        if (timestampElement) {
            const timestamp = new Date(data.timestamp);
            timestampElement.textContent = formatTimestamp(timestamp);
        }
    }
}

/**
 * Toggle the typing indicator
 * @param {boolean} isTyping - Whether the user is typing
 */
function toggleTypingIndicator(isTyping) {
    const typingIndicator = document.getElementById('typingIndicator');
    
    if (isTyping) {
        typingIndicator.style.display = 'block';
    } else {
        typingIndicator.style.display = 'none';
    }
}

/**
 * Update the user's online status
 * @param {boolean} isOnline - Whether the user is online
 */
function updateUserStatus(isOnline) {
    const statusIndicator = document.getElementById('statusIndicator');
    const userStatusText = document.getElementById('userStatus');
    
    if (isOnline) {
        statusIndicator.classList.add('online');
        statusIndicator.classList.remove('offline');
        userStatusText.textContent = 'Online';
    } else {
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
        userStatusText.textContent = 'Offline';
    }
    
    // Show toast notification
    const statusToastBody = document.getElementById('statusToastBody');
    statusToastBody.textContent = `${chatUser.username} is now ${isOnline ? 'online' : 'offline'}.`;
    statusToast.show();
    
    // Update local state
    chatUser.isOnline = isOnline;
}

/**
 * Mark all messages from the chat user as read
 */
function markMessagesAsRead() {
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            type: 'read_messages',
            sender_id: chatUser.id
        }));
    } else {
        // Queue the read receipt for when connection is restored
        messageQueue.push({
            type: 'read_messages',
            sender_id: chatUser.id
        });
    }
}

/**
 * Mark messages as read in the UI
 */
function markMessagesAsReadInUI() {
    const sentMessages = document.querySelectorAll('.message.sent:not(.read)');
    
    sentMessages.forEach(message => {
        message.classList.add('read');
        
        // Add read indicator if not already present
        if (!message.querySelector('.read-indicator')) {
            const readIndicator = document.createElement('div');
            readIndicator.className = 'read-indicator';
            readIndicator.innerHTML = '<i class="fas fa-check-double"></i>';
            message.appendChild(readIndicator);
        }
    });
}

/**
 * Send a chat message
 */
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageContent = messageInput.value.trim();
    
    if (!messageContent) return;
    
    // Generate a temporary ID for the message
    const tempId = Date.now();
    
    // Add message to UI immediately
    addMessageToUI(messageContent, tempId);
    
    // Clear input
    messageInput.value = '';
    messageInput.focus();
    
    // Disable send button
    document.getElementById('sendButton').disabled = true;
    
    // Stop typing indicator
    sendTypingStatus(false);
    
    // Send message via WebSocket
    const messageData = {
        type: 'chat_message',
        message: messageContent,
        receiver_id: chatUser.id
    };
    
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify(messageData));
    } else {
        // Queue message for when connection is restored
        messageQueue.push(messageData);
        // Try to reconnect
        connectWebSocket();
    }
}

/**
 * Add a sent message to the UI
 * @param {string} content - The message content
 * @param {number} tempId - Temporary message ID
 */
function addMessageToUI(content, tempId) {
    const messagesContainer = document.getElementById('messagesContainer');
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'message sent';
    messageElement.setAttribute('data-temp-id', tempId);
    
    // Format the current time
    const now = new Date();
    const formattedTime = formatTimestamp(now);
    
    // Set message content
    messageElement.innerHTML = `
        <div class="message-content">${formatMessageContent(content)}</div>
        <div class="message-timestamp">${formattedTime}</div>
    `;
    
    // Add to the DOM
    messagesContainer.prepend(messageElement);
    
    // Remove "no messages" placeholder if it exists
    const noMessages = document.querySelector('.no-messages');
    if (noMessages) {
        noMessages.remove();
    }
}

/**
 * Send typing status
 * @param {boolean} isTyping - Whether the user is typing
 */
function sendTypingStatus(isTyping) {
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            type: 'typing_status',
            receiver_id: chatUser.id,
            is_typing: isTyping
        }));
    }
}

/**
 * Format timestamp for display
 * @param {Date} date - The date to format
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(date) {
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (isToday) {
        return `${hours}:${minutes}`;
    } else if (isYesterday) {
        return `Yesterday ${hours}:${minutes}`;
    } else {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month} ${hours}:${minutes}`;
    }
}

/**
 * Format message content (make links clickable, etc)
 * @param {string} content - The raw message content
 * @returns {string} Formatted message content
 */
function formatMessageContent(content) {
    let formatted = content
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Convert URLs to links
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
        // Convert **bold** to <strong>
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Convert _italic_ to <em>
        .replace(/_(.*?)_/g, '<em>$1</em>');
    
    return formatted;
}

/**
 * Insert text at the current cursor position in the input
 * @param {string} text - Text to insert
 */
function insertTextAtCursor(text) {
    const input = document.getElementById('messageInput');
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const before = input.value.substring(0, startPos);
    const after = input.value.substring(endPos, input.value.length);
    
    input.value = before + text + after;
    input.selectionStart = input.selectionEnd = startPos + text.length;
    input.focus();
    
    // Trigger input event to enable send button
    input.dispatchEvent(new Event('input'));
}

/**
 * Format selected text or insert placeholder
 * @param {string} prefix - Text to insert before selection
 * @param {string} suffix - Text to insert after selection
 * @param {string} placeholder - Placeholder if no text is selected
 */
function formatText(prefix, suffix, placeholder) {
    const input = document.getElementById('messageInput');
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const selectedText = input.value.substring(startPos, endPos);
    
    if (selectedText) {
        // Format selected text
        const before = input.value.substring(0, startPos);
        const after = input.value.substring(endPos, input.value.length);
        input.value = before + prefix + selectedText + suffix + after;
        input.selectionStart = startPos + prefix.length;
        input.selectionEnd = endPos + prefix.length;
    } else {
        // Insert placeholder
        insertTextAtCursor(prefix + placeholder + suffix);
        // Select the placeholder for easy replacement
        input.selectionStart = startPos + prefix.length;
        input.selectionEnd = startPos + prefix.length + placeholder.length;
    }
    
    input.focus();
}

/**
 * Scroll to the latest message
 */
function scrollToLatestMessage() {
    const messagesContainer = document.querySelector('.room-messages-container');
    messagesContainer.scrollTop = 0; // Scroll to top since messages are in reverse order
}

/**
 * Play notification sound
 */
function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.error('Could not play notification sound:', e);
    }
}
