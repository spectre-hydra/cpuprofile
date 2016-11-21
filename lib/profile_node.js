/**
 * @class
 */
class ProfileNode {
  /**
   * Create a ProfileNode.
   *
   * @constructor
   * @param {number} id - The identifier.
   * @param {object} callFrame - Necessary information of call frame.
   * @param {number} hitCount - Number of times the associated function has been
   * on top of the execution stack.
   * @param {array} positionTicks - Position ticks array.
   * @param {string} deoptReason - Reason for deoptimization.
   */
  constructor(id, callFrame, hitCount, children, positionTicks=null, deoptReason=null) {
    this.id = id;
    this.callFrame = callFrame;
    this.hitCount = hitCount;
    this.children = children || [];
    this.positionTicks = positionTicks || [];
    this.deoptReason = deoptReason;
    
    this.selfTime = 0;
    this.totalTime = 0;
    
    this.callUID = `${this.callFrame.functionName}@${this.callFrame.scriptId}:${this.callFrame.lineNumber}`;
  }
  
  /**
   * @param {object} obj - An object.
   * @return {ProfileNode} A ProfileNode instance.
   */
  static createFromObject(obj) {
    return new ProfileNode(obj.id, obj.callFrame, obj.hitCount, obj.children, obj.positionTicks, obj.deoptReason);
  }
  
  /**
   * @param {ProfileNode} node - A profile node.
   * @return {ProfileNode} A clone of the given profile node.
   */
  static clone(node) {
    let children = [];
    if (node.children) {
      children = node.children.slice();
    }
    
    let instance =  new ProfileNode(node.id, node.callFrame, node.hitCount, children, node.positionTicks, node.deoptReason);
    
    instance.selfTime = node.selfTime;
    instance.totalTime = node.totalTime;
    
    return instance;
  }
  
  /**
   * @param {ProfileNode} node - A profile node.
   * @return {ProfileNode} A clone of the given profile node, with an empty
   * array of children.
   */
  static cloneWithoutChildren(node) {
    let instance = new ProfileNode(node.id, node.callFrame, node.hitCount, [], node.positionTicks, node.deoptReason);
    
    instance.selfTime = node.selfTime;
    instance.totalTime = node.totalTime;
    
    return instance;
  }
  
  /**
   * @return {boolean} True if the node represents a native node, false
   * otherwise.
   */
  isNativeNode() {
    return !!this.callFrame.url && this.callFrame.url.startsWith('native ');
  }
}
module.exports = ProfileNode;