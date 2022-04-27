# Gas considerations

4.4 million cost with the proxied compound v2, calls the initialization code
2.846 million without the proxy, calls initialization code in constructor
2.00 million without the proxy, does not call init code

800k difference is cost to run init code
1.55 million difference is the cost to deploy open zeppelin proxy contracts one time
can achieve the same functionality without the proxy contracts, but with proxy get to use
one contract's state, i.e. no redo-ing pesky approves

proxy system breaks if deploying strictly more than 2 implementations, upgrade from proxy also has costs

ultimately, i can make the init code/storage costs low enough that the overhead of a proxy is not needed
