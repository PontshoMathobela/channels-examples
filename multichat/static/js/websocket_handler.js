// static/js/websocket_handler.js
const socket = new ReconnectingWebSocket(
    'ws://' + window.location.host + '/ws/your_endpoint/',
    null,
    { debug: true, reconnectInterval: 3000 }
);

socket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    console.log("WebSocket message:", data);
    
    // Show global notifications
    if (data.type === 'notification') {
        alert(`New notification: ${data.message}`);
    }
};
const socket = new ReconnectingWebSocket(
    'ws://' + window.location.host + '/ws/chat/?token=' + getCookie('csrftoken'),
);

const socket = new ReconnectingWebSocket(
    `ws://${window.location.host}/ws/chat/`,
    null,
    { debug: true }
);

socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    switch(data.type) {
        case 'chat_message':
            displayMessage(data);
            break;
        case 'user_status':
            updateOnlineStatus(data.user_id, data.status);
            break;
        case 'typing_status':
            showTypingIndicator(data.user_id, data.is_typing);
            break;
    }
};

// Send typing notification
inputField.addEventListener('input', () => {
    socket.send(JSON.stringify({
        type: 'typing_status',
        receiver_id: recipientId,
        is_typing: true
    }));
});