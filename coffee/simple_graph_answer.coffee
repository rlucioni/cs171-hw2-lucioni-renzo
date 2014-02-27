parseLinkHeader = (header) ->
    # Deals with absent link headers
    if header is null
        return {}

    values = header.split(',')
    links = {}

    for value in values
        segments = value.split(';')
        url = segments[0].replace(/<(.*)>/, '$1').trim()
        rel = segments[1].replace(/rel="(.*)"/, '$1').trim()
        links[rel] = url

    return links

# Alternative to using d3.json - this allows easy access to request headers
getData = (url) ->
    console.log("Getting data from #{url}")
    request = new XMLHttpRequest()
    # Setting async to false means send() will not return until response received (synchronous)
    request.open('GET', url, false)
    request.send()

    if request.status is 200
        data = JSON.parse(request.responseText)
    else
        throw new Error("#{request.status} #{request.statusText}")

    linkHeader = request.getResponseHeader("Link")
    links = parseLinkHeader(linkHeader)

    # Continue consuming "next" page until there are none left
    if "next" of links
        # Dat recursion
        data = data.concat(getData(links["next"]))

    return data

# Scope-less public access token for Basic Authentication
accessToken = "5e04d069456442ee6b66b2b87d2a28f215789511"

# Mid-size repo; django-waffle is a Django feature flipper whose graph loads quickly
repoName = "django-waffle"
rootUrl = "https://api.github.com/repos/jsocol/django-waffle/"
rootUser = "jsocol"

# Large repos; fetching data and generating the graphs takes a while for these
# NOTE: I've included images of these graphs in img/screenshots, although you can 
#       create them yourself by uncommenting the appropriate information and reloading
# repoName = "d3"
# rootUrl = "https://api.github.com/repos/mbostock/d3/"
# rootUser = "mbostock"

# repoName = "jquery"
# rootUrl = "https://api.github.com/repos/jquery/jquery/"
# rootUser = "jquery"

# repoName = "bootstrap"
# rootUrl = "https://api.github.com/repos/twbs/bootstrap/"
# rootUser = "twbs"

# Contains commit data, organized by contributor -> branch -> commits
contributors = {}

contributors[rootUser] = {}
branchesUrl = "#{rootUrl}branches?access_token=#{accessToken}"
branches = getData(branchesUrl)

# Pull commits from master first, to make it the root (assumes branch "master" exists)
commitsUrl = "#{rootUrl}commits?sha=master&per_page=100&access_token=#{accessToken}"
contributors[rootUser]["master"] = getData(commitsUrl)

for branch in branches
    # We've already pulled commits from master, so we'll ignore it
    if branch.name == "master"
        continue
    commitsUrl = "#{rootUrl}commits?sha=#{branch.name}&per_page=100&access_token=#{accessToken}"
    contributors[rootUser][branch.name] = getData(commitsUrl)

# Get forks - I've decided not to concern myself with forks, but this is how you'd 
# grab the information and load it into the `contributors` object
# forksUrl = "#{rootUrl}forks?access_token=#{accessToken}"
# forks = getData(forksUrl)

# for fork in forks
#     contributors[fork.owner.login] = {}

#     branchesUrl = "#{fork.url}/branches?access_token=#{accessToken}"
#     branches = getData(branchesUrl)

#     for branch in branches
#         commitsUrl = "#{fork.url}/commits?sha=#{branch.name}&per_page=100&access_token=#{accessToken}"
#         contributors[fork.owner.login][branch.name] = getData(commitsUrl)

graph = {nodes: [], links: []}

allBranchNames = []
allTimestamps = []
allAuthors = []
# Populate node array; nodes are encoded with their parents' SHAs
for name, branches of contributors
    for branchName, commits of branches
        if branchName not in allBranchNames
            allBranchNames.push(branchName)
        
        for commit in commits
            # IMPORTANT! EXCLUDES DUPLICATE COMMITS, like GitHub's Network Visualizer;
            # as a result, WE DISPLAY EACH COMMIT ONLY ONCE, prioritizing its appearance 
            # in master. This is a critical part of GitHub's visualization which shows 
            # disparate repositories, and also improves performance significantly.
            # Another way of putting this is that once commits are pulled into master,
            # they are no longer displayed on their own branch.
            duplicate = false
            for storedCommit in graph.nodes
                if commit.sha == storedCommit.sha
                    duplicate = true
                    break
            if duplicate
                continue

            metadata =
                author: commit.commit.author.name
                date: new Date(commit.commit.committer.date)
                message: commit.commit.message
                branch: branchName
                sha: commit.sha
                htmlUrl: commit.html_url
                parentShas: (metadata.sha for parent, metadata of commit.parents)

            if metadata.date not in allTimestamps
                allTimestamps.push(metadata.date)

            if metadata.author not in allAuthors
                allAuthors.push(metadata.author)
            
            graph.nodes.push(metadata)

# Sort commits by date
graph.nodes.sort((a, b) -> a.date.getTime() - b.date.getTime())

# Process nodes to populate link array
for i in d3.range(graph.nodes.length)
    focusNode = graph.nodes[i]
    for parentSha in focusNode.parentShas
        for j in d3.range(graph.nodes.length)
            if i == j
                continue
            candidateNode = graph.nodes[j]
            if parentSha == candidateNode.sha
                graph.links.push({source: j, target: i})

# Mike Bostock's margin convention
margin = 
    top:    10, 
    bottom: 10, 
    left:   10, 
    right:  10

canvasWidth = 1200 - margin.left - margin.right
# Size canvas height so that name labels fit comfortably
# canvasHeight = allBranchNames.length * 70 - margin.top - margin.bottom
canvasHeight = allAuthors.length * 20 - margin.top - margin.bottom

title = d3.select("body").append("div")
    .attr("id", "title")
    .text("The #{repoName} network graph")
    
svg = d3.select("body").append("svg")
    .attr("width", canvasWidth + margin.left + margin.right)
    .attr("height", canvasHeight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(#{margin.left}, #{margin.top})")

# I'm coloring AND arranging rows by author. It's trivial to order and/or 
# color by branch (I've left code to do that commented out), but coloring 
# and grouping commits by author is depicted in the homework spec, and I 
# also think it makes the visualization a little easier to decipher when 
# applied to large repositories.
colors = d3.scale.ordinal()
    .domain(allAuthors)
    .range(colorbrewer.Set3[12])

yScale = d3.scale.ordinal()
    # .domain(allBranchNames)
    .domain(allAuthors)
    .rangeRoundBands([0, canvasHeight], 0.5)

indexScale = d3.scale.linear()
    .domain([0, graph.nodes.length])
    .rangeRound([150, canvasWidth])

timeScale = d3.time.scale()
    .domain([d3.min(allTimestamps), d3.max(allTimestamps)])
    .rangeRound([150, canvasWidth])

tick = (d) ->
    graphUpdate(0)

forceLayout = () ->
    # Disable scale radio buttons
    d3.selectAll("input[name='scale']").attr("disabled", true)
    # Hide labels
    labels.attr("visibility", "hidden")
    force.start()

scale = "index"
linearLayout = () ->
    force.stop()
    # Enable scale radio buttons
    d3.selectAll("input[name='scale']").attr("disabled", null)
    # Show labels
    labels.attr("visibility", "visible")
    graph.nodes.forEach((d, i) -> 
        # d.y = yScale(d.branch)
        d.y = yScale(d.author)
        if scale == "time"
            d.x = timeScale(d.date)
        else
            d.x = indexScale(i)
    )
    graphUpdate(500)

line = d3.svg.line()
    .x((d) -> d.x)
    .y((d) -> d.y)

graphUpdate = (delay) ->
    # Makes SVG element borders into "walls" so nodes can't escape
    nodes.transition().duration(delay)
        .attr("cx", (d) -> d.x = Math.max(5, Math.min(canvasWidth - 5, d.x)))
        .attr("cy", (d) -> d.y = Math.max(5, Math.min(canvasHeight - 5, d.y)))

    links.transition().duration(delay)
        .attr("d", (d) -> line([
            {x: d.source.x, y: d.source.y},
            {x: d.source.x, y: d.target.y}, 
            {x: d.target.x, y: d.target.y}
        ]))

    nodes.transition().duration(delay)
        .attr("transform", (d) -> "translate(#{d.x}, #{d.y})")

# Generate force layout
force = d3.layout.force()
    .size([canvasWidth, canvasHeight])
    .charge(-30)
    .linkDistance(10)
    .on("tick", tick)
    .on("start", (d) -> )
    .on("end", (d) -> )
    .nodes(graph.nodes)
    .links(graph.links)

d3.select("input[value='forceLayout']").on("click", forceLayout)
d3.select("input[value='linearLayout']").on("click", linearLayout)

d3.select("input[value='indexScale']").on("click", () ->
    scale = "index"
    linearLayout()
)
d3.select("input[value='timeScale']").on("click", () ->
    scale = "time"
    linearLayout()
)

# Define arrow markers
svg.append("svg:defs").selectAll("marker")
    .data(["end"])
    .enter().append("svg:marker")
    .attr("fill", "gray")
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", -1.5)
    .attr("markerWidth", 4)
    .attr("markerHeight", 4)
    .attr("orient", "auto")
    .append("svg:path")
    .attr("class", "arrowhead")
    .attr("d", "M0,-5L10,0L0,5")

# Use paths to draw links
links = svg.append("svg:g").selectAll("path")
    .data(force.links())
    .enter().append("svg:path")
    .attr("class", "link")
    .attr("marker-end", "url(#end)");

nodes = svg.selectAll(".node")
    .data(force.nodes())
    .enter().append("g")
    .attr("class", "node")
    .append("circle")
    .attr("r", 5)
    .style("fill", (d) -> colors(d.author))
    # .call(force.drag)

labels = svg.selectAll("text")
    # .data(allBranchNames)
    .data(allAuthors)
    .enter().append("text")
    .attr("x", 0)
    .attr("y", (d) -> yScale(d))
    .text((d) -> d)
    .attr("visibility", "visible")

nodes.on("mouseover", (d, i) ->
    d3.select(this).style("fill", "red")
    # Fade other branches
    nodes.style("opacity", (nodeData) ->
        if nodeData.branch != d.branch
            return 0.4
    )

    d3.select("#tooltip")
        # Position tooltip southeast of pointer
        .style("left", "#{d3.event.pageX + 5}px")
        .style("top", "#{d3.event.pageY + 5}px")
    d3.select("#author")
        .text(d.author)
    d3.select("#date")
        .text(d.date.toString())
    d3.select("#message")
        .text(d.message)
    d3.select("#branch")
        .text(d.branch)
    d3.select("#sha")
        .text(d.sha)
    d3.select("#tooltip").classed("hidden", false)
)

nodes.on("mouseout", (d, i) ->
    # Restore appropriate color
    d3.select(this).style("fill", () -> colors(d.author))
    nodes.transition().duration(500).style("opacity", "1")
    d3.select("#tooltip").classed("hidden", true)
)

# Attach nodes and links
forceLayout()
# Default to index-based linear layout ("branched")
linearLayout()
