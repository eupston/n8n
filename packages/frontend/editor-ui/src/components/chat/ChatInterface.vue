<template>
  <div class="chat-interface">
    <div class="chat-messages">
      <!-- Messages will go here -->
    </div>
    <div class="chat-input">
      <input type="text" v-model="newMessage" @keyup.enter="sendMessage" placeholder="Type your message..." />
      <button @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'ChatInterface',
  setup() {
    const newMessage = ref('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = ref<any[]>([]); // Placeholder for messages

    const sendMessage = () => {
      if (newMessage.value.trim() === '') return;

      // For now, just log the message and clear the input
      // Later, this will interact with a backend service
      console.log('Sending message:', newMessage.value);
      messages.value.push({ text: newMessage.value, sender: 'user' });
      newMessage.value = '';
    };

    return {
      newMessage,
      messages,
      sendMessage,
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