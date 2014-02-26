**NOTE: My work from Design Studio 1 can be found in [`design-studio-1-solutions.pdf`](design-studio-solutions.pdf). I've taken Problem 3 as an opportunity to refine my thinking from the design studio.**


1. Referring to the Lee et al. reading, I think that an ideal GitHub Network Graph needs to address the following graph-related tasks, ranked in order of importance:
    - Scan: to allow a user, most likely a project contributor, to quickly review a list of commits
    - Follow Path: to trace the history of a series of commits
    - Revisit: to return to the commit at the end of an explored path, in order to follow other paths branching from this node, if they exist
    - Filter: to find commits that meet a certain set of search parameters, such as a date range
    - Sort: to order commits by metadata characteristics, such as additions or deletions, net commit size, or date authored

    In short, I think that an ideal GitHub Network Graph needs to prioritize Browsing and Overview tasks.


2. I've tested my implementation of Problem 2 on the D3, jQuery, and Bootstrap repositories. Screenshots of the resulting visualizations can be found [here](img/screenshots), arranged both by author and by branch. As mentioned in my comments from [`simple_graph.coffee`](simple_graph.coffee), my implementation of Problem 2 both arranges and colors nodes by author, since this is what was depicted in the homework spec, and also helps when attempting to decipher the visualization after it has been applied to a large repository. However, I also experimented with arranging nodes by branch - the screenshots are evidence of that, as is some of the code I've left commented out in [`simple_graph.coffee`](simple_graph.coffee).

    Contributors to the D3, jQuery, and Bootstrap repositories seem to exhibit similar interaction patterns, specifically in terms of their commit behavior. In each repository, a handful of contributors seem to lead the project, pushing commits in a very regular fashion. A large group of minor, satellite contributors "orbit" around these lead contributors. The satellite contributors push small numbers of commits, often consisting of one-off fixes. These commits are then pulled into the main project by the lead contributors.


3. The behavior of the lead contributors described above causes several rows of the visualization to contain large, densely packed collections of nodes which appear almost like solid lines. Looking for these dense clusters is a good way of finding a project's lead contributors. For example, in the D3 repository, these are Mike Bostock and Jason Davies; in the jQuery repository, these are John Resig, Brandon Aaron, and more recently Dave Methvin and Rick Waldron; and in the Bootstrap repository, these are Mark Otto, Chris Rebert, and Jacob Thornton.

    The projects' satellite contributors appear only a few times each in the visualizations. However, the jQuery and Bootstrap repositories contain thousands of commits from hundreds of different satellite contributors. This causes my graph visualization to stretch vertically in order to comfortably accommodate the commit author labels found on the left axis; in the case of the Bootstrap repository, my graph is more than 7000 pixels in height. As a result, a user of the visualization cannot view the graph in its entirety, since zooming out in the browser causes small details to be lost; the user is forced to scroll often when studying the graph.

    Another effect of attempting to visualize the more complex commit data of the kind found in the D3, jQuery, and Bootstrap repositories is that the network's links immediately become useless. The links can help trace a commit's history in a small graph because they are easily discernible. However, in a more complex graph, the links become dense and tangled, and cannot be traced easily.

    Finally, displaying so many commits at once incurs a significant performance hit on D3 and the browser. The result is extremely laggy interaction and a generally unpleasant experience.


**NOTE: My answer below, combined with my answer to #3, constitutes the requested "paragraph explaining the design decisions [I] made." I will not be attaching any separate paragraphs. As requested, I've included a sketch of the icicle design described below; the file is named [`problem_3_sketch.pdf`](problem_3_sketch.pdf).**

4. I think the best approach to dealing with more complex commit data of the kind found in the D3, jQuery, and Bootstrap repositories begins by somehow simplifying the information. Grouping together (i.e., aggregating) unbroken chronological chains of commits by the same author into proportionally larger single nodes will go a long way towards simplifying the data and cutting down on the number of nodes displayed. This will improve the performance, usability, and above all usefulness of the visualization by allowing users to more quickly gain an overview of a repository's history.
    
    The next step is dealing with the links. They exist in the current implementation of Problem 2 to help us trace the history of a commit; there's no weight or other value associated with the links. In dealing with more complex commit histories, the links become dense, tangled, hard to trace, and as a result, useless. As such, I think it would be best to get rid of the links and use an area-based tree layout to convey commit history. An area-based tree layout such as an icicle should allow us to understand a repository's history at a glance, and will allow us to can trace a particular commit's history simply by looking at its neighbors.
