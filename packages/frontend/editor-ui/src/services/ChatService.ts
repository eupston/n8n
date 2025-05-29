interface ChatMessage {
  text: string;
  sender: 'user' | 'system';
}

class ChatService {
  public async processMessage(message: string): Promise<ChatMessage> {
    // Simulate API call and processing
    await new Promise(resolve => setTimeout(resolve, 500));

    let responseText = "I received your message: " + message;

    // Basic command parsing (example)
    if (message.toLowerCase().startsWith('create node')) {
      const nodeType = message.substring('create node'.length).trim();
      responseText = `Okay, creating a "${nodeType}" node.`;
      // Here you would call n8n's API to create a node
      console.log(`API_CALL: createNode(${nodeType})`);
    } else if (message.toLowerCase().startsWith('create workflow')) {
      const workflowName = message.substring('create workflow'.length).trim();
      responseText = `Okay, creating a workflow named "${workflowName}".`;
      // Here you would call n8n's API to create a workflow
      console.log(`API_CALL: createWorkflow(${workflowName})`);
    }

    return {
      text: responseText,
      sender: 'system',
    };
  }
}

export const chatService = new ChatService();