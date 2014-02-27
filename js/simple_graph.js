// Generated by CoffeeScript 1.7.1
var accessToken, allAuthors, allBranchNames, allTimestamps, branch, branchName, branches, branchesUrl, candidateNode, canvasHeight, canvasWidth, colors, commit, commits, commitsUrl, contributors, duplicate, focusNode, force, forceLayout, getData, graph, graphUpdate, i, indexScale, j, labels, line, linearLayout, links, margin, metadata, name, nodes, parent, parentSha, parseLinkHeader, repoName, rootUrl, rootUser, scale, storedCommit, svg, tick, timeScale, title, yScale, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _m, _n, _ref, _ref1, _ref2, _ref3, _ref4, _ref5,
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
        date: new Date(commit.commit.author.date),
        message: commit.commit.message,
        branch: branchName,
        sha: commit.sha,
        htmlUrl: commit.html_url,
        parentShas: (function() {
          var _ref1, _results;
          _ref1 = commit.parents;
          _results = [];
          for (parent in _ref1) {
            metadata = _ref1[parent];
            _results.push(metadata.sha);
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

_ref3 = d3.range(graph.nodes.length);
for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
  i = _ref3[_l];
  focusNode = graph.nodes[i];
  _ref4 = focusNode.parentShas;
  for (_m = 0, _len4 = _ref4.length; _m < _len4; _m++) {
    parentSha = _ref4[_m];
    _ref5 = d3.range(graph.nodes.length);
    for (_n = 0, _len5 = _ref5.length; _n < _len5; _n++) {
      j = _ref5[_n];
      if (i === j) {
        continue;
      }
      candidateNode = graph.nodes[j];
      if (parentSha === candidateNode.sha) {
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

title = d3.select("body").append("div").attr("id", "title").text("The " + repoName + " network graph");

svg = d3.select("body").append("svg").attr("width", canvasWidth + margin.left + margin.right).attr("height", canvasHeight + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

colors = d3.scale.ordinal().domain(allAuthors).range(colorbrewer.Set3[12]);

yScale = d3.scale.ordinal().domain(allAuthors).rangeRoundBands([0, canvasHeight], 0.5);

indexScale = d3.scale.linear().domain([0, graph.nodes.length]).rangeRound([150, canvasWidth]);

timeScale = d3.time.scale().domain([d3.min(allTimestamps), d3.max(allTimestamps)]).rangeRound([150, canvasWidth]);

tick = function(d) {
  return graphUpdate(0);
};

forceLayout = function() {
  d3.selectAll("input[name='scale']").attr("disabled", true);
  labels.attr("visibility", "hidden");
  return force.start();
};

scale = "index";

linearLayout = function() {
  force.stop();
  d3.selectAll("input[name='scale']").attr("disabled", null);
  labels.attr("visibility", "visible");
  graph.nodes.forEach(function(d, i) {
    d.y = yScale(d.author);
    if (scale === "time") {
      return d.x = timeScale(d.date);
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
  nodes.transition().duration(delay).attr("cx", function(d) {
    return d.x = Math.max(5, Math.min(canvasWidth - 5, d.x));
  }).attr("cy", function(d) {
    return d.y = Math.max(5, Math.min(canvasHeight - 5, d.y));
  });
  links.transition().duration(delay).attr("d", function(d) {
    return line([
      {
        x: d.source.x,
        y: d.source.y
      }, {
        x: d.source.x,
        y: d.target.y
      }, {
        x: d.target.x,
        y: d.target.y
      }
    ]);
  });
  return nodes.transition().duration(delay).attr("transform", function(d) {
    return "translate(" + d.x + ", " + d.y + ")";
  });
};

force = d3.layout.force().size([canvasWidth, canvasHeight]).charge(-30).linkDistance(10).on("tick", tick).on("start", function(d) {}).on("end", function(d) {}).nodes(graph.nodes).links(graph.links);

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

svg.append("svg:defs").selectAll("marker").data(["end"]).enter().append("svg:marker").attr("fill", "gray").attr("id", String).attr("viewBox", "0 -5 10 10").attr("refX", 15).attr("refY", -1.5).attr("markerWidth", 4).attr("markerHeight", 4).attr("orient", "auto").append("svg:path").attr("class", "arrowhead").attr("d", "M0,-5L10,0L0,5");

links = svg.append("svg:g").selectAll("path").data(force.links()).enter().append("svg:path").attr("class", "link").attr("marker-end", "url(#end)");

nodes = svg.selectAll(".node").data(force.nodes()).enter().append("g").attr("class", "node").append("circle").attr("r", 5).style("fill", function(d) {
  return colors(d.author);
});

labels = svg.selectAll("text").data(allAuthors).enter().append("text").attr("x", 0).attr("y", function(d) {
  return yScale(d);
}).text(function(d) {
  return d;
}).attr("visibility", "visible");

nodes.on("mouseover", function(d, i) {
  d3.select(this).style("fill", "red");
  nodes.style("opacity", function(nodeData) {
    if (nodeData.branch !== d.branch) {
      return 0.4;
    }
  });
  d3.select("#tooltip").style("left", "" + (d3.event.pageX + 5) + "px").style("top", "" + (d3.event.pageY + 5) + "px");
  d3.select("#author").text(d.author);
  d3.select("#date").text(d.date.toString());
  d3.select("#message").text(d.message);
  d3.select("#branch").text(d.branch);
  d3.select("#sha").text(d.sha);
  return d3.select("#tooltip").classed("hidden", false);
});

nodes.on("mouseout", function(d, i) {
  d3.select(this).style("fill", function() {
    return colors(d.author);
  });
  nodes.transition().duration(500).style("opacity", "1");
  return d3.select("#tooltip").classed("hidden", true);
});

forceLayout();

linearLayout();
