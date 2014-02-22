canvasWidth = 900
canvasHeight = 700

svg = d3.select("body").append("svg")
    .attr("width", canvasWidth)
    .attr("height", canvasHeight)

# Use 10 colors from ColorBrewer Set3
fill = d3.scale.ordinal()
    .domain(d3.range(10))
    .range(colorbrewer.Set3[10])

graph = {nodes: [], links: []}

numNodes = 100
numCats = 10

graph.nodes = d3.range(numNodes)
    .map(() -> {cat: Math.floor(numCats*Math.random())})

graph.nodes.map((d, i) ->
    graph.nodes.map((e, j) ->
        if Math.random() > 0.99 and i != j
            graph.links.push({source: i, target: j})
    )
)

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

# Using a public access (scopeless) token for Basic Authentication
accessToken = "5e04d069456442ee6b66b2b87d2a28f215789511"
# Django Waffle is a Django feature flipper
rootUrl = "https://api.github.com/repos/jsocol/django-waffle/"
rootUser = "jsocol"

# Will contain commit data, organized by contributor -> branch -> commits; includes forks
contributors = {}

contributors[rootUser] = {}
branchesUrl = "#{rootUrl}branches?access_token=#{accessToken}"
branches = getData(branchesUrl)

for branch in branches
    commitsUrl = "#{rootUrl}commits?sha=#{branch.name}&per_page=100&access_token=#{accessToken}"
    contributors[rootUser][branch.name] = getData(commitsUrl)

# Get forks
forksUrl = "#{rootUrl}forks?access_token=#{accessToken}"
forks = getData(forksUrl)

for fork in forks
    contributors[fork.owner.login] = {}

    branchesUrl = "#{fork.url}/branches?access_token=#{accessToken}"
    branches = getData(branchesUrl)

    for branch in branches
        commitsUrl = "#{fork.url}/commits?sha=#{branch.name}&per_page=100&access_token=#{accessToken}"
        contributors[fork.owner.login][branch.name] = getData(commitsUrl)

console.log contributors

tick = (d) ->
    graphUpdate(0)

randomLayout = () ->
    force.stop()

    graph.nodes.forEach((d, i) -> 
        d.x = canvasWidth/4 + 2*canvasWidth*Math.random()/4
        d.y = canvasHeight/4 + 2*canvasHeight*Math.random()/4
    )

    graphUpdate(500)

forceLayout = () ->
    force.nodes(graph.nodes)
        .links(graph.links)
        .start()

lineLayout = () ->
    force.stop()

    graph.nodes.forEach((d, i) ->
        d.y = canvasHeight/2
    )

    graphUpdate(500)

lineCatLayout = () ->
    force.stop()

    graph.nodes.forEach((d, i) ->
        d.y = canvasHeight/2 + d.cat*20
    )

    graphUpdate(500)

radialLayout = () ->
    force.stop()

    r = canvasHeight/2

    arc = d3.svg.arc().outerRadius(r)

    pie = d3.layout.pie()
        .sort((a, b) -> a.cat - b.cat)
        # equal share for each point
        .value((d, i) -> 1)

    graph.nodes = pie(graph.nodes).map((d, i) -> 
        d.innerRadius = 0
        d.outerRadius = r
        d.data.x = arc.centroid(d)[0] + canvasHeight/2
        d.data.y = arc.centroid(d)[1] + canvasWidth/2
        d.data.endAngle = d.endAngle 
        d.data.startAngle = d.startAngle 
        return d.data
    )

    graphUpdate(500)

categoryColor = () ->
    d3.selectAll("circle")
        .transition()
        .duration(500)
        .style("fill", (d) -> fill(d.cat))

categorySize = () ->
    d3.selectAll("circle")
        .transition()
        .duration(500)
        .attr("r", (d) -> Math.sqrt((d.cat + 1) * 10))

graphUpdate = (delay) ->
    link.transition().duration(delay)
        .attr("x1", (d) -> d.target.x)
        .attr("y1", (d) -> d.target.y)
        .attr("x2", (d) -> d.source.x)
        .attr("y2", (d) -> d.source.y)

    node.transition().duration(delay)
        .attr("transform", (d) -> "translate(#{d.x}, #{d.y})")

# Generate the force layout
force = d3.layout.force()
    .size([canvasWidth, canvasHeight])
    .charge(-50)
    .linkDistance(10)
    .on("tick", tick)
    .on("start", (d) -> )
    .on("end", (d) -> )

d3.select("input[value='force']").on("click", forceLayout)
d3.select("input[value='random']").on("click", randomLayout)
d3.select("input[value='line']").on("click", lineLayout)
d3.select("input[value='line_cat']").on("click", lineCatLayout)
d3.select("input[value='radial']").on("click", radialLayout)

d3.select("input[value='nocolor']").on("click", () ->
    d3.selectAll("circle").transition().duration(500).style("fill", "#66CC66")
)

d3.select("input[value='color_cat']").on("click", categoryColor)

d3.select("input[value='nosize']").on("click", () ->
    d3.selectAll("circle").transition().duration(500).attr("r", 5)
)

d3.select("input[value='size_cat']").on("click", categorySize)

link = svg.selectAll(".link")
    .data(graph.links)
    .enter()
    .append("line")
    .attr("class", "link")

node = svg.selectAll(".node")
    .data(graph.nodes)
    .enter()
    .append("g")
    .attr("class", "node")

node.append("circle").attr("r", 5).attr("stroke", "gray")

forceLayout()
