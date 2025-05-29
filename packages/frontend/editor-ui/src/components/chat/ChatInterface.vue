<template>
  <div class="chat-interface">
    <div class="chat-messages" ref="chatMessagesContainer">
      <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.sender]">
        <p>{{ msg.text }}</p>
      </div>
    </div>
    <div class="chat-input">
      <input type="text" v-model="newMessage" @keyup.enter="sendMessage" placeholder="Type your message..." />
      <button @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, nextTick } from 'vue';
import { chatService } from '@/services/ChatService'; // Import the service

// Define an interface for the message structure
interface Message {
  text: string;
  sender: 'user' | 'system';
}

export default defineComponent({
  name: 'ChatInterface',
  setup() {
    const newMessage = ref('');
    const messages = ref<Message[]>([]); // Use the Message interface
    const chatMessagesContainer = ref<HTMLElement | null>(null); // For autoscrolling

    const scrollToBottom = () => {
      nextTick(() => {
        if (chatMessagesContainer.value) {
          chatMessagesContainer.value.scrollTop = chatMessagesContainer.value.scrollHeight;
        }
      });
    };

    const sendMessage = async () => {
      if (newMessage.value.trim() === '') return;

      const userMessage: Message = { text: newMessage.value, sender: 'user' };
      messages.value.push(userMessage);
      scrollToBottom();

      const systemResponse = await chatService.processMessage(newMessage.value);
      messages.value.push(systemResponse);
      scrollToBottom();

      newMessage.value = '';
    };

    return {
      newMessage,
      messages,
      sendMessage,
      chatMessagesContainer, // Expose for template ref
    };
  },
});
</script>

<style scoped>
.chat-interface {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 300px;
  height: 400px;
  border: 1px solid #ccc;
  background-color: white;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1000; /* Ensure it's on top */
}

.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px;
  border-bottom: 1px solid #ccc;
  display: flex;
  flex-direction: column;
}

.message {
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 15px;
  max-width: 70%;
  word-wrap: break-word;
}

.message.user {
  background-color: #007bff;
  color: white;
  align-self: flex-end;
  border-bottom-right-radius: 5px;
}

.message.system {
  background-color: #f0f0f0;
  color: #333;
  align-self: flex-start;
  border-bottom-left-radius: 5px;
}

.chat-input {
  display: flex;
  padding: 10px;
}

.chat-input input {
  flex-grow: 1;
  margin-right: 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.chat-input button {
  padding: 8px 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.chat-input button:hover {
  background-color: #0056b3;
}
</style>