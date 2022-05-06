// pragma solidity 0.8.9;

// import { IFlashLoanReceiver } from "./IFlashLoanReceiver.sol";
// import { Erc20Interface, UniswapV2Router02, ILendingPool, ILendingPoolAddressesProvider, Erc20InterfaceUSDT } from "./Interfaces.sol";

// import { SafeERC20 } from './SafeERC20.sol';

// import { SafeMath } from './SafeMath.sol';

// contract Liquidate is IFlashLoanReceiver {

//     ILendingPoolAddressesProvider public override ADDRESSES_PROVIDER;
//     ILendingPool public override LENDING_POOL;
//     using SafeMath for uint256;
//     using SafeERC20 for Erc20InterfaceUSDT;
    
//     function approve(address symbol) public {
//         if (symbol == 0xdAC17F958D2ee523a2206206994597C13D831ec7) {
//             Erc20InterfaceUSDT usdt = Erc20InterfaceUSDT(symbol);
//             usdt.safeApprove(address(LENDING_POOL), 2**256 - 1);
//             usdt.safeApprove(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, 2**256 - 1);
//         } else {
//             Erc20Interface erc20 = Erc20Interface(symbol);
//             assert(erc20.approve(address(LENDING_POOL), 2**256 - 1));
//             assert(erc20.approve(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, 2**256 - 1));
//         }
//     }

//     constructor() public {
//         ADDRESSES_PROVIDER = 
//             ILendingPoolAddressesProvider(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
//         LENDING_POOL = ILendingPool(ADDRESSES_PROVIDER.getLendingPool());

//         // usdc
//         approve(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
//         // weth
//         approve(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
//     }

//     receive() external payable {} 

//     function executeOperation(
//         address[] calldata assets,
//         uint256[] calldata amounts,
//         uint256[] calldata premiums,
//         address initiator,
//         bytes calldata params
//     ) override external returns (bool) {
//         (uint maxInputToSwap, uint rate, address user, address collateral) = 
//             abi.decode(params, (uint, uint, address, address));     

//         LENDING_POOL.repay(assets[0], amounts[0], rate, user);
//         // when withdrawing, specify token addr of collateral NOT aToken addr
//         // temporarily send withdrawn collateral to contract so it can swap and repay debt
//         LENDING_POOL.withdraw(collateral, type(uint).max, address(this));
        
//         address[] memory path = new address[](2);
//         path[0] = collateral;
//         path[1] = assets[0];
//         assert(UniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D).swapTokensForExactTokens(amounts[0].add(premiums[0]), maxInputToSwap, path, address(this), block.timestamp)[1] == amounts[0].add(premiums[0]));
//         // send collateral to user
//         assert(Erc20Interface(collateral).transfer(user, Erc20Interface(collateral).balanceOf(address(this))));
//         return true;
//     }
// }