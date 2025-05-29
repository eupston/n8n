import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { INodeUi, IWorkflowDataCreate, XYPosition, INodeParameters } from '@/Interface';
import { NodeHelpers, type IConnection } from 'n8n-workflow';
import { globalEventBus } from '@/event-bus';

interface ChatMessage {
  text: string;
  sender: 'user' | 'system';
}

let nodeCreationCounter = 0;

// Regex for parsing parameters: key="value" or key=value
const paramRegex = /(\w+)(?:\s*=\s*(?:"([^"]*)"|(\S+)))/g;

class ChatService {
  private parseParameters(paramString: string, existingParams: INodeParameters, nodeTypeDescription: any): INodeParameters {
    const newParams = { ...existingParams };
    let match;
    while ((match = paramRegex.exec(paramString)) !== null) {
      const key = match[1];
      const value = match[2] !== undefined ? match[2] : match[3]; // value from quotes or unquoted

      // Basic type conversion based on nodeTypeDescription (very simplified)
      // A real implementation would need to inspect nodeTypeDescription.properties[key].type
      if (nodeTypeDescription && nodeTypeDescription.properties) {
        const propDef = nodeTypeDescription.properties.find((p: any) => p.name === key);
        if (propDef) {
          if (propDef.type === 'number') {
            (newParams as any)[key] = parseFloat(value);
          } else if (propDef.type === 'boolean') {
            (newParams as any)[key] = value.toLowerCase() === 'true';
          } else {
            (newParams as any)[key] = value; // Default to string
          }
        } else {
          (newParams as any)[key] = value; // Parameter not in definition, add as is
        }
      } else {
        (newParams as any)[key] = value; // No type description, add as is
      }
    }
    return newParams;
  }

  public async processMessage(message: string): Promise<ChatMessage> {
    const workflowsStore = useWorkflowsStore();
    const nodeTypesStore = useNodeTypesStore();
    let responseText = `Received: "${message}"`;

    try {
      const lowerMessage = message.toLowerCase();

      // Command: create node <type> [as <name>] [with <params>]
      const createNodeMatch = lowerMessage.match(/^create node ([\w.-]+)(?: as (\w+))?(?: with (.+))?$/i);
      // Command: connect <sourceNode>[.output_<outputName>] to <targetNode>[.input_<inputName>]
      const connectMatch = lowerMessage.match(/^connect (\w+)(?: output (\w+))? to (\w+)(?: input (\w+))?$/i);

      if (createNodeMatch) {
        const nodeTypeFullName = createNodeMatch[1];
        const userGivenName = createNodeMatch[2];
        const paramsString = createNodeMatch[3];

        const nodeTypeDescription = nodeTypesStore.getNodeType(nodeTypeFullName);
        if (!nodeTypeDescription) {
          responseText = `Error: Node type "${nodeTypeFullName}" not found.`;
        } else {
          nodeCreationCounter++;
          const newNodeName = userGivenName || `${nodeTypeDescription.name}_${nodeCreationCounter}`;
          const currentNodes = workflowsStore.allNodes;
          const lastNodePosition: XYPosition = currentNodes.length > 0 && currentNodes[currentNodes.length - 1].position 
            ? currentNodes[currentNodes.length - 1].position 
            : [0, 0];

          let nodeParams: INodeParameters = { ...nodeTypeDescription.defaults };
          if (paramsString) {
            nodeParams = this.parseParameters(paramsString, nodeParams, nodeTypeDescription);
          }

          const newNodeData: INodeUi = {
            id: NodeHelpers.generateId(),
            name: newNodeName,
            type: nodeTypeDescription.name,
            typeVersion: nodeTypeDescription.version,
            position: [lastNodePosition[0] + 250, lastNodePosition[1]], // Increased offset slightly
            parameters: nodeParams,
            credentials: {},
            notes: '',
            disabled: false,
            retryOnFail: false,
            executeOnce: false,
            alwaysOutputData: false,
          };

          workflowsStore.addNode(newNodeData);
          responseText = `Node "${nodeTypeDescription.displayName}" (named "${newNodeName}") created.`;
        }
      } else if (connectMatch) {
        const sourceNodeName = connectMatch[1];
        const sourceOutputName = connectMatch[2] || 'main'; // Default to 'main' output
        const targetNodeName = connectMatch[3];
        const targetInputName = connectMatch[4] || 'main'; // Default to 'main' input

        const sourceNode = workflowsStore.getNodeByName(sourceNodeName);
        const targetNode = workflowsStore.getNodeByName(targetNodeName);

        if (!sourceNode || !targetNode) {
          responseText = "Error: One or both nodes for connection not found.";
        } else {
          // Simplified connection logic: assumes first output/input index (0)
          // Real logic needs to parse handle names (e.g., main_0, main_1) if specified, 
          // or look up node descriptions for valid handles.
          const connection: IConnection[] = [
            { node: sourceNode.name, type: sourceOutputName, index: 0 },
            { node: targetNode.name, type: targetInputName, index: 0 },
          ];
          workflowsStore.addConnection({ connection });
          responseText = `Connected ${sourceNodeName} (${sourceOutputName}) to ${targetNodeName} (${targetInputName}).`;
        }

      } else if (lowerMessage.startsWith('create workflow')) {
        const requestedWorkflowName = message.substring('create workflow'.length).trim() || 'My Chat Workflow';
        const newWorkflowInitialData = await workflowsStore.getNewWorkflowData(requestedWorkflowName);
        const workflowCreateData: IWorkflowDataCreate = {
          name: newWorkflowInitialData.name,
          nodes: [],
          connections: {},
          settings: newWorkflowInitialData.settings,
          active: false,
          tags: [],
        };
        const newWorkflow = await workflowsStore.createNewWorkflow(workflowCreateData);
        responseText = `Workflow "${newWorkflow.name}" created. Navigating...`;
        globalEventBus.emit('navigate-to-workflow', newWorkflow.id);
      } else {
        responseText = `Command not recognized. Try: "create node <type> [as <name>] [with key=value, key2=\"value two\"]", "connect <node1> [output <handle>] to <node2> [input <handle>]", or "create workflow <name>".`;
      }
    } catch (error) {
      console.error("Error processing chat command:", error);
      responseText = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      text: responseText,
      sender: 'system',
    };
  }
}

export const chatService = new ChatService();