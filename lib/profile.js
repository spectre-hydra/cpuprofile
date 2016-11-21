const ProfileNode = require('./profile_node');

/**
 * @class
 */
class Profile {
  /**
   * Create a Profile.
   *
   * @constructor
   * @param {array} nodes - An array of profile nodes.
   * @param {number} startTime - Start time of recording.
   * @param {number} endTime - End time of recording.
   * @param {array} samples - An array of execution stack samples.
   * @param {array} timeDeltas - An array of time distance between samples.
   */
  constructor(nodes, startTime, endTime, samples, timeDeltas) {
    this.nodes = nodes;
    this.startTime = startTime;
    this.endTime = endTime;
    this.samples = samples;
    this.timeDeltas = timeDeltas;
    
    this._idToNodeMap = new Map();
    this._createIdToNodeMap();
    
    this._determineSamplingInterval();
    this._assignInitialSelfTimes();
    this._nameAnonymousFunctions();
  }
  
  /**
   * @param {object} obj - An object.
   * @return A Profile instance using the properties of the object.
   */
  static createFromObject(obj) {
    // create ProfileNode instances for every node
    let nodes = obj.nodes.map(node => ProfileNode.createFromObject(node));
    
    return new Profile(nodes, obj.startTime, obj.endTime, obj.samples, obj.timeDeltas);
  }
  
  /**
   * Assigns names to anonymous functions.
   */
  _nameAnonymousFunctions() {
    for (let node of this.nodes) {
      if (!node.callFrame.functionName) {
        node.callFrame.functionName = '(anonymous function)';
      }
    }
  }
  
  /**
   * Calculates the sampling interval of the profile, using its start and end
   * time and the total hit count of all nodes.
   */
  _determineSamplingInterval() {
    let totalHitCount = this.nodes.reduce((acc, node) => acc + node.hitCount, 0);
    this.samplingInterval = (this.endTime - this.startTime) / totalHitCount;
  }
  
  /**
   * Assigns an initial self time to all nodes based on the node's hit count and
   * the sampling interval.
   */
  _assignInitialSelfTimes() {
    for (let node of this.nodes) {
      // assign initial self time, in ms
      node.selfTime = (node.hitCount * this.samplingInterval) / 1000;
    }
  }
  
  /**
   * Creates a map from node ids to the nodes themselves.
   */
  _createIdToNodeMap() {
    for (let node of this.nodes) {
      this._idToNodeMap.set(node.id, node);
    }
  }
  
  /**
   * The following code is adapted from parts of the Chromium project, which is
   * licensed under a BSD-style license. This code therefore is also licensed
   * under the terms of this license:
   * https://chromium.googlesource.com/chromium/src.git/+/16526eee7ca6ce8e78d06f1b65ed63acd5269603/LICENSE
   */
  get translatedRoot() {
    let originalRoot = this.nodes[0];
    let translatedRoot = ProfileNode.cloneWithoutChildren(originalRoot);
    
    let pairs = originalRoot.children.map(id => ({parentNode: translatedRoot, sourceNode: this._idToNodeMap.get(id)}));
    
    while (pairs.length) {
      let pair = pairs.pop();
      
      let parentNode = pair.parentNode;
      let sourceNode = pair.sourceNode;
      
      if (!sourceNode.children) {
        sourceNode.children = [];
      }
      
      let targetNode = ProfileNode.cloneWithoutChildren(sourceNode);
      
      if (!sourceNode.isNativeNode()) {
        parentNode.children.push(targetNode);
        parentNode = targetNode;
      } else {
        parentNode.selfTime += targetNode.selfTime;
      }
      
      for (let childId of sourceNode.children) {
        pairs.push({parentNode: parentNode, sourceNode: this._idToNodeMap.get(childId)});
      }
    }
    
    // calculate preliminary total time of translated root node
    let sumTotal = (node) => {
      node.totalTime = node.children.reduce((acc, child) => acc + sumTotal(child), node.selfTime);
      return node.totalTime;
    };
    sumTotal(translatedRoot);
    
    // assign depths and parents to all nodes contained within the translated
    // root
    translatedRoot.depth = -1;
    translatedRoot.parent = null;
    
    let stack = [translatedRoot];
    while (stack.length) {
      let parent = stack.pop();
      let depth = parent.depth + 1;
      
      for (let child of parent.children) {
        child.depth = depth;
        child.parent = parent;
        
        if (child.children.length) {
          stack.push(child);
        }
      }
    }
    
    return translatedRoot;
  }
  
  /**
   * The following code is adapted from parts of the Chromium project, which is
   * licensed under a BSD-style license. This code therefore is also licensed
   * under the terms of this license:
   * https://chromium.googlesource.com/chromium/src.git/+/16526eee7ca6ce8e78d06f1b65ed63acd5269603/LICENSE
   */
  get remainingNodeInfos() {
    let remainingNodeInfos = [];
    
    let profileNodeUIDs = 0;
    let profileNodeGroups = [[], [this.translatedRoot]];
    let visitedProfileNodesForCallUID = new Map();
    
    for (let i = 0; i < profileNodeGroups.length; i++) {
      let parentProfileNodes = profileNodeGroups[i];
      let profileNodes = profileNodeGroups[++i];
      
      for (let profileNode of profileNodes) {
        if (!profileNode.UID) {
          profileNode.UID = ++profileNodeUIDs;
        }
        
        if (profileNode.parent) {
          let visitedNodes = visitedProfileNodesForCallUID.get(profileNode.callUID);
          let totalAccountedFor = false;
          
          if (!visitedNodes) {
            visitedNodes = new Set();
            visitedProfileNodesForCallUID.set(profileNode.callUID, visitedNodes);
          } else {
            for (let parentProfileNode of parentProfileNodes) {
              if (visitedNodes.has(parentProfileNode.UID)) {
                totalAccountedFor = true;
                break;
              }
            }
          }
          
          visitedNodes.add(profileNode.UID);
          remainingNodeInfos.push({
            ancestor: profileNode,
            focusNode: profileNode,
            totalAccountedFor,
          });
        }
        
        let children = profileNode.children;
        if (children.length) {
          profileNodeGroups.push(parentProfileNodes.concat([profileNode]));
          profileNodeGroups.push(children);
        }
      }
    }
    
    return remainingNodeInfos;
  }
  
  /**
   * The following code is adapted from parts of the Chromium project, which is
   * licensed under a BSD-style license. This code therefore is also licensed
   * under the terms of this license:
   * https://chromium.googlesource.com/chromium/src.git/+/16526eee7ca6ce8e78d06f1b65ed63acd5269603/LICENSE
   */
  get bottomUpNodes() {
    let bottomUpNodes = [];
    
    for (let nodeInfo of this.remainingNodeInfos) {
      let ancestor = nodeInfo.ancestor;
      let focusNode = nodeInfo.focusNode;
      
      let child = bottomUpNodes.filter(node => node.callUID === ancestor.callUID).pop();
      
      if (child) {
        child.selfTime += focusNode.selfTime;
        
        if (!nodeInfo.totalAccountedFor) {
          child.totalTime += focusNode.totalTime;
        }
      } else {
        child = ProfileNode.clone(ancestor);
        
        if (ancestor !== focusNode) {
          child.selfTime = focusNode.selfTime;
          child.totalTime = focusNode.totalTime;
        }
        
        bottomUpNodes.push(child);
      }
      
      let parent = ancestor.parent;
    }
    
    return bottomUpNodes;
  }
  
  /**
   * @return {array} An array of all Bottom Up Profiling nodes, limited to their
   * function name, self, and total time.
   */
  formattedBottomUpProfile() {
    return this.bottomUpNodes.map(node => ({
      functionName: node.callFrame.functionName,
      selfTime: node.selfTime,
      totalTime: node.totalTime,
    }));
  }
}
module.exports = Profile;
