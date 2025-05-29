import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { INodeUi, IWorkflowDataCreate, XYPosition, INodeParameters } from '@/Interface';
import { NodeHelpers, type IConnection, type INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';
import { globalEventBus } from '@/event-bus';

interface ChatMessage {
  text: string;
  sender: 'user' | 'system';
}

let nodeCreationCounter = 0;

// Regex for parsing parameters: key="value" or key=value
const paramRegex = /(\w+)(?:\s*=\s*(?:"([^"]*)"|(\S+)))/g;

class ChatService {
  private parseParameters(paramString: string, defaultParams: INodeParameters, nodeProps: INodeTypeDescription['properties']): INodeParameters {
    const newParams = { ...defaultParams };
    let match;
    while ((match = paramRegex.exec(paramString)) !== null) {
      const key = match[1];
      let value: any = match[2] !== undefined ? match[2] : match[3]; // value from quotes or unquoted

      const propDef = nodeProps.find(p => p.name === key);

      if (propDef) {
        switch (propDef.type) {
          case 'number':
            value = parseFloat(value);
            if (isNaN(value)) continue; // Skip if not a valid number
            break;
          case 'boolean':
            value = value.toLowerCase() === 'true';
            break;
          case 'json': // JSON parameters might need JSON.parse, with error handling
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.warn(`Failed to parse JSON for param ${key}:`, value, e);
              // Potentially skip or set as raw string depending on desired behavior
              continue; 
            }
            break;
          // Add more type conversions as needed: options, multiOptions, fixedCollection, etc.
          default: // string or other types not explicitly handled
            break;
        }
      }
      (newParams as any)[key] = value;
    }
    return newParams;
  }

  private parseHandle(handleString?: string): { name: string, index: number } {
    if (!handleString) return { name: NodeConnectionTypes.Main, index: 0 }; // Default
    const parts = handleString.split('_');
    const name = parts[0] || NodeConnectionTypes.Main;
    const index = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    return { name, index: isNaN(index) ? 0 : index };
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
      const connectMatch = lowerMessage.match(/^connect (\w+)(?: output (\S+))? to (\w+)(?: input (\S+))?$/i);

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
            : [0, -100]; // Start a bit higher for first node

          let nodeParams: INodeParameters = { ...nodeTypeDescription.defaults };
          if (paramsString) {
            nodeParams = this.parseParameters(paramsString, nodeParams, nodeTypeDescription.properties);
          }

          const newNodeData: INodeUi = {
            id: NodeHelpers.generateId(),
            name: newNodeName,
            type: nodeTypeDescription.name,
            typeVersion: nodeTypeDescription.version,
            position: [lastNodePosition[0] + 250, lastNodePosition[1]],
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
        const sourceHandleStr = connectMatch[2]; 
        const targetNodeName = connectMatch[3];
        const targetHandleStr = connectMatch[4];

        const sourceNode = workflowsStore.getNodeByName(sourceNodeName);
        const targetNode = workflowsStore.getNodeByName(targetNodeName);

        if (!sourceNode || !targetNode) {
          responseText = "Error: One or both nodes for connection not found.";
        } else {
          const sourceHandle = this.parseHandle(sourceHandleStr);
          const targetHandle = this.parseHandle(targetHandleStr);

          const connection: IConnection[] = [
            { node: sourceNode.name, type: sourceHandle.name, index: sourceHandle.index },
            { node: targetNode.name, type: targetHandle.name, index: targetHandle.index },
          ];
          workflowsStore.addConnection({ connection });
          responseText = `Connected ${sourceNodeName} (output ${sourceHandle.name}_${sourceHandle.index}) to ${targetNodeName} (input ${targetHandle.name}_${targetHandle.index}).`;
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
        responseText = `Command not recognized. Examples:\n` +
                       `  create node n8n-nodes-base.set as myNode with text="Hello", number=123\n` +
                       `  connect myNode output main_0 to anotherNode input main_0\n` +
                       `  create workflow My Workflow Name`;
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