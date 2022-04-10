exports.mochaGlobalSetup = async function() {
    if (process.env.REDIS_STARTED === "false") {
        assert(shell.exec(`docker run --name myredis -d -p ${TestConstants.ENDPOINTS.REDIS_PORT}:${TestConstants.ENDPOINTS.REDIS_PORT} -v /d/redis_0:/data redis redis-server --save 60 1 --loglevel warning`).code === 0);
        console.log('redis started');
    }
    
    if (process.env.DB_READY === "false") {
        let provider = new ethers.providers.AlchemyProvider(1, process.env.ALCHEMY_KEY);;
        let store = makeStoreWithProvider(provider, TestConstants.ENDPOINTS.REDIS_PORT_2);
        await store.setCompoundAccounts(TestConstants.FORK.blockNumber);
        await store.setCompoundParams();
        console.log('db has been set');
    }

    if (process.env.LOCAL_NODE_STARTED === "false") {
        // needs to be async since the node continues to run
        shell.exec(`FORK_BLOCKNUMBER=${TestConstants.FORK.blockNumber} npx -c 'hardhat node'`, {async:true});
        await sleep(TestConstants.PARAMS.NODE_STARTUP_TIME_MS);
        console.log("node started");
    }

    if (process.env.BOT_DEPLOYED === "false") {
        assert(shell.exec(`npx hardhat deploy`).code === 0);
        console.log("bot contract deployed");
    }
}