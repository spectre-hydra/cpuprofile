'use strict';

var _ = require('lodash');

/**
 * Calculates the sampling interval of a profile and the self and total times
 * for each node. Works in-place.
 *
 * @param {object} profile - A parsed .cpuprofile file.
 */
function calculateTimes(profile) {
  // replace all empty function names with '(anonymous function)'
  for (var i = 0; i < profile.nodes.length; i++) {
    var node = profile.nodes[i];
    if (!node.callFrame.functionName) {
      node.callFrame.functionName = '(anonymous function)';
    }
  }

  // sort nodes by id
  profile.nodes.sort(function (a, b) {
    return a.id - b.id;
  });

  // accumulate total hit count from all nodes
  var totalHitCount = 0;
  for (var i = 0; i < profile.nodes.length; i++) {
    totalHitCount += profile.nodes[i].hitCount;
  }

  // calculate sampling interval
  profile.samplingInterval = (profile.endTime - profile.startTime) / totalHitCount;

  // calculate "Self Time" for each node
  for (var i = 0; i < profile.nodes.length; i++) {
    var node = profile.nodes[i];
    // calculate "Self Time" based on hit count and sampling interval, in ms
    node.selfTime = (node.hitCount * profile.samplingInterval) / 1000;
  }

  // iteratively calculates the "Total Time" of a node (and all its children)
  var calcTT = function calcTT(node) {
    node.totalTime = node.selfTime;
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        var id = node.children[i];
        var child = profile.nodes[id - 1];
        calcTT(child);
        node.totalTime += child.totalTime;
      }
    }
  };

  // calculate "Total Time" for each node
  for (var i = 0; i < profile.nodes.length; i++) {
    var node = profile.nodes[i];
    calcTT(node);
  }
}
module.exports.calculateTimes = calculateTimes;

/**
 * @param {object} profile - A parsed .cpuprofile file.
 * @return {boolean} True if self and total times have already been calculated,
 * false otherwise.
 */
function containsSelfAndTotalTimes(profile) {
  for (var i = 0; i < profile.nodes.length; i++) {
    var node = profile.nodes[i];
    if (!node.selfTime || !node.totalTime) {
      return false;
    }
  }
  return true;
}

/**
 * Accumulates self and total times of associated nodes and returns them with
 * appropriate information (function name, URL).
 *
 * @param {object} profile - A parsed .cpuprofile file.
 * @return {array} An array of objects in which each object contains a function
 * name, a URL, the self time, and the total time based on the profile.
 */
function format(profile) {
  // calculate times, if necessary
  if (!containsSelfAndTotalTimes(profile)) {
    calculateTimes(profile);
  }

  // tests two call frames for equality on function name, URL, and line number
  var identifierEquals = function identifierEquals(a, b) {
    return a.functionName === b.functionName &&
      a.url === b.url &&
      a.lineNumber === b.lineNumber;
  };

  // extract call frames from nodes
  var callFrames = profile.nodes.map(function (node) {
    return node.callFrame;
  });
  // remove duplicates
  var identifiers = _.uniqWith(callFrames, identifierEquals);

  var res = [];
  for (var i = 0; i < identifiers.length; i++) {
    var identifier = identifiers[i];

    // for every identifier, accumulate "Self Time" and "Total Time" values
    var entry = profile.nodes.filter(function (node) {
      return identifierEquals(node.callFrame, identifier);
    }).reduce(function (acc, node) {
      return {
        selfTime: acc.selfTime + node.selfTime,
        totalTime: acc.totalTime + node.totalTime
      };
    }, {selfTime: 0, totalTime: 0});

    // save function name and URL
    entry.functionName = identifier.functionName;
    entry.url = identifier.url;

    res.push(entry);
  }

  return res;
}
module.exports.format = format;
