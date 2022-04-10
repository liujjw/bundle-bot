exports.FORK = {
    // eth price falls from 4k to 1.7k
    date: "2021-05-23T12:59:00Z",
    blockNumber: 12490660
}

exports.FORK_2 = {
    blockNumber: 12462649
}

exports.FORK_3 = {
    // see test for reserializing blocknative pending tx
    blockNumber: 12768036,
    tx_1: {
        "status": "pending",
        "monitorId": "GETH_1_F_PROD",
        "monitorVersion": "0.87.12",
        "pendingTimeStamp": "2021-07-05T14:31:35.030Z",
        "pendingBlockNumber": 12768036,
        "hash": "0x80286b29f3d6243458e1254ef7e19ba94df620a11fad37594cf093c5c7aeab83",
        "from": "0xddEB598fe902A13Cc523aaff5240e9988eDCE170",
        "to": "0x37bC7498f4FF12C19678ee8fE19d713b87F6a9e6",
        "value": "0",
        "gas": 500000,
        "gasPrice": "15000000000",
        "gasPriceGwei": 15,
        "nonce": 13361,
        "blockHash": null,
        "blockNumber": null,
        "v": "0x25",
        "r": "0xe582432f632f64e32b879ba8b0f0e6416adb260c94651a44ac61889e2e5879d",
        "s": "0x560de5abf125201f6644f0f64bbde27673d55d5c5ecd0a8d9dd4251f395b68ae",
        "input": "0xc98075390000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000006800001000000010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000046000000000000000000000003fb821a27fcd8c306252e6f92e7a7fcb000059b00502030b0e080c0719011c0a151e161d0f06111a0d1009041805001412131b17000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001f000000000000000000000000000000000000000000000000000000336d10296e000000000000000000000000000000000000000000000000000000336d24c08b000000000000000000000000000000000000000000000000000000336d24c08b000000000000000000000000000000000000000000000000000000336e6ad69600000000000000000000000000000000000000000000000000000033712b5f80000000000000000000000000000000000000000000000000000000337f611425000000000000000000000000000000000000000000000000000000337f6114250000000000000000000000000000000000000000000000000000003380aaa880000000000000000000000000000000000000000000000000000000339588d56b0000000000000000000000000000000000000000000000000000003395c9270400000000000000000000000000000000000000000000000000000033964360d70000000000000000000000000000000000000000000000000000003396a7b473000000000000000000000000000000000000000000000000000000339da99bb100000000000000000000000000000000000000000000000000000033a717bfd200000000000000000000000000000000000000000000000000000033a8fdd00200000000000000000000000000000000000000000000000000000033a8fdd00200000000000000000000000000000000000000000000000000000033a99dfef800000000000000000000000000000000000000000000000000000033a99dfef800000000000000000000000000000000000000000000000000000033a99dfef800000000000000000000000000000000000000000000000000000033a99dfef800000000000000000000000000000000000000000000000000000033b2aa316d00000000000000000000000000000000000000000000000000000033b579f20000000000000000000000000000000000000000000000000000000033be28b88000000000000000000000000000000000000000000000000000000033be28b88000000000000000000000000000000000000000000000000000000033bf2ddd1100000000000000000000000000000000000000000000000000000033bf2ddd1100000000000000000000000000000000000000000000000000000033c303916d00000000000000000000000000000000000000000000000000000033c303916d00000000000000000000000000000000000000000000000000000033c4eaa13200000000000000000000000000000000000000000000000000000033e5f34eb600000000000000000000000000000000000000000000000000000033e5f34eb6000000000000000000000000000000000000000000000000000000000000000bed4bd86390dd97d5c43946f6434d260de0ac7ad51fa93c0fd6d47d55e70ff2ae10640b9f85ed18e100ee6f7a0280ae68ebd2d9cf648716d6d3b1abb055281559a1a91cb05915f9db08db65da279f8734064b9105d268daa2bcae5952bcde0704076c781d9a1398a92eccdbbcf44699be17155e8dd03bb86e899c28640180ea7ed8ec580ca2bba952cb3a640d4c148595c9ef7ff822bb61ec865e239a9122a730b0d5bae3b8262d007a43c09789d6255fb8d85ce078509e1b7536cb41df386fdf3c21145f4517b2292847e9e38fe2353c5f1e892740dd4c3875b3b7d8bc8148902165dfc5cf6458c4a12f313eafaa4a5c20f95dec4eda0e1a2179165f0f70a7c3623de86bf1971f471c29a80e3e7b6cfa44c4e45067701bc5b27792966e5da18f648164b4c0e59579525cd3c35ed07c917e1fb1d06f2852e84b83635b194207a8abdddadc702d53532d57b4eba8c81a9a88609f1fef4f542dc214af0bb4c58754000000000000000000000000000000000000000000000000000000000000000b16c4f23d122d90011a1ae7f6125d13da3d3aee339cca476cdcbcd428c53449d75d17811ac0dc5dfb042f4a58e44eeb8a66378a0f67d818618f94ac2b3f3345cf6e7a44bcaf3ea33edc3cbbd1f38ebe250e8660659dbbed643d6713e7effddd753dbe3086412278a78674903d18e244c1fe17d4f03e27a51369cfcb32019c986b33c5b4c3d5808e0a56fafe5584a2bba691813c65cc6e19dc1d5ed2379bad342503ed4c2f664d817ccf1b5cfcc1d15cc154a463f03f2ef46b459dd9dfc4ff5a5b549c0a13b1a2fb17770d2008d953bb0d9585234d7929c0dfb4c05053c4459828464fc53e3708d5c90e56a4367dd17f19030c39131dc898ca4670997a10b9df9b59fe861263a51188f9b9bb779a5a01a91d0ae6c9d9d5d9aa6084ba9a04a23d5635d4d31df1e50481335413c9130e5c428ae7e09f76e69544d0118719a5ef84f94dc674caca96a4c24e6334eb5965d2d2a83b9905336c7172483fe9105f82647c",
        "asset": "ETH",
        "estimatedBlocksUntilConfirmed": 3,
        "watchedAddress": "0x37bc7498f4ff12c19678ee8fe19d713b87f6a9e6",
        "direction": "incoming",
        "counterparty": "0xddEB598fe902A13Cc523aaff5240e9988eDCE170",
        "serverVersion": "0.111.1",
        "eventCode": "txPool",
        "timeStamp": "2021-07-05T14:31:35.026Z",
        "system": "ethereum",
        "network": "main"
    },
    tx_2: {
        "status": "pending-simulation",
        "monitorId": "GETH_1_F_PROD",
        "monitorVersion": "0.87.12",
        "pendingTimeStamp": "2021-07-05T14:31:35.030Z",
        "pendingBlockNumber": 12768036,
        "hash": "0x80286b29f3d6243458e1254ef7e19ba94df620a11fad37594cf093c5c7aeab83",
        "from": "0xddEB598fe902A13Cc523aaff5240e9988eDCE170",
        "to": "0x37bC7498f4FF12C19678ee8fE19d713b87F6a9e6",
        "value": "0",
        "gas": 500000,
        "gasPrice": "15000000000",
        "gasPriceGwei": 15,
        "nonce": 13361,
        "blockHash": null,
        "blockNumber": null,
        "v": "0x25",
        "r": "0xe582432f632f64e32b879ba8b0f0e6416adb260c94651a44ac61889e2e5879d",
        "s": "0x560de5abf125201f6644f0f64bbde27673d55d5c5ecd0a8d9dd4251f395b68ae",
        "input": "0xc98075390000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000006800001000000010101010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000046000000000000000000000003fb821a27fcd8c306252e6f92e7a7fcb000059b00502030b0e080c0719011c0a151e161d0f06111a0d1009041805001412131b17000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001f000000000000000000000000000000000000000000000000000000336d10296e000000000000000000000000000000000000000000000000000000336d24c08b000000000000000000000000000000000000000000000000000000336d24c08b000000000000000000000000000000000000000000000000000000336e6ad69600000000000000000000000000000000000000000000000000000033712b5f80000000000000000000000000000000000000000000000000000000337f611425000000000000000000000000000000000000000000000000000000337f6114250000000000000000000000000000000000000000000000000000003380aaa880000000000000000000000000000000000000000000000000000000339588d56b0000000000000000000000000000000000000000000000000000003395c9270400000000000000000000000000000000000000000000000000000033964360d70000000000000000000000000000000000000000000000000000003396a7b473000000000000000000000000000000000000000000000000000000339da99bb100000000000000000000000000000000000000000000000000000033a717bfd200000000000000000000000000000000000000000000000000000033a8fdd00200000000000000000000000000000000000000000000000000000033a8fdd00200000000000000000000000000000000000000000000000000000033a99dfef800000000000000000000000000000000000000000000000000000033a99dfef800000000000000000000000000000000000000000000000000000033a99dfef800000000000000000000000000000000000000000000000000000033a99dfef800000000000000000000000000000000000000000000000000000033b2aa316d00000000000000000000000000000000000000000000000000000033b579f20000000000000000000000000000000000000000000000000000000033be28b88000000000000000000000000000000000000000000000000000000033be28b88000000000000000000000000000000000000000000000000000000033bf2ddd1100000000000000000000000000000000000000000000000000000033bf2ddd1100000000000000000000000000000000000000000000000000000033c303916d00000000000000000000000000000000000000000000000000000033c303916d00000000000000000000000000000000000000000000000000000033c4eaa13200000000000000000000000000000000000000000000000000000033e5f34eb600000000000000000000000000000000000000000000000000000033e5f34eb6000000000000000000000000000000000000000000000000000000000000000bed4bd86390dd97d5c43946f6434d260de0ac7ad51fa93c0fd6d47d55e70ff2ae10640b9f85ed18e100ee6f7a0280ae68ebd2d9cf648716d6d3b1abb055281559a1a91cb05915f9db08db65da279f8734064b9105d268daa2bcae5952bcde0704076c781d9a1398a92eccdbbcf44699be17155e8dd03bb86e899c28640180ea7ed8ec580ca2bba952cb3a640d4c148595c9ef7ff822bb61ec865e239a9122a730b0d5bae3b8262d007a43c09789d6255fb8d85ce078509e1b7536cb41df386fdf3c21145f4517b2292847e9e38fe2353c5f1e892740dd4c3875b3b7d8bc8148902165dfc5cf6458c4a12f313eafaa4a5c20f95dec4eda0e1a2179165f0f70a7c3623de86bf1971f471c29a80e3e7b6cfa44c4e45067701bc5b27792966e5da18f648164b4c0e59579525cd3c35ed07c917e1fb1d06f2852e84b83635b194207a8abdddadc702d53532d57b4eba8c81a9a88609f1fef4f542dc214af0bb4c58754000000000000000000000000000000000000000000000000000000000000000b16c4f23d122d90011a1ae7f6125d13da3d3aee339cca476cdcbcd428c53449d75d17811ac0dc5dfb042f4a58e44eeb8a66378a0f67d818618f94ac2b3f3345cf6e7a44bcaf3ea33edc3cbbd1f38ebe250e8660659dbbed643d6713e7effddd753dbe3086412278a78674903d18e244c1fe17d4f03e27a51369cfcb32019c986b33c5b4c3d5808e0a56fafe5584a2bba691813c65cc6e19dc1d5ed2379bad342503ed4c2f664d817ccf1b5cfcc1d15cc154a463f03f2ef46b459dd9dfc4ff5a5b549c0a13b1a2fb17770d2008d953bb0d9585234d7929c0dfb4c05053c4459828464fc53e3708d5c90e56a4367dd17f19030c39131dc898ca4670997a10b9df9b59fe861263a51188f9b9bb779a5a01a91d0ae6c9d9d5d9aa6084ba9a04a23d5635d4d31df1e50481335413c9130e5c428ae7e09f76e69544d0118719a5ef84f94dc674caca96a4c24e6334eb5965d2d2a83b9905336c7172483fe9105f82647c",
        "asset": "ETH",
        "watchedAddress": "0x37bc7498f4ff12c19678ee8fe19d713b87f6a9e6",
        "direction": "incoming",
        "counterparty": "0xddEB598fe902A13Cc523aaff5240e9988eDCE170",
        "internalTransactions": [
          {
            "type": "CALL",
            "from": "0x37bc7498f4ff12c19678ee8fe19d713b87f6a9e6",
            "to": "0x264bddfd9d93d48d759fbdb0670be1c6fdd50236",
            "input": "0xbeed9b51000000000000000000000000000000000000000000000000000000000000184700000000000000000000000000000000000000000000000000000033ef533f2d000000000000000000000000000000000000000000000000000000000000184800000000000000000000000000000000000000000000000000000033a8fdd002",
            "gas": 210000,
            "gasUsed": 210000,
            "value": "0"
          },
          {
            "type": "CALL",
            "from": "0x264bddfd9d93d48d759fbdb0670be1c6fdd50236",
            "to": "0x841616a5cba946cf415efe8a326a621a794d0f97",
            "input": "0xbeed9b51000000000000000000000000000000000000000000000000000000000000184700000000000000000000000000000000000000000000000000000033ef533f2d000000000000000000000000000000000000000000000000000000000000184800000000000000000000000000000000000000000000000000000033a8fdd002",
            "gas": 198743,
            "gasUsed": 198743,
            "value": "0"
          }
        ],
        "netBalanceChanges": [],
        "simDetails": {
          "blockNumber": 12768036,
          "performanceProfile": {
            "breakdown": [
              {
                "label": "detected",
                "timeStamp": "2021-07-05T14:31:35.026Z"
              },
              {
                "label": "traceStart",
                "timeStamp": "2021-07-05T14:31:35.027Z"
              },
              {
                "label": "traceEnd",
                "timeStamp": "2021-07-05T14:31:35.053Z"
              },
              {
                "label": "dispatch",
                "timeStamp": "2021-07-05T14:31:35.391Z"
              }
            ],
            "e2eMs": 365
          }
        },
        "serverVersion": "0.111.1",
        "eventCode": "txPoolSimulation",
        "timeStamp": "2021-07-05T14:31:35.026Z",
        "system": "ethereum",
        "network": "main"
    }
}

exports.getBlockNumberOnDate = async function(date) {
    const EthDater = require("ethereum-block-by-date");
    const { ethers } = require("ethers");
    const provider = new ethers.providers.CloudflareProvider();

    const dater = new EthDater(provider);
    return await dater.getDate(date);
}

exports.ENDPOINTS = {
  REDIS_HOST: "localhost",
  REDIS_PORT: 6379,
}

exports.PARAMS = {
  NODE_STARTUP_TIME_MS: 10000
}