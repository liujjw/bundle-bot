# Todo
1. payment, ie how to price bids, check flashbots bundles samples for this, use node gas api (might have to do a coinbase.transfer since geth will first check if balance >= gasPrice * gasLimit )
1.5 some tx still use gasPrice, but need to check if others are specifying maxFeePerGas and tip (we will specify 0 tip and only maxFee)
1.65 we dont even need to transfer ether back, we can directly send ether to miner using calldata
2. correctness, check medium dataset of liquidations for this