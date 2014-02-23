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
# Django Waffle is a Django feature flipper
rootUrl = "https://api.github.com/repos/jsocol/django-waffle/"
rootUser = "jsocol"

# Contains commit data, organized by contributor -> branch -> commits; may include forks
contributors = {}

contributors[rootUser] = {}
branchesUrl = "#{rootUrl}branches?access_token=#{accessToken}"
branches = getData(branchesUrl)

for branch in branches
    commitsUrl = "#{rootUrl}commits?sha=#{branch.name}&per_page=100&access_token=#{accessToken}"
    contributors[rootUser][branch.name] = getData(commitsUrl)

# Get forks
# forksUrl = "#{rootUrl}forks?access_token=#{accessToken}"
# forks = getData(forksUrl)

# for fork in forks
#     contributors[fork.owner.login] = {}

#     branchesUrl = "#{fork.url}/branches?access_token=#{accessToken}"
#     branches = getData(branchesUrl)

#     for branch in branches
#         commitsUrl = "#{fork.url}/commits?sha=#{branch.name}&per_page=100&access_token=#{accessToken}"
#         contributors[fork.owner.login][branch.name] = getData(commitsUrl)

# Mike Bostock's margin convention
margin = 
    top:    10, 
    bottom: 10, 
    left:   10, 
    right:  10

canvasWidth = 1200 - margin.left - margin.right
canvasHeight = 800 - margin.top - margin.bottom

svg = d3.select("body").append("svg")
    .attr("width", canvasWidth + margin.left + margin.right)
    .attr("height", canvasHeight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(#{margin.left}, #{margin.top})")

graph = {nodes: [], links: []}

allBranchNames = []
allTimestamps = []
# Populate node array; nodes are encoded with their parents' SHAs
for name, branches of contributors
    for branchName, commits of branches
        if branchName not in allBranchNames
            allBranchNames.push(branchName)
        
        for commit in commits
            metadata =
                author: commit.commit.author.name
                date: new Date(commit.commit.author.date)
                message: commit.commit.message
                branch: branchName
                sha: commit.sha
                htmlUrl: commit.html_url
                parentShas: (metadata.sha for parent, metadata of commit.parents)

            if metadata.date not in allTimestamps
                allTimestamps.push(metadata.date)
            
            graph.nodes.push(metadata)

# Sort by date
graph.nodes.sort((a, b) -> a.date.getTime() - b.date.getTime())

# Process nodes to populate link array
for i in d3.range(graph.nodes.length)
    focusNode = graph.nodes[i]
    for sha in focusNode.parentShas
        for j in d3.range(graph.nodes.length)
            candidateNode = graph.nodes[j]
            if sha == candidateNode.sha and focusNode.sha != candidateNode.sha
                graph.links.push({source: j, target: i})

colors = d3.scale.ordinal()
    .domain(allBranchNames)
    .range(colorbrewer.Set3[12])

yScale = d3.scale.ordinal()
    .domain(allBranchNames)
    .rangeRoundBands([0, canvasHeight], 0.5)

indexScale = d3.scale.linear()
    .domain([0, graph.nodes.length])
    .rangeRound([0, canvasWidth])

timeScale = d3.time.scale()
    .domain([d3.min(allTimestamps), d3.max(allTimestamps)])
    .rangeRound([0, canvasWidth])

tick = (d) ->
    graphUpdate(0)

forceLayout = () ->
    # Disable scale radio buttons
    d3.selectAll("input[name='scale']").attr("disabled", true)

    force.nodes(graph.nodes)
        .links(graph.links)
        .start()

scale = "index"
linearLayout = () ->
    force.stop()
    # Enable scale radio buttons
    d3.selectAll("input[name='scale']").attr("disabled", null)
    graph.nodes.forEach((d, i) -> 
        d.y = yScale(d.branch)
        if scale == "time"
            d.x = timeScale(d.date)
        else
            d.x = indexScale(i)
    )
    graphUpdate(500)

graphUpdate = (delay) ->
    # Makes SVG element borders into "walls" so nodes can't escape
    nodes.transition().duration(delay)
        .attr("cx", (d) -> d.x = Math.max(5, Math.min(canvasWidth - 5, d.x)))
        .attr("cy", (d) -> d.y = Math.max(5, Math.min(canvasHeight - 5, d.y)))

    links.transition().duration(delay)
        .attr("x1", (d) -> d.target.x)
        .attr("y1", (d) -> d.target.y)
        .attr("x2", (d) -> d.source.x)
        .attr("y2", (d) -> d.source.y)

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

links = svg.selectAll(".link")
    .data(graph.links)
    .enter()
    .append("line")
    .attr("class", "link")

nodes = svg.selectAll(".node")
    .data(graph.nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .append("circle")
    .attr("r", 5)
    .style("fill", (d) -> colors(d.branch))

links.on("mouseover", (d, i) -> 
    d3.select(this).style("stroke", "red")
)

links.on("mouseout", (d, i) ->
    d3.select(this).transition().duration(500)
        .style("stroke", "gray")
)

nodes.on("mouseover", (d, i) -> 
    d3.select(this).style("fill", "red")

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
    d3.select("#sha")
        .text(d.sha)
    d3.select("#branch")
        .text(d.branch)
    d3.select("#tooltip").classed("hidden", false)
)

nodes.on("mouseout", (d, i) ->
    d3.select(this).transition().duration(500)
        .style("fill", colors(d.branch))
    d3.select("#tooltip").classed("hidden", true)
)

# Attach nodes and links
forceLayout()
# Default to index-based linear layout ("branched")
linearLayout()
