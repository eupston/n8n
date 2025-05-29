import mitt from 'mitt';

// Define a type for your events to get type checking and autocompletion
type ApplicationEvents = {
  'navigate-to-workflow': string; // Event payload is the workflowId
  // Add other global events here as needed
};

export const globalEventBus = mitt<ApplicationEvents>();