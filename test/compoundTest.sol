pragma solidity 0.6.12;
import { ILendingPool } from "../contracts/ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "../contracts/ILendingPoolAddressesProvider.sol";
import 'ds-test/test.sol';
import '../contracts/CompoundV5.sol';

// deploy addr 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84
// forge test -vvvv --match-test testFailIncrementAsNotOwner
interface CheatCodes {
    // function prank(address) external;
    // function expectRevert(bytes4) external;
}

contract CompoundTest is DSTest {
    CompoundV5 compoundBot;
    // CompoundV6 compoundBot2;
    CheatCodes constant cheats = CheatCodes(HEVM_ADDRESS);
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
        require(block.number == 14047243 - 1, "invalid blocknumber in forked node");
        bytes memory params;
        {
            address c_TOKEN_BORROWED = 0x39AA39c021dfbaE8faC545936693aC917d5E7563;
            address c_TOKEN_COLLATERAL = 0xC11b1268C1A384e55C48c2391d8d480264A3A7F4;
            address TOKEN_COLLATERAL = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
            address BORROWER = 0x1A0d5ec1273Ce0fcf82Aae5E9FC2e1BB475e1E16;
            uint256 MAX_SEIZE_TOKENS_TO_SWAP_WITH = 0x27af9b9a;
            params = abi.encode(c_TOKEN_BORROWED, c_TOKEN_COLLATERAL, TOKEN_COLLATERAL, 
                BORROWER, MAX_SEIZE_TOKENS_TO_SWAP_WITH);
        }
        address tokenBorrowed = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        uint repayAmount = 0x338360e8e2;
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
