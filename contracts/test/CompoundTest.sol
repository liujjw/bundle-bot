pragma solidity 0.6.12;
import { ILendingPool } from "../ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "../ILendingPoolAddressesProvider.sol";
import 'ds-test/test.sol';
import '../CompoundV5.sol';

// deploy addr 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84
// forge test -vvvv --match-test testFailIncrementAsNotOwner
interface CheatCodes {
    // function prank(address) external;
    // function expectRevert(bytes4) external;
}

contract CompoundTest is DSTest {
    CompoundV5 compoundBot;
    CheatCodes constant cheats = CheatCodes(HEVM_ADDRESS);
    ILendingPoolAddressesProvider public ADDRESSES_PROVIDER;
    ILendingPool public LENDING_POOL;

    function setUp() public {
        compoundBot = new CompoundV5();
        ADDRESSES_PROVIDER = 
            ILendingPoolAddressesProvider(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
        LENDING_POOL = 
            ILendingPool(ADDRESSES_PROVIDER.getLendingPool());
    }

    function testLiquidate() public {
        require(block.number == 14574363, "invalid blocknumber in evm environment");
        address tokenBorrowed = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
        uint repayAmount = 0x12fea46ba741b041e500;
        uint16 referralCode = 0;
        address c_TOKEN_BORROWED = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
        address c_TOKEN_COLLATERAL = 0x39AA39c021dfbaE8faC545936693aC917d5E7563;
        address TOKEN_COLLATERAL = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        address BORROWER = 0xD6B5986a966D084580226beD115D9C30c4fdEDAa;
        uint256 MAX_SEIZE_TOKENS_TO_SWAP_WITH = 0x1570966ac2;
        bytes memory params = abi.encode(c_TOKEN_BORROWED, c_TOKEN_COLLATERAL, TOKEN_COLLATERAL, 
            BORROWER, MAX_SEIZE_TOKENS_TO_SWAP_WITH);

        address receiverAddress = address(compoundBot);
        address onBehalfOf = address(compoundBot);
        address[] memory assets = new address[](1);
        assets[0] = tokenBorrowed;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = repayAmount;
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

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
