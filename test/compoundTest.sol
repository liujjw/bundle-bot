pragma solidity 0.8.13;
import { ILendingPool } from "../contracts/ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "../contracts/ILendingPoolAddressesProvider.sol";
import '../contracts/CompoundV5.sol';
import "forge-std/Test.sol";

contract CompoundTest is Test {
    CompoundV5 compoundBot;
    ILendingPoolAddressesProvider public ADDRESSES_PROVIDER;
    ILendingPool public LENDING_POOL;

    function setUp() public {
        // TODO require
        compoundBot = new CompoundV5();
        // compoundBot2 = new CompoundV6();
        ADDRESSES_PROVIDER = 
            ILendingPoolAddressesProvider(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
        LENDING_POOL = 
            ILendingPool(ADDRESSES_PROVIDER.getLendingPool());
    }

    function testLiquidate() public {
        require(block.number == 14053711 - 1, "invalid blocknumber in forked node");
        // vm.chainId(1337);
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

        // TODO sampleLiquidation1
        // maybe try flash swaps from uniswap or use the foundry debugger or equalizer for cheaper flashloans
        // adai (not proxy) has 400 million dai, so why would it fail when we ask for 90k?
        // SafeERC20 fails flashloan -> proxy -> adai -> proxy -> dai?
        // vm.chainId(2);
        emit log_uint(block.chainid);
        // LENDING_POOL.flashLoan(
        //     receiverAddress,
        //     assets,
        //     amounts,
        //     modes,
        //     onBehalfOf,
        //     params,
        //     referralCode
        // );
        // assertEq(testNumber, 42);
    }

    // function testLiquidate2() public {

    // }

    // function testFailUnderflow() public {
    //     testNumber -= 43;
    // }

    // function testFailSubtract43() public {
    //     testNumber -= 43;
    // }

    // function testCannotSubtract43() public {
    //     cheats.expectRevert(abi.encodeWithSignature("Panic(uint256)", 0x11));
    //     testNumber -= 43;
    // }

    // function testIncrementAsNotOwner() public {
    //     cheats.expectRevert(Unauthorized.selector);
    //     cheats.prank(address(0));
    //     upOnly.increment();
    // }

}
