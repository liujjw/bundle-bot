## Auction Bid Pricing 
### 95% rule 
We assume up to 95% profit spent on MEV. (TODO) We can check `Ethtx.info` (Ethereum transaction decoder) and samples (could graph this) of flashbots bundles for dollar reward (a function of coinbase reward AND ETH price at the time) as a function of dollar profit made to verify the 95% rule (but remember that post EIP-1559, there is also a basefee that is burned and not recorded). 
### Losing to more efficient searchers competing for the same liquidation
Consider searcher A who only needs 500k gas and searcher B who needs 1 million gas for a liquidation. The liquidation profit is 10k USD. Searcher A spends 5k USD on gas tip, so their gas price would be say 100 (we ignore converting to ETH for gas and the ETH price). Searcher B would need to spend 10k on gas tip, to match the gas price of 100. If searcher A spends 6k on the gas tip, searcher B would be unable to compete and searcher A would win the bid and still make a profit of 4k. The factor for how much more it would cost for the less gas efficient searcher is `(gas_used_b / gas_used_a)`. The site `https://dashboard.tenderly.co/explorer` has a gas profiler, and it says that of the estimated 1.3 million gas upper bound it takes for a liquidation in my system, 200k of the gas is spent on flashloaning, about 500k is actually spent on calling the `liquidateBorrow()` function, and the rest is (probably) spent on swapping. So in reality, the 500k vs 1 million gas example is pretty close to the truth.
### Losing to more efficient searchers who are arbitraging other opportunities
If there are even more efficient searchers who are doing other arbitrage but not liquidations, then even though their more gas efficient bundles would push out the liquidation bundle, there is space and time to include the liquidation in the next `n` blocks, asssuming the liquidation bundle is the most efficient liquidation bundle out of all the competing liquidation bundles. 
### Gas refunds
Gas tokens are still a thing. To compete, we would need to have our own capital to not have to swap and flashloan. Otherwise maybe gas refunds can help. Assume I win with gas refund, how much does that cut into profit? (TODO)
### Gas efficient contracts
(TODO) make contract more gas efficient. 
### block.coinbase.transfer
(TODO) Send transfer amount in calldata. Specify 0 tip (0 `maxPriorityFeePerGas`) and `maxFeePerGas == baseFee * x` where `x` is the typical factor.
### Gas API for basefee
Blocknative has one. (TODO)

## Testing 
### Backtest
(TODO) Check medium dataset of liquidations for this, also refactor some shitty code, test for using flashbots infra, also need to backrun post param updates, i dont pay for these tx tho, the sender does, use the testnet 

### handle all todos and todo2 (designate as todo2 to triage todos, todo2 are less important), also to some extent similar to open issues

## Prod
`docker-compose up`

## Test env assumptions
`npm test` to test: change env variables in `package.json` as needed to start services automatically. The mempool lurker relies on `geth.ipc`, so it must have access to the filesystem containing that socket. Access to Redis on localhost at appropriate test ports. 