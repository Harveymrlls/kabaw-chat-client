let socket = null;
let isConnected = false;
let lastSentMessage = null;
let lastSentTime = null;

const chatBox = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const statusElement = document.getElementById("status");
const statusText = document.getElementById("statusText");

function connectWebSocket() {
    try {
    socket = new WebSocket("ws://localhost:8080/ws");
    updateStatus("connecting", "Connecting...");
    
    socket.onopen = () => {
        isConnected = true;
        updateStatus("connected", "Connected to server");
        addSystemMessage("✅ Connected to WebSocket server");
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    };
    
    socket.onmessage = (event) => {
        try {
        const data = JSON.parse(event.data);
        
        if (data.type === "message") {
            const username = data.user || data.username || "Anonymous";
            const content = data.content;
            const timestamp = data.timestamp;
            
            // Check if this is likely own message being echoed back
            const isOurMessage = lastSentMessage && 
                                content === lastSentMessage && 
                                Date.now() - lastSentTime < 1000; 
            
            if (isOurMessage) {
            // This is own message echo - ignore it
            console.log("Ignoring echo of our own message:", content);
            lastSentMessage = null; 
            return;
            }
            
            // Regular message from server
            addChatMessage(username, content, timestamp, false);
        } else {
            addSystemMessage(`📨 ${data.content || JSON.stringify(data)}`);
        }
        } catch (error) {
        addSystemMessage(`📨 ${event.data}`);
        }
    };
    
    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        updateStatus("disconnected", "Connection error");
        addSystemMessage("❌ WebSocket error occurred");
    };
    
    socket.onclose = (event) => {
        isConnected = false;
        updateStatus("disconnected", "Disconnected");
        addSystemMessage("🔌 Connection closed");
        messageInput.disabled = true;
        sendButton.disabled = true;
        
        setTimeout(() => {
        if (!isConnected) {
            addSystemMessage("🔄 Attempting to reconnect...");
            connectWebSocket();
        }
        }, 3000);
    };
    
    } catch (error) {
    console.error("Failed to create WebSocket:", error);
    updateStatus("disconnected", "Connection failed");
    addSystemMessage("❌ Failed to connect. Make sure server is running at ws://localhost:8080/ws");
    }
}

function sendMessage() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
    addSystemMessage("❌ Not connected to server");
    return;
    }
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    try {
    // Store the message we're about to send
    lastSentMessage = message;
    lastSentTime = Date.now();
    
    // Show message immediately (as "You")
    addChatMessage("You", message, new Date().toISOString(), true);
    
    const messageObj = {
        type: "message",
        content: message,
        timestamp: new Date().toISOString()
    };
    
    socket.send(JSON.stringify(messageObj));
    messageInput.value = "";
    messageInput.focus();
    
    } catch (error) {
    console.error("Failed to send message:", error);
    addSystemMessage("❌ Failed to send message");
    }
}

function addChatMessage(username, content, timestamp, isYou = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isYou ? 'you' : 'other'}`;
    
    let timeStr = "Just now";
    if (timestamp) {
    try {
        const date = new Date(timestamp);
        timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    }
    
    if (isYou) {
    messageDiv.innerHTML = `
        <div class="content"><strong>You:</strong> ${escapeHtml(content)}</div>
        <div class="time">${timeStr}</div>
    `;
    } else {
    messageDiv.innerHTML = `
        <div>
        <span class="username">${escapeHtml(username)}:</span>
        <span class="time">${timeStr}</span>
        </div>
        <div class="content">${escapeHtml(content)}</div>
    `;
    }
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addSystemMessage(content) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message system";
    messageDiv.textContent = content;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function updateStatus(status, text) {
    statusElement.className = `status ${status}`;
    statusText.textContent = text;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Allow sending with Enter key
messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && isConnected) {
    sendMessage();
    }
});

// Initialize connection
connectWebSocket();

// Add welcome message
window.addEventListener("DOMContentLoaded", () => {
    addSystemMessage("Welcome! Connecting to WebSocket server...");
    addSystemMessage("Make sure kabaw-sockets is running at ws://localhost:8080/ws");
});