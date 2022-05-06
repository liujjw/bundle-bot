pragma solidity 0.8.9;
import { ILendingPool } from "../contracts/ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "../contracts/ILendingPoolAddressesProvider.sol";
import '../contracts/CompoundV5.sol';
import "forge-std/Test.sol";
import { WETHInterface, IEqualizer, Erc20Interface } from "../contracts/Interfaces.sol";
import { Constants } from "../contracts/Constants.sol";

contract CompoundTest is Test {
    CompoundV5 compoundBot;
    ILendingPoolAddressesProvider public ADDRESSES_PROVIDER;
    ILendingPool public LENDING_POOL;
    // IEqualizer EQUALIZER;

    address WETH_ADDR = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address DAI_ADDR = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address cDAI_ADDR = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
    address cETH_ADDR = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;

    function setUp() public {
        compoundBot = new CompoundV5();
        // compoundBot = new CompoundV6();
        ADDRESSES_PROVIDER = 
            ILendingPoolAddressesProvider(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
        LENDING_POOL = 
            ILendingPool(ADDRESSES_PROVIDER.getLendingPool());
        // EQUALIZER = IEqualizer(0xBbe4Ed8F4d9A36F70870D479708C1D8179AF892E);
    }

    function xtestLiquidate2() public {
        require(block.number == 14053711 - 1, "invalid blocknumber in forked node");

        address ethAgg = 0x37bC7498f4FF12C19678ee8fE19d713b87F6a9e6;
        bytes memory data = hex'c98075390000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000006800001000000010001000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000046000000000000000000000009f88d5f42679b75c4a0244716f695ef30000502d060c0e03070a091a021308150b060f1e19050012110d161b14040118101d171c000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001f00000000000000000000000000000000000000000000000000000039e9ac2da300000000000000000000000000000000000000000000000000000039e9ac2da300000000000000000000000000000000000000000000000000000039ea0f310000000000000000000000000000000000000000000000000000000039f925be230000000000000000000000000000000000000000000000000000003a05a2a4310000000000000000000000000000000000000000000000000000003a1638ef200000000000000000000000000000000000000000000000000000003a16d9ad880000000000000000000000000000000000000000000000000000003a16d9ad880000000000000000000000000000000000000000000000000000003a1859ade10000000000000000000000000000000000000000000000000000003a1859ade10000000000000000000000000000000000000000000000000000003a1859ade10000000000000000000000000000000000000000000000000000003a215016c00000000000000000000000000000000000000000000000000000003a275d16d20000000000000000000000000000000000000000000000000000003a275d16d20000000000000000000000000000000000000000000000000000003a275d16d20000000000000000000000000000000000000000000000000000003a2781426b0000000000000000000000000000000000000000000000000000003a319ba87b0000000000000000000000000000000000000000000000000000003a34f64ba00000000000000000000000000000000000000000000000000000003a37e878910000000000000000000000000000000000000000000000000000003a46bd70ed0000000000000000000000000000000000000000000000000000003a46bd70ed0000000000000000000000000000000000000000000000000000003a4893c2320000000000000000000000000000000000000000000000000000003a4e57601b0000000000000000000000000000000000000000000000000000003a4ee910000000000000000000000000000000000000000000000000000000003a4ee910000000000000000000000000000000000000000000000000000000003a5192e9600000000000000000000000000000000000000000000000000000003a54465a800000000000000000000000000000000000000000000000000000003a54465a800000000000000000000000000000000000000000000000000000003a54465a800000000000000000000000000000000000000000000000000000003a54465a800000000000000000000000000000000000000000000000000000003a5ba9fdd5000000000000000000000000000000000000000000000000000000000000000b81e6c49342c28d8644b49966fdf736eb77a071501af3c98c50d151192a8687a4a14401705c64b928316e55a6308cbbe406c0ee5b5d45aff4c900ee23be052392e9cf03af242538d69a2df148a8629a1c651dbf76d53cc74e2701c43dd840856c516b40fa286eab852ea62a0ce8ef4ee5be57317da332463b970db375b55d2d8a4a52a24571b2bdf2a2af25ad2d6ebcea4b042f4ce8722516312b424de047b58082dc023e700c91be28f5570f9e245cc177767a118a7dd3c48ede59caff7ef969a1ddd01ac04eb54b2666d5f2f91ddf28f3f5b6b785e47b8a0a8c3c6f69de25d8aa7f663f539b68d0e7b136211c795e94eabb55e745744bae5f917c6f9dedbab2792a600db14d5ea3feae89837a7acd6eb9627edce21183d472c9c985fa4f57b44ddeb3f6a6f94458f540f4c3f35410170572323a363b63dba54c19244663f2a9de168aea29206c5d431fcd043084fb28b1f2fd90f6eff1cd8f11ee309ae78fdf000000000000000000000000000000000000000000000000000000000000000b646d4caf1317595919a4cb84f7f9ebc07c39ed3424940083b0f22444dd7f110f766dbbff7c6c98541d45441c60e85ccbda88c5520301798cb0b7fc8c6094887c68d5b454a16a23b701f6993415550e7cab2e0c8b67f4c951732ae91ba6abda240708ec7c2ca6059caeaa07a9acf57bd78828ab754f51c436d41c3121023e53fd1862fc8d33c457fe7fdf38d6edf3e03768a74c396cf37871c1d16ef9a985175a06a6561d5f501dc0aeb01f406d2cdf0e226bfba44ff629b712966ac13ea0a15c30ccd51e395caba9dc236a76aacd02e2d1060d2a370bced96c9d7d7d8a857336065578b69d076dfa869312a63ae4391421f67466dc52da67c2dda381114f95095661d8c71acbcc04b2e65c480a8017bbedaf1a6202d569e6ff20ea9868e897e2272818e60fa21aa29014bfa566b5cbde6eaffff49d9294a7b7f9381053067663300361cee28cd4bf27d816967c613a72cc4e3cf28a1ce58932071491df9de2ef';
        vm.prank(0x7BFb89db2d7217c57C3Ad3d4B55826eFD17dC2e9);
        (bool success, bytes memory res) = ethAgg.call(data);
        require(success, "failed transmit call");

        bytes memory params;
        {
            address c_TOKEN_BORROWED = 0x39AA39c021dfbaE8faC545936693aC917d5E7563;
            address c_TOKEN_COLLATERAL = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
            address TOKEN_COLLATERAL = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
            address BORROWER = 0x086DBCF9d25b476AAbA8Ae02ceA177870D27B64C;
            uint256 MAX_SEIZE_TOKENS_TO_SWAP_WITH = 42871931848053079888;
            params = abi.encode(c_TOKEN_BORROWED, c_TOKEN_COLLATERAL, TOKEN_COLLATERAL, 
                BORROWER, MAX_SEIZE_TOKENS_TO_SWAP_WITH);
        }
        address tokenBorrowed = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        uint repayAmount = 105982521309;
        uint16 referralCode = 0;

        address receiverAddress = address(compoundBot);
        address onBehalfOf = address(compoundBot);
        address[] memory assets = new address[](1);
        assets[0] = tokenBorrowed;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = repayAmount;
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        // FAIL sampleLiquidation1
        // adai (not proxy) has 400 million dai, so why would it fail when we ask for 90k?
        // SafeERC20 fails flashloan -> proxy -> adai -> proxy -> dai?
        LENDING_POOL.flashLoan(
            receiverAddress,
            assets,
            amounts,
            modes,
            onBehalfOf,
            params,
            referralCode
        );
        // assertEq(testNumber, 42);
    }

    function xtestLiquidateNoArb() public {
        require(block.number == 14053711 - 1, "invalid blocknumber in forked node");
        // WETHInterface weth = WETHInterface(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
        // weth.deposit{value: 1000 ether}();
        // weth.transfer(address(compoundBot), 1000 ether);

        vm.prank(DAI_ADDR);
        Erc20Interface(DAI_ADDR)
        .transfer(address(compoundBot), 100000 ether);
        
        bytes memory params;
        {
            address c_TOKEN_BORROWED = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
            address c_TOKEN_COLLATERAL = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
            address TOKEN_COLLATERAL = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
            address BORROWER = 0x00726d1346296312D44c45f77403D6fA970eC296;
            uint256 MAX_SEIZE_TOKENS_TO_SWAP_WITH = 14623208136727129938;
            params = abi.encode(c_TOKEN_BORROWED, c_TOKEN_COLLATERAL, TOKEN_COLLATERAL, 
                BORROWER, MAX_SEIZE_TOKENS_TO_SWAP_WITH);
        }
        address tokenBorrowed = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
        // address tokenBorrowed = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
        // address tokenBorrowed = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        uint repayAmount = 36056954471424240000000;
        // uint256 repayAmount = 1000000000000000000000;
        uint16 referralCode = 0;

        address receiverAddress = address(compoundBot);
        address onBehalfOf = address(compoundBot);
        address[] memory assets = new address[](1);
        assets[0] = tokenBorrowed;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = repayAmount;
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        // uint256[] memory premiums = new uint256[](1);
        // premiums[0] = 0;
        // compoundBot.executeOperation(assets, amounts, premiums, address(this), params);
        
        // EQUALIZER.flashLoan(
        //     receiverAddress,
        //     tokenBorrowed,
        //     repayAmount,
        //     params
        // );

        LENDING_POOL.flashLoan(
            receiverAddress,
            assets,
            amounts,
            modes,
            onBehalfOf,
            params,
            referralCode
        );
    }

    function testFlashLoan() public {
        // LENDING_POOL.flashLoan(receiverAddress, assets, amounts, modes, onBehalfOf, params, referralCode);
        // TODO create a shell contract that has enough to pay for premiums of flash loan
    }

    function testSwap() public {
        // borrowed DAI, collateral is WETH
        // thus get weth to convert to DAI and pocket
        uint numWeth = 100 ether;
        uint numDai = 100 gwei;
        uint slippage = 1000;

        vm.prank(WETH_ADDR);
        Erc20Interface(WETH_ADDR).transfer(address(compoundBot), numWeth);
        assertEq(Erc20Interface(WETH_ADDR).balanceOf(address(compoundBot)), numWeth);

        vm.prank(address(compoundBot));
        WETHInterface(WETH_ADDR).withdraw(numWeth);
        
        address[] memory assets = new address[](1);
        assets[0] = DAI_ADDR;
        compoundBot.swap(assets, numDai, 
            Constants.LiquidationParameters(
                cDAI_ADDR,
                cETH_ADDR,
                WETH_ADDR,
                address(0),
                numDai + slippage
        ));
    }

    receive() external payable {} 
}
