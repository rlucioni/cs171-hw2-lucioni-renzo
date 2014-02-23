// Generated by CoffeeScript 1.7.1
var accessToken, allBranchNames, allTimestamps, branch, branchName, branches, branchesUrl, candidateNode, canvasHeight, canvasWidth, colors, commit, commits, commitsUrl, contributors, focusNode, force, forceLayout, getData, graph, graphUpdate, i, indexScale, j, linearLayout, links, margin, metadata, name, nodes, parent, parseLinkHeader, rootUrl, rootUser, scale, sha, svg, tick, timeScale, yScale, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _ref, _ref1, _ref2, _ref3,
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

rootUrl = "https://api.github.com/repos/jsocol/django-waffle/";

rootUser = "jsocol";

contributors = {};

contributors[rootUser] = {};

branchesUrl = "" + rootUrl + "branches?access_token=" + accessToken;

branches = getData(branchesUrl);

for (_i = 0, _len = branches.length; _i < _len; _i++) {
  branch = branches[_i];
  commitsUrl = "" + rootUrl + "commits?sha=" + branch.name + "&per_page=100&access_token=" + accessToken;
  contributors[rootUser][branch.name] = getData(commitsUrl);
}

margin = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10
};

canvasWidth = 1200 - margin.left - margin.right;

canvasHeight = 800 - margin.top - margin.bottom;

svg = d3.select("body").append("svg").attr("width", canvasWidth + margin.left + margin.right).attr("height", canvasHeight + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

graph = {
  nodes: [],
  links: []
};

allBranchNames = [];

allTimestamps = [];

for (name in contributors) {
  branches = contributors[name];
  for (branchName in branches) {
    commits = branches[branchName];
    if (__indexOf.call(allBranchNames, branchName) < 0) {
      allBranchNames.push(branchName);
    }
    for (_j = 0, _len1 = commits.length; _j < _len1; _j++) {
      commit = commits[_j];
      metadata = {
        author: commit.commit.author.name,
        date: new Date(commit.commit.author.date),
        message: commit.commit.message,
        branch: branchName,
        sha: commit.sha,
        htmlUrl: commit.html_url,
        parentShas: (function() {
          var _ref, _results;
          _ref = commit.parents;
          _results = [];
          for (parent in _ref) {
            metadata = _ref[parent];
            _results.push(metadata.sha);
          }
          return _results;
        })()
      };
      if (_ref = metadata.date, __indexOf.call(allTimestamps, _ref) < 0) {
        allTimestamps.push(metadata.date);
      }
      graph.nodes.push(metadata);
    }
  }
}

graph.nodes.sort(function(a, b) {
  return a.date.getTime() - b.date.getTime();
});

_ref1 = d3.range(graph.nodes.length);
for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
  i = _ref1[_k];
  focusNode = graph.nodes[i];
  _ref2 = focusNode.parentShas;
  for (_l = 0, _len3 = _ref2.length; _l < _len3; _l++) {
    sha = _ref2[_l];
    _ref3 = d3.range(graph.nodes.length);
    for (_m = 0, _len4 = _ref3.length; _m < _len4; _m++) {
      j = _ref3[_m];
      candidateNode = graph.nodes[j];
      if (sha === candidateNode.sha && focusNode.sha !== candidateNode.sha) {
        graph.links.push({
          source: j,
          target: i
        });
      }
    }
  }
}

colors = d3.scale.ordinal().domain(allBranchNames).range(colorbrewer.Set3[12]);

yScale = d3.scale.ordinal().domain(allBranchNames).rangeRoundBands([0, canvasHeight], 0.5);

indexScale = d3.scale.linear().domain([0, graph.nodes.length]).rangeRound([0, canvasWidth]);

timeScale = d3.time.scale().domain([d3.min(allTimestamps), d3.max(allTimestamps)]).rangeRound([0, canvasWidth]);

tick = function(d) {
  return graphUpdate(0);
};

forceLayout = function() {
  d3.selectAll("input[name='scale']").attr("disabled", true);
  return force.nodes(graph.nodes).links(graph.links).start();
};

scale = "index";

linearLayout = function() {
  force.stop();
  d3.selectAll("input[name='scale']").attr("disabled", null);
  graph.nodes.forEach(function(d, i) {
    d.y = yScale(d.branch);
    if (scale === "time") {
      return d.x = timeScale(d.date);
    } else {
      return d.x = indexScale(i);
    }
  });
  return graphUpdate(500);
};

graphUpdate = function(delay) {
  nodes.transition().duration(delay).attr("cx", function(d) {
    return d.x = Math.max(5, Math.min(canvasWidth - 5, d.x));
  }).attr("cy", function(d) {
    return d.y = Math.max(5, Math.min(canvasHeight - 5, d.y));
  });
  links.transition().duration(delay).attr("x1", function(d) {
    return d.target.x;
  }).attr("y1", function(d) {
    return d.target.y;
  }).attr("x2", function(d) {
    return d.source.x;
  }).attr("y2", function(d) {
    return d.source.y;
  });
  return nodes.transition().duration(delay).attr("transform", function(d) {
    return "translate(" + d.x + ", " + d.y + ")";
  });
};

force = d3.layout.force().size([canvasWidth, canvasHeight]).charge(-30).linkDistance(10).on("tick", tick).on("start", function(d) {}).on("end", function(d) {});

d3.select("input[value='forceLayout']").on("click", forceLayout);

d3.select("input[value='linearLayout']").on("click", linearLayout);

d3.select("input[value='indexScale']").on("click", function() {
  scale = "index";
  return linearLayout();
});

d3.select("input[value='timeScale']").on("click", function() {
  scale = "time";
  return linearLayout();
});

links = svg.selectAll(".link").data(graph.links).enter().append("line").attr("class", "link");

nodes = svg.selectAll(".node").data(graph.nodes).enter().append("g").attr("class", "node").append("circle").attr("r", 5).style("fill", function(d) {
  return colors(d.branch);
});

links.on("mouseover", function(d, i) {
  return d3.select(this).style("stroke", "red");
});

links.on("mouseout", function(d, i) {
  return d3.select(this).transition().duration(500).style("stroke", "gray");
});

nodes.on("mouseover", function(d, i) {
  d3.select(this).style("fill", "red");
  d3.select("#tooltip").style("left", "" + (d3.event.pageX + 5) + "px").style("top", "" + (d3.event.pageY + 5) + "px");
  d3.select("#author").text(d.author);
  d3.select("#date").text(d.date.toString());
  d3.select("#message").text(d.message);
  d3.select("#sha").text(d.sha);
  d3.select("#branch").text(d.branch);
  return d3.select("#tooltip").classed("hidden", false);
});

nodes.on("mouseout", function(d, i) {
  d3.select(this).transition().duration(500).style("fill", colors(d.branch));
  return d3.select("#tooltip").classed("hidden", true);
});

forceLayout();

linearLayout();
