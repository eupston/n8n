import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { INodeUi, IWorkflowDataCreate, XYPosition } from '@/Interface';
import { NodeHelpers } from 'n8n-workflow'; // This import is likely causing linter issues if types aren't resolved
import { globalEventBus } from '@/event-bus'; // Import the event bus

interface ChatMessage {
  text: string;
  sender: 'user' | 'system';
}

let nodeCreationCounter = 0; // Simple counter for unique node names

class ChatService {
  public async processMessage(message: string): Promise<ChatMessage> {
    const workflowsStore = useWorkflowsStore();
    const nodeTypesStore = useNodeTypesStore();

    await new Promise(resolve => setTimeout(resolve, 100)); // Shorter delay

    let responseText = "I received your message: " + message;
    // let success = false; // success variable is not used

    try {
      if (message.toLowerCase().startsWith('create node')) {
        const nodeTypeFullName = message.substring('create node'.length).trim();

        // Attempt to find the node type description
        // Assuming latest version. Actual version resolution might be more complex.
        const nodeTypeDescription = nodeTypesStore.getNodeType(nodeTypeFullName);

        if (!nodeTypeDescription) {
          responseText = `Error: Node type "${nodeTypeFullName}" not found.`;
        } else {
          nodeCreationCounter++;
          const newNodeName = `${nodeTypeDescription.name}_${nodeCreationCounter}`;

          // Get current nodes to calculate next position (very basic)
          const currentNodes = workflowsStore.allNodes;
          const lastNodePosition: XYPosition = currentNodes.length > 0 && currentNodes[currentNodes.length - 1].position 
            ? currentNodes[currentNodes.length - 1].position 
            : [0, 0];

          // Constructing with the assumption that INodeUi correctly inherits id, type, typeVersion from INode
          const newNodeData: INodeUi = {
            id: NodeHelpers.generateId(), 
            name: newNodeName,
            type: nodeTypeDescription.name,
            typeVersion: nodeTypeDescription.version,
            position: [lastNodePosition[0] + 200, lastNodePosition[1]],
            parameters: { ...nodeTypeDescription.defaults },
            credentials: {},
            notes: '',
            disabled: false,
            retryOnFail: false,
            executeOnce: false,
            alwaysOutputData: false,
            // Ensure any other mandatory fields from INode/INodeUi are present
          };

          workflowsStore.addNode(newNodeData); 
          responseText = `Node "${nodeTypeDescription.displayName}" (named "${newNodeName}") created in the current workflow.`;
          // success = true;
        }
      } else if (message.toLowerCase().startsWith('create workflow')) {
        const requestedWorkflowName = message.substring('create workflow'.length).trim() || 'My Chat Workflow';
        
        // Get a unique name and initial data from the store
        const newWorkflowInitialData = await workflowsStore.getNewWorkflowData(requestedWorkflowName);
        
        // Actually create and save the workflow
        const workflowCreateData: IWorkflowDataCreate = {
          name: newWorkflowInitialData.name,
          nodes: [], 
          connections: {},
          settings: newWorkflowInitialData.settings,
          active: false,
          tags: [],
          // parentFolderId: undefined, // Or some logic to determine this
        };

        const newWorkflow = await workflowsStore.createNewWorkflow(workflowCreateData);
        responseText = `Workflow "${newWorkflow.name}" created. Navigating...`; 
        globalEventBus.emit('navigate-to-workflow', newWorkflow.id); // Emit event

        // 3. Add proper navigation after workflow creation
        // We need access to the Vue router instance here. 
        // This service is not a Vue component, so direct router access is tricky.
        // Option 1: Pass router instance to ChatService (complex setup).
        // Option 2: Emit an event that a Vue component (e.g., App.vue or ChatInterface.vue) listens to, then navigates.
        // Option 3: Workflows store itself handles navigation or provides a helper.

        // For now, let's assume an event bus or a direct navigation call if router is made available.
        // This is a placeholder for navigation logic:
        // import router from '@/router'; // This might not work directly here.
        // router.push({ name: 'workflowEdit', params: { id: newWorkflow.id } });
        // For now, we'll modify the response text and rely on a later step to implement actual navigation.
        responseText += " Navigating to the new workflow...";
        // Actual navigation needs to be implemented in a Vue-aware context.

      }
    } catch (error) {
      console.error("Error processing chat command:", error);
      responseText = `Error: Could not process your command. ${error instanceof Error ? error.message : String(error)}`;
      // success = false;
    }

    return {
      text: responseText,
      sender: 'system',
    };
  }
}

export const chatService = new ChatService();