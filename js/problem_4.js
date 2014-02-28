// Generated by CoffeeScript 1.7.1
var accessToken, aggregatedNode, aggregatedNodes, allAuthors, allBranchNames, allTimestamps, barWidth, branch, branchName, branches, branchesUrl, candidateNode, canvasHeight, canvasWidth, commit, commits, commitsUrl, contributors, duplicate, focusNode, force, getData, graph, graphUpdate, i, indexScale, info, ix, j, line, linearLayout, links, margin, metadata, name, newNode, node, nodes, parent, parentSha, parseLinkHeader, repoName, rootUrl, rootUser, scale, storedCommit, stringToHex, svg, tick, timeScale, title, tooltipOffset, yScale, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _m, _n, _o, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

parseLinkHeader = function(header) {
  var links, rel, segments, url, value, values, _i, _len;
  if (header === null) {
    return {};
  }
  values = header.split(',');
  links = {};
  for (_i = 0, _len = values.length; _i < _len; _i++) {
    value = values[_i];
    segments = value.split(';');
    url = segments[0].replace(/<(.*)>/, '$1').trim();
    rel = segments[1].replace(/rel="(.*)"/, '$1').trim();
    links[rel] = url;
  }
  return links;
};

getData = function(url) {
  var data, linkHeader, links, request;
  console.log("Getting data from " + url);
  request = new XMLHttpRequest();
  request.open('GET', url, false);
  request.send();
  if (request.status === 200) {
    data = JSON.parse(request.responseText);
  } else {
    throw new Error("" + request.status + " " + request.statusText);
  }
  linkHeader = request.getResponseHeader("Link");
  links = parseLinkHeader(linkHeader);
  if ("next" in links) {
    data = data.concat(getData(links["next"]));
  }
  return data;
};

accessToken = "5e04d069456442ee6b66b2b87d2a28f215789511";

repoName = "django-waffle";

rootUrl = "https://api.github.com/repos/jsocol/django-waffle/";

rootUser = "jsocol";

contributors = {};

contributors[rootUser] = {};

branchesUrl = "" + rootUrl + "branches?access_token=" + accessToken;

branches = getData(branchesUrl);

commitsUrl = "" + rootUrl + "commits?sha=master&per_page=100&access_token=" + accessToken;

contributors[rootUser]["master"] = getData(commitsUrl);

for (_i = 0, _len = branches.length; _i < _len; _i++) {
  branch = branches[_i];
  if (branch.name === "master") {
    continue;
  }
  commitsUrl = "" + rootUrl + "commits?sha=" + branch.name + "&per_page=100&access_token=" + accessToken;
  contributors[rootUser][branch.name] = getData(commitsUrl);
}

graph = {
  nodes: [],
  links: []
};

allBranchNames = [];

allTimestamps = [];

allAuthors = [];

for (name in contributors) {
  branches = contributors[name];
  for (branchName in branches) {
    commits = branches[branchName];
    if (__indexOf.call(allBranchNames, branchName) < 0) {
      allBranchNames.push(branchName);
    }
    for (_j = 0, _len1 = commits.length; _j < _len1; _j++) {
      commit = commits[_j];
      duplicate = false;
      _ref = graph.nodes;
      for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
        storedCommit = _ref[_k];
        if (commit.sha === storedCommit.sha) {
          duplicate = true;
          break;
        }
      }
      if (duplicate) {
        continue;
      }
      metadata = {
        author: commit.commit.author.name,
        date: new Date(commit.commit.committer.date),
        message: commit.commit.message,
        branch: branchName,
        sha: commit.sha,
        htmlUrl: commit.html_url,
        parentShas: (function() {
          var _ref1, _results;
          _ref1 = commit.parents;
          _results = [];
          for (parent in _ref1) {
            info = _ref1[parent];
            _results.push(info.sha);
          }
          return _results;
        })()
      };
      if (_ref1 = metadata.date, __indexOf.call(allTimestamps, _ref1) < 0) {
        allTimestamps.push(metadata.date);
      }
      if (_ref2 = metadata.author, __indexOf.call(allAuthors, _ref2) < 0) {
        allAuthors.push(metadata.author);
      }
      graph.nodes.push(metadata);
    }
  }
}

graph.nodes.sort(function(a, b) {
  return a.date.getTime() - b.date.getTime();
});

aggregatedNodes = [];

ix = 0;

_ref3 = graph.nodes;
for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
  node = _ref3[_l];
  if (aggregatedNodes.length === 0) {
    newNode = {
      author: node.author,
      branch: node.branch,
      dates: [node.date],
      messages: [node.message],
      shas: [node.sha],
      parentShas: node.parentShas,
      aggregatedCount: 1
    };
    aggregatedNodes.push(newNode);
    continue;
  }
  aggregatedNode = aggregatedNodes[ix];
  if (node.author === aggregatedNode.author && node.branch === aggregatedNode.branch) {
    aggregatedNode.dates.push(node.date);
    aggregatedNode.messages.push(node.message);
    aggregatedNode.shas.push(node.sha);
    aggregatedNode.parentShas = aggregatedNode.parentShas.concat(node.parentShas);
    aggregatedNode.aggregatedCount += 1;
  } else {
    newNode = {
      author: node.author,
      branch: node.branch,
      dates: [node.date],
      messages: [node.message],
      shas: [node.sha],
      parentShas: node.parentShas,
      aggregatedCount: 1
    };
    aggregatedNodes.push(newNode);
    ix += 1;
  }
}

graph.nodes = aggregatedNodes;

_ref4 = d3.range(graph.nodes.length);
for (_m = 0, _len4 = _ref4.length; _m < _len4; _m++) {
  i = _ref4[_m];
  focusNode = graph.nodes[i];
  _ref5 = focusNode.parentShas;
  for (_n = 0, _len5 = _ref5.length; _n < _len5; _n++) {
    parentSha = _ref5[_n];
    _ref6 = d3.range(graph.nodes.length);
    for (_o = 0, _len6 = _ref6.length; _o < _len6; _o++) {
      j = _ref6[_o];
      if (i === j) {
        continue;
      }
      candidateNode = graph.nodes[j];
      if (__indexOf.call(candidateNode.shas, parentSha) >= 0) {
        graph.links.push({
          source: j,
          target: i
        });
      }
    }
  }
}

margin = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10
};

canvasWidth = 1200 - margin.left - margin.right;

canvasHeight = allAuthors.length * 20 - margin.top - margin.bottom;

barWidth = 10;

tooltipOffset = 5;

title = d3.select("body").insert("div", "div").attr("id", "title").text("The improved " + repoName + " network graph");

svg = d3.select("body").append("svg").attr("width", canvasWidth + margin.left + margin.right).attr("height", canvasHeight + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

stringToHex = function(str) {
  var code, decimal, hexadecimal, hexatridecimal, trimmed, truncated;
  hexatridecimal = parseInt(str, 36);
  trimmed = hexatridecimal.toExponential().slice(2, -5);
  decimal = parseInt(trimmed, 10);
  truncated = decimal & 0xFFFFFF;
  hexadecimal = truncated.toString(16).toUpperCase();
  code = "#" + (('000000' + hexadecimal).slice(-6));
  return code;
};

yScale = d3.scale.ordinal().domain(allAuthors).rangeRoundBands([0, canvasHeight - 75], 0.5);

indexScale = d3.scale.linear().domain([0, graph.nodes.length]).rangeRound([0, canvasWidth]);

timeScale = d3.time.scale().domain([d3.min(allTimestamps), d3.max(allTimestamps)]).rangeRound([0, canvasWidth]);

tick = function(d) {
  return graphUpdate(0);
};

scale = "index";

linearLayout = function() {
  force.stop();
  graph.nodes.forEach(function(d, i) {
    d.y = yScale(d.author);
    if (scale === "time") {
      return d.x = timeScale(d.dates[0]);
    } else {
      return d.x = indexScale(i);
    }
  });
  return graphUpdate(500);
};

line = d3.svg.line().x(function(d) {
  return d.x;
}).y(function(d) {
  return d.y;
});

graphUpdate = function(delay) {
  links.transition().duration(delay).attr("d", function(d) {
    return line([
      {
        x: d.source.x + barWidth / 2,
        y: d.source.y + barWidth / 2
      }, {
        x: d.source.x + barWidth / 2,
        y: d.target.y + barWidth / 2
      }, {
        x: d.target.x,
        y: d.target.y + barWidth / 2
      }
    ]);
  });
  return nodes.transition().duration(delay).attr("transform", function(d) {
    return "translate(" + d.x + ", " + d.y + ")";
  });
};

force = d3.layout.force().nodes(graph.nodes).links(graph.links).start().stop();

d3.select("input[value='indexScale']").on("click", function() {
  scale = "index";
  return linearLayout();
});

d3.select("input[value='timeScale']").on("click", function() {
  scale = "time";
  return linearLayout();
});

links = svg.append("svg:g").selectAll("path").data(force.links()).enter().append("svg:path").attr("class", "link");

nodes = svg.selectAll(".node").data(force.nodes()).enter().append("g").attr("class", "node").append("rect").attr("height", function(d) {
  return barWidth * d.aggregatedCount;
}).attr("width", barWidth).style("fill", function(d) {
  return stringToHex(d.author);
});

nodes.on("mouseover", function(d, i) {
  d3.select(this).style("fill", "red");
  nodes.style("opacity", function(nodeData) {
    if (nodeData.branch !== d.branch) {
      return 0.4;
    }
  });
  links.style("stroke-width", function(bound) {
    if (d === bound.source || d === bound.target) {
      return "" + barWidth + "px";
    }
  }).style("stroke", function(bound) {
    if (d === bound.target) {
      return "green";
    } else if (d === bound.source) {
      return "red";
    }
  });
  d3.select("#nodeTooltip").style("left", "" + (d3.event.pageX + tooltipOffset) + "px").style("top", "" + (d3.event.pageY + tooltipOffset) + "px");
  d3.select("#author").text(d.author);
  d3.select("#branch").text(d.branch);
  d3.select("#date").text(function() {
    var length;
    length = d.dates.length;
    if (length === 1) {
      return "1 commit pushed on " + (d.dates[0].getMonth() + 1) + "/" + (d.dates[0].getDate()) + "/" + (d.dates[0].getFullYear()) + " at " + (d.dates[0].getHours()) + ":" + (d.dates[0].getMinutes()) + "." + (d.dates[0].getSeconds());
    } else {
      return "" + length + " commits pushed between " + (d.dates[0].getMonth() + 1) + "/" + (d.dates[0].getDate()) + "/" + (d.dates[0].getFullYear()) + " at " + (d.dates[0].getHours()) + ":" + (d.dates[0].getMinutes()) + "." + (d.dates[0].getSeconds()) + " and " + (d.dates[length - 1].getMonth() + 1) + "/" + (d.dates[length - 1].getDate()) + "/" + (d.dates[length - 1].getFullYear()) + " at " + (d.dates[length - 1].getHours()) + ":" + (d.dates[length - 1].getMinutes()) + "." + (d.dates[length - 1].getSeconds());
    }
  });
  d3.select("#message").text(function() {
    if (d.messages.length === 1) {
      return "" + d.messages[0];
    } else {
      return "";
    }
  });
  return d3.select("#nodeTooltip").classed("hidden", false);
});

nodes.on("mouseout", function(d, i) {
  d3.select(this).style("fill", function() {
    return stringToHex(d.author);
  });
  nodes.transition().duration(250).style("opacity", "1");
  d3.select("#nodeTooltip").classed("hidden", true);
  return links.transition().duration(250).style("stroke", "gray").style("stroke-width", "1.5px").style("stroke-opacity", "0.4");
});

links.on("mouseover", function(d, i) {
  links.style("stroke-opacity", "0.2");
  d3.select(this).style("stroke-width", "" + barWidth + "px").style("stroke-opacity", "0.6");
  d3.select("#linkTooltip").style("left", "" + (d3.event.pageX + tooltipOffset) + "px").style("top", "" + (d3.event.pageY + tooltipOffset) + "px");
  d3.select("#source").text(d.source.author);
  d3.select("#target").text(d.target.author);
  return d3.select("#linkTooltip").classed("hidden", false);
});

links.on("mouseout", function(d, i) {
  d3.select("#linkTooltip").classed("hidden", true);
  return links.transition().duration(250).style("stroke", "gray").style("stroke-width", "1.5px").style("stroke-opacity", "0.4");
});

linearLayout();
