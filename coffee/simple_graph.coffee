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

getData = (url) ->
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

console.log contributors

# Mike Bostock's margin convention
margin = 
    top:    10, 
    bottom: 10, 
    left:   10, 
    right:  10

canvasWidth = 1000 - margin.left - margin.right
canvasHeight = 700 - margin.top - margin.bottom

svg = d3.select("body").append("svg")
    .attr("width", canvasWidth + margin.left + margin.right)
    .attr("height", canvasHeight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(#{margin.left}, #{margin.top})")

allBranchNames = []
for name, branches of contributors
    for branchName of branches
        if branchName not in allBranchNames
            allBranchNames.push(branchName)

colors = d3.scale.ordinal()
    .domain(allBranchNames)
    .range(colorbrewer.Set3[12])

yScale = d3.scale.ordinal()
    .domain(allBranchNames)
    .rangeRoundBands([0, canvasHeight], 0.5)

graph = {nodes: [], links: []}

# Populate node array; nodes are encoded with their parents' SHAs
for name, branches of contributors
    for branch, commits of branches
        for commit in commits
            metadata =
                author: commit.commit.author.name
                # ISO 8601 timestamp
                date: commit.commit.author.date
                message: commit.commit.message
                branch: branch
                sha: commit.sha
                htmlUrl: commit.html_url
                parentShas: (metadata.sha for parent, metadata of commit.parents)
            
            graph.nodes.push(metadata)

# Process nodes to populate link array
for i in d3.range(graph.nodes.length)
    focusNode = graph.nodes[i]
    for sha in focusNode.parentShas
        for j in d3.range(graph.nodes.length)
            candidateNode = graph.nodes[j]
            if sha == candidateNode.sha and focusNode.sha != candidateNode.sha
                graph.links.push({source: j, target: i})

console.log("nodes: #{graph.nodes.length}, links: #{graph.links.length}")

indexScale = d3.scale.linear()
    .domain([0, graph.nodes.length])
    .range([0, canvasWidth])

tick = (d) ->
    graphUpdate(0)

forceLayout = () ->
    force.nodes(graph.nodes)
        .links(graph.links)
        .start()

linearLayout = () ->
    force.stop()
    graph.nodes.forEach((d, i) -> 
        d.y = yScale(d.branch)
        # d.x = indexScale(i)
    )
    graphUpdate(500)

graphUpdate = (delay) ->
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
)

nodes.on("mouseout", (d, i) ->
    d3.select(this).transition().duration(500)
        .style("fill", colors(d.branch))
)

forceLayout()
linearLayout()
