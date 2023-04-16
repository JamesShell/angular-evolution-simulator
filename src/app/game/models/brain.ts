export type Neuron = {
  type: number;
  id: string;
  output?: number;
}

export type Connection = {
  from: string;
  to: string;
  weight: number;
}

export type NeuralNetwork = {
  nodes: Neuron[];
  connections: Connection[];
}

export function connectionsToString(connections: Connection[]): string {
  let str = "";
  for (let connection of connections) {
    const fromStr = connection.from;
    const toStr = connection.to;
    str += `${fromStr}${toStr} `;
  }
  return str;
}

function getRandomWeight(): number {
  return Math.random() * 8 - 4;
}

function getNodes(nn: NeuralNetwork): [Neuron[], Neuron[], Neuron[]] {
    var starting: Neuron[] = [];
    var inner: Neuron[] = [];
    var action: Neuron[] = [];
    nn.nodes.forEach((neuron) => {
        switch (neuron.type) {
            case 1:
                inner.push(neuron);
                break;
                
            case 2:
                action.push(neuron);
                break;

            default:
                starting.push(neuron);
                break;
        }
    });
    
    return [starting, inner, action]
}

function simplifyNeuralNetwork(nn: NeuralNetwork): NeuralNetwork {
    const nodeIds = new Set<string>();
    const actionNodeIds = new Set<string>(getNodes(nn)[2].map(neuron => neuron.id));
    const startingNodeIds = new Set<string>(getNodes(nn)[0].map(neuron => neuron.id));
    const connectionMap: Map<string, Set<string>> = new Map();
  
    // add all node ids to the nodeIds set
    for (const connection of nn.connections) {
      nodeIds.add(connection.from);
      nodeIds.add(connection.to);
    }
  
    // build the connectionMap to track connections
    for (const nodeId of nodeIds) {
      connectionMap.set(nodeId, new Set());
    }
    for (const connection of nn.connections) {
      connectionMap.get(connection.from)?.add(connection.to);
    }
  
    // remove nodes with no connections
    for (const nodeId of nodeIds) {
      if (connectionMap.get(nodeId)?.size === 0 && !actionNodeIds.has(nodeId)) {
        connectionMap.delete(nodeId);
      }
    }
  
    // remove inner nodes that don't provide input to any action node
    const nodesToRemove: Set<string> = new Set();
    for (const nodeId of nodeIds) {
      if (!startingNodeIds.has(nodeId) && !actionNodeIds.has(nodeId)) {
        let providesInput = false;
        for (const actionNodeId of actionNodeIds) {
          const visited: Set<string> = new Set();
          if (providesInputToNode(nodeId, actionNodeId, connectionMap, visited)) {
            providesInput = true;
            break;
          }
        }
        if (!providesInput) {
          nodesToRemove.add(nodeId);
        }
      }
    }
  
    // remove the nodes and associated connections from the nn object
    nn.connections = nn.connections.filter(
      (connection) =>
        !nodesToRemove.has(connection.from) && !nodesToRemove.has(connection.to)
    );

    nn.nodes = nn.nodes.filter(n => !nodesToRemove.has(n.id))
  
    return nn;
}
  
// helper function to recursively check if a node provides input to an action node
function providesInputToNode(
    currNodeId: string,
    actionNodeId: string,
    connectionMap: Map<string, Set<string>>,
    visited: Set<string>
  ): boolean {
    visited.add(currNodeId);
    if (connectionMap.get(currNodeId)?.has(actionNodeId)) {
      return true;
    } else {
      let providesInput = false;
      for (const connectedNodeId of connectionMap.get(currNodeId) || []) {
        if (!visited.has(connectedNodeId)) {
          providesInput =
            providesInput ||
            providesInputToNode(
              connectedNodeId,
              actionNodeId,
              connectionMap,
              visited
            );
        }
      }
      return providesInput;
    }
}
  
export function activateNeuralNetwork(nn: NeuralNetwork, inputsValues: {[key: string]: number} ): string {
  // Initialize a map to store the values of each node
  const nodeValues = new Map();

  const startingNodes = nn.nodes.filter(n => n.type == 0);
  const innerNodes = nn.nodes.filter(n => n.type == 1);
  const actionNodes = nn.nodes.filter(n => n.type == 2);

  // Set the values of the starting nodes to the input values
  startingNodes.map(n => n.id).forEach((id) => {
    nodeValues.set(id, inputsValues[id]);
  });

  // Iterate over the connections, calculating the value of each node
  nn.connections.forEach(connection => {
    // Get the from and to nodes for this connection
    const fromNode = nn.nodes.find(node => node.id === connection.from)!;
    const toNode = nn.nodes.find(node => node.id === connection.to)!;

    // Get the value of the from node
    const fromValue = nodeValues.get(fromNode.id);

    // Calculate the value of the to node based on the type of node
    let toValue;
    if (toNode.type === 0) {
      toValue = fromValue;
    } else if (toNode.type === 1) {
      // Sum the values of all incoming connections to the inner node
      const incomingValues = nn.connections
        .filter(c => c.to === toNode.id)
        .map(c => c.weight * nodeValues.get(c.from));
      toValue = Math.tanh(incomingValues.reduce((sum, v) => sum + v, 0));
    } else if (toNode.type === 2) {
      // Sum the values of all incoming connections to the action node
      const incomingValues = nn.connections
        .filter(c => c.to === toNode.id)
        .map(c => c.weight * nodeValues.get(c.from));
      toValue = Math.tanh(incomingValues.reduce((sum, v) => sum + v, 0));
    }

    // Store the value of the to node in the map
    nodeValues.set(toNode.id, toValue);
  });

  // Find the action node with the highest value
  let highestValue = -Infinity;
  let highestActionNode: string = nodeValues.get(actionNodes[0].id);
  actionNodes.map(n => n.id).forEach(id => {
    const value = nodeValues.get(id);
    if (value > highestValue) {
      highestValue = value;
      highestActionNode = id;
    }
  });

  return highestActionNode;
}


export function createNeuralNetwork(startingNeuronIds: string[], actionNeuronIds: string[]): NeuralNetwork {
  const maxStartingNeurons = 3;
  const maxInnerNeurons = 3;

  const nodes: Neuron[] = [];
  const connections: Connection[] = [];

  // create starting nodes
  for (const id of startingNeuronIds) {
    nodes.push({ type: 0, id: id });
  }

  // create inner nodes
  for (let i = 0; i < maxInnerNeurons; i++) {
    const id = `N${i}`;
    nodes.push({ type: 1, id });
  }

  // create action nodes
  for (const id of actionNeuronIds) {
    nodes.push({ type: 2, id: id });
  }

  // Choose a random starting node
  const startingNodes = nodes.filter(n => n.type == 0);
  const innerNodes = nodes.filter(n => n.type == 1);
  const actionNodes = nodes.filter(n => n.type == 2);


  const startingNeurons = startingNodes.sort(() => 0.5 - Math.random()).slice(0, maxStartingNeurons);

  const availableNeurons = [ ...innerNodes, ...actionNodes];

  // Create initial connections from starting nodes to inner nodes or action nodes
  for (const startNode of startingNeurons) {
    const numConnections = Math.max(Math.floor(Math.random() * 3), 1);
    for (let i = 0; i < numConnections; i++) {
      const index = Math.floor(Math.random() * availableNeurons.length);
      const endNode = availableNeurons.splice(index, 1)[0];
      connections.push({
        from: startNode.id,
        to: endNode.id,
        weight: getRandomWeight()
      });
    }
  }

  // Create connections from inner nodes to action nodes
    for (const innerNode of innerNodes) {
        const numConnections = Math.max(Math.floor(Math.random() * 3), 1);
        for (let i = 0; i < numConnections; i++) {
            const index = Math.floor(Math.random() * availableNeurons.length);
            const endNode = availableNeurons.splice(index, 1)[0];
            connections.push({
                from: innerNode.id,
                to: endNode.id,
                weight: getRandomWeight()
            });
        }
    }

  
  const simplifiedNN = simplifyNeuralNetwork({nodes, connections})
  return simplifiedNN;
}


