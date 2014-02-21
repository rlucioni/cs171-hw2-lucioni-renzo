### Dealing with "Bursted" Commits ###

We're asked to address the issue of many new commits being pushed in a short time interval (i.e., "bursted") for each of the repository statistics visualizations that GitHub provides. However, my answer is consistent across all of GitHub's visualization types, so I'll answer it once, here.

Even though the visualizations GitHub provides are updated over time, they should not be updated immediately, especially when many commits are pushed in a short time interval. Having the visualization undergo frequent and sudden changes would confuse users, and computing repository statistics is likely an expensive operation. My solution to the issue of bursted commits would be to only use cached data when building my visualizations. That is, I would only query for fresh repository statistics once every hour, and save this data for repeated use without needing to query the API again. Doing this would ensure consistent visualizations, prevent jarring changes, and avoid the need to frequently recompute repository statistics.


### Contributors ###

#### Audience ####

The "Contributors" visualization is most likely intended for visitors interested in seeing who a repository's most active contributors are. Contributors themselves might also find this visualization useful when trying to compare their impact on the project to that of other contributors. In addition, project managers might find the visualization's brushing functionality useful when trying to understand who was primarily responsible for implementing parts of the project during a certain time period.

#### Data ####

This visualization relies on a series of collections of weekly counts of additions, deletions, and commits. There is one such collection, accompanied by a total count of commits authored, for each contributor. The data for the D3 repository's "Contributors" visualization can be accessed by querying the GitHub API as follows: `https://api.github.com/repos/mbostock/d3/stats/contributors`.


### Commit Activity ###

#### Audience ####

The "Commit Activity" visualization is most likely intended for visitors and project users interested in seeing how active a repository has been over the last year.

#### Data ####

This visualization uses a series of weekly counts of commits pushed to the repository in the last year. Each weekly count is broken down by day, with each commit from that week being placed into the appropriate one of seven buckets corresponding to the days of the week. The data for the D3 repository's "Commit Activity" visualization can be accessed by querying the GitHub API as follows: `https://api.github.com/repos/mbostock/d3/stats/commit_activity`.


### Code Frequency ###

#### Audience ####

The "Code Frequency" visualization is most likely intended for visitors and contributors interested in seeing how the project's body of code has evolved over time.

#### Data ####

This visualization uses a collection of weekly aggregates of the number of additions and deletions pushed to the repository. The data for the D3 repository's "Code Frequency" visualization can be accessed by querying the GitHub API as follows: `https://api.github.com/repos/mbostock/d3/stats/code_frequency`.


### Punchcard ###

#### Audience ####

The "Punchcard" visualization is most likely intended for project managers interested in seeing at what time of day their project is being worked on most often.

#### Data ####

This visualization uses a collection of counts of commits per hour in each day of the week. The data for the D3 repository's "Punchcard" visualization can be accessed by querying the GitHub API as follows: `https://api.github.com/repos/mbostock/d3/stats/punch_card`.


### Pulse ###

#### Audience ####

The "Pulse" visualization gives a general overview of a repository's status during a handful of time frames, displaying a summary of new and merged pull requests, open and closed issues, and commits authored by contributors. As such, this visualization is most likely intended for project managers. It may also be appropriate for visitors, contributors, and project users interested in getting a general sense of a project's state.

#### Data ####

This visualization uses a variety of different data types - we'll consider each in turn. First, the visualization uses counts of the number of proposed and merged pull requests. Data on the D3 repository's *open* pull requests can be accessed by querying the GitHub API as follows: `https://api.github.com/repos/mbostock/d3/pulls?state=open`. This data should be filtered by date by reading each object's `created_at` field. Data on the D3 repository's *closed* pull requests can be accessed by querying the GitHub API as follows: `https://api.github.com/repos/mbostock/d3/pulls?state=closed`. This data should be filtered by *merged* pull requests by ignoring those objects whose `merged_at` field is `null`; the data on merged pull requests should be filtered by date by reading each object's `merged_at` field

The visualization also uses counts of the number of open and closed issues. Data on the D3 repository's *open* issues can be accessed by querying the GitHub API as follows: `https://api.github.com/repos/mbostock/d3/issues?state=open`. This data should be filtered by date by reading each object's `created_at` field. Data on the D3 repository's *closed* issues can be accessed by querying the GitHub API as follows: `https://api.github.com/repos/mbostock/d3/issues?state=closed`. This data should be filtered by date by reading each object's `closed_at` field.

The "Pulse" visualization also uses a simple bar graph to display commits authored by contributors. Data on commits pushed to the D3 repository since the timestamp `YYYY-MM-DDTHH:MM:SSZ` can be accessed by querying the GitHub API as follows: `https://api.github.com/repos/mbostock/d3/commits?since=YYYY-MM-DDTHH:MM:SSZ`. This data can be filtered by `author` and tallied for each contributor.


### Calendar Map ###

#### Audience ####

The "Calendar Map" visualization is most likely intended for visitors to a user's profile who are curious about that user's activity.

#### Data ####

This visualization uses a univariate time series consisting of daily commit counts for a single user. We could get the data for my own "Calendar Map" by first querying the GitHub API for all of my public repositories, performed as follows: `https://api.github.com/users/rlucioni/repos`. Assuming I am the authenticated user, we could query the GitHub API for all of my repositories (public and private) as follows: `https://api.github.com/user/repos`. For the sake of completeness, it would also be good to query the GitHub API for my public organization memberships, performed as follows: `https://api.github.com/users/rlucioni/orgs`. Again assuming I am the authenticated user, we could query the GitHub API for all of my organization memberships (public and private) as follows: `https://api.github.com/user/orgs`. We would then query the GitHub API for a list of repositories belonging to these organizations, performed for each organization as follows: `https://api.github.com/orgs/:org/repos`.

Next, for the repositories found above, we would query the GitHub API for all commits authored by me, performed for each repository as follows: `https://api.github.com/repos/:owner/:repo/commits?author=rlucioni`. Finally, we would construct an object containing a field set to 0 for every day in the last year, then loop through my commits and increment the value stored at the field corresponding to the date each commit was authored. The result would be an object associating every day in the last year with the number of commits authored by me on each day.


### Network Graph ###

#### Audience ####

The GitHub network graph is most likely intended for contributors who are interested in keeping track of what other contributors have done or finding a specific branch to develop on.

#### Data ####

This visualization uses commit data from all branches in the current repository. The data used to construct the D3 repository's network graph can be accessed by first querying the GitHub API for all branches in the repository, performed as follows: `https://api.github.com/repos/mbostock/d3/branches`. Next, we query the GitHub API for the commits from each of the branch names returned by the previous API call. We do this as follows: `https://api.github.com/repos/mbostock/d3/commits?sha=<branch name>`.

Due to the way Git works, commits returned using this method are paginated based on SHA instead of page number; that is, the SHA is used as the page number. To access the next page of results, we can use the links returned in the request headers, as described [here](http://developer.github.com/guides/traversing-with-pagination/). We can achieve the same result by iterating along each branch, starting from the branch's latest SHA (e.g., `https://api.github.com/repos/mbostock/d3/commits?sha=<branch name>`) and moving backwards in the branch's history by using the SHA of the last commit returned by the previous API call as the argument to the `last_sha` field in the subsequent API call (e.g., `https://api.github.com/repos/mbostock/d3/commits?last_sha=<SHA of last commit>`). We continue in this manner until the SHA of the last commit returned matches the current API call's `last_sha` value.

#### Role of Interaction ####

Interaction plays a limited role in GitHub's network graph. Hovering over a node in the graph will reveal a tooltip listing the corresponding commit's author, SHA, and commit message. Clicking a node will take you to the corresponding commit in a new window. Clicking and dragging allows you to translate the graph left, right, up, and down. Typing `t` toggles the tags containing the branch names.

While interaction plays a limited role in the network graph, the ability to hover over a node to summon an informative tooltip is critical to making this visualization useful. As such, I do not think that a static, non-interactive graph would have been sufficient. Using a static graph would have required hiding or showing all commit information at once; the former would result in a useless graph, and the latter would result in a cluttered and hard-to-read graph.

#### Many New Contributors ####

Many new contributors pushing commits for the first time means many new branches in a project's network graph. I would preserve the readbility of the graph in this situation by spacing out the graph's branches to make room for the new branches, preventing the graph from becoming too dense. As it stands, GitHub's network graph achieves this by expanding the graph vertically, growing downwards by giving each new contributor their own row in the graph.
