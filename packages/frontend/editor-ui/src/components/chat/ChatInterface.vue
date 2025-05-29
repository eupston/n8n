<template>
  <NCard class="chat-interface" :bordered="true">
    <template #header>
      <span class="chat-header-title">AI Assistant</span>
    </template>
    <NScrollbar class="chat-messages" ref="chatMessagesContainer">
      <div v-for="(msg, index) in messages" :key="index" :class="['message-row', msg.sender === 'user' ? 'user-row' : 'system-row']">
        <NCard :class="['message', msg.sender]" :size="'small'" :bordered="false">
          <!-- Simple text display for now. For complex messages, use v-html or a markdown renderer -->
          <p>{{ msg.text }}</p>
        </NCard>
      </div>
    </NScrollbar>
    <template #footer>
      <div class="chat-input-area">
        <NInput
          type="text"
          v-model:value="newMessage"
          @keyup.enter="sendMessage"
          placeholder="Create a node... e.g., create node n8n-nodes-base.set with value1=100"
          clearable
          class="chat-input-field"
        />
        <NButton type="primary" @click="sendMessage" class="chat-send-button" :disabled="newMessage.trim() === ''">
          Send
        </NButton>
      </div>
    </template>
  </NCard>
</template>

<script lang="ts">
import { defineComponent, ref, nextTick, onMounted } from 'vue';
// Hypothetical imports from n8n design system. Replace with actual component imports.
// import { NButton, NInput, NCard, NScrollbar } from '@n8n/design-system'; 
import { chatService } from '@/services/ChatService';

// Define an interface for the message structure
interface Message {
  text: string;
  sender: 'user' | 'system';
}

export default defineComponent({
  name: 'ChatInterface',
  // components: { NButton, NInput, NCard, NScrollbar }, // Register components if imported locally
  setup() {
    const newMessage = ref('');
    const messages = ref<Message[]>([]);
    const chatMessagesContainer = ref<any>(null); // For NScrollbar instance, type might be specific

    const scrollToBottom = () => {
      nextTick(() => {
        if (chatMessagesContainer.value && chatMessagesContainer.value.scrollTo) {
          // NScrollbar might have a method like scrollTo({ top: ..., behavior: ... })
          // or a simple .scrollTop property on an internal element.
          // This is a common pattern; adjust to the actual API of NScrollbar.
          const scrollEl = chatMessagesContainer.value.scrollbarInstRef?.scrollElRef; // Example path
          if (scrollEl) {
            scrollEl.scrollTop = scrollEl.scrollHeight;
          } else {
            // Fallback for simpler scroll containers or if NScrollbar API is different
             chatMessagesContainer.value.scrollTo({ top: 999999, behavior: 'smooth' });
          }
        }
      });
    };

    const sendMessage = async () => {
      if (newMessage.value.trim() === '') return;
      const userMessageText = newMessage.value;
      messages.value.push({ text: userMessageText, sender: 'user' });
      newMessage.value = '';
      scrollToBottom();

      // Add a thinking message (optional)
      const thinkingMessage: Message = { text: 'Thinking...', sender: 'system' };
      messages.value.push(thinkingMessage);
      scrollToBottom();

      const systemResponse = await chatService.processMessage(userMessageText);
      
      // Remove thinking message and add actual response
      messages.value.pop(); // Remove 'Thinking...'
      messages.value.push(systemResponse);
      scrollToBottom();
    };

    onMounted(() => {
        messages.value.push({ text: "Hello! How can I help you build a workflow today? Try 'create node n8n-nodes-base.start'", sender: 'system' });
    });

    return {
      newMessage,
      messages,
      sendMessage,
      chatMessagesContainer,
    };
  },
});
</script>

<style scoped>
/* Using classes for broad structure, design system should handle most styling */
.chat-interface {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 380px; /* Slightly wider */
  height: 550px; /* Taller */
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px; /* Consistent with modern UIs */
  z-index: 1000;
  /* NCard might provide its own styles for border, background etc. */
}

.chat-header-title {
  font-weight: 600;
  font-size: 1.1em;
}

.chat-messages {
  flex-grow: 1;
  /* NScrollbar should handle overflow. Padding might be within NCard content area or NScrollbar. */
  padding: 8px 12px;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}

.user-row {
  justify-content: flex-end;
}

.system-row {
  justify-content: flex-start;
}

.message {
  padding: 8px 12px;
  border-radius: 10px; /* Softer radius */
  max-width: 80%;
  word-wrap: break-word;
  /* NCard as message bubble will have its own background and text color logic via props or theme */
}

.message.user {
  /* background-color: #007bff; // Handled by NCard theme/type primary */
  /* color: white; */
  border-bottom-right-radius: 4px;
}

.message.system {
  /* background-color: #f0f0f0; // Handled by NCard theme/type default */
  /* color: #333; */
  border-bottom-left-radius: 4px;
}

.chat-input-area {
  display: flex;
  align-items: center;
  padding: 8px; /* NCard footer might have padding options */
}

.chat-input-field {
  flex-grow: 1;
  margin-right: 8px;
}

/* .chat-send-button { ... } // NButton styling should come from design system */
</style>