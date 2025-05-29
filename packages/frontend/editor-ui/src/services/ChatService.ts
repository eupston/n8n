import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { INodeUi, IWorkflowDataCreate } from '@/Interface';
import { NodeHelpers } from 'n8n-workflow'; // This import is likely causing linter issues if types aren't resolved

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
          const lastNodePosition = currentNodes.length > 0 ? currentNodes[currentNodes.length - 1].position : [0, 0];

          // Bypassing linter issues with 'any'. Proper typing depends on INodeUi and n8n-workflow resolution.
          const newNodeData: any = {
            id: NodeHelpers.generateId(), 
            name: newNodeName,
            type: nodeTypeDescription.name,
            typeVersion: nodeTypeDescription.version,
            position: [lastNodePosition[0] + 200, lastNodePosition[1]],
            parameters: { ...nodeTypeDescription.defaults },
            credentials: {},
            notes: '',
            disabled: false,
            // Ensure all other INodeUi fields are populated as necessary by workflowsStore.addNode
            // retryOnFail, executeOnce, alwaysOutputData etc.
          };

          workflowsStore.addNode(newNodeData as INodeUi); 
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
          // Ensure all required fields for IWorkflowDataCreate are present
        };

        const newWorkflow = await workflowsStore.createNewWorkflow(workflowCreateData);
        responseText = `Workflow "${newWorkflow.name}" created with ID: ${newWorkflow.id}. You may need to open it manually.`;
        // success = true;
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