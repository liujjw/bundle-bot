pragma solidity 0.8.9;

import { IFlashLoanReceiver } from "./IFlashLoanReceiver.sol";
import { ILendingPool } from "./ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "./ILendingPoolAddressesProvider.sol";

import {  Erc20Interface, UniswapV2Router02 } from "./Interfaces.sol";
import { IERC20 } from './IERC20.sol';
import { SafeERC20 } from './SafeERC20.sol';

import { SafeMath } from './SafeMath.sol';

contract Liquidate is IFlashLoanReceiver {

    struct LiquidationParameters {
      uint maxInputToSwap;
      uint rate;
      address user; 
      address collateral;
    }

    address uniRouter = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    ILendingPoolAddressesProvider public override ADDRESSES_PROVIDER;
    ILendingPool public override LENDING_POOL;
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    
    function approve(address symbol) public {
        if (symbol == 0xdAC17F958D2ee523a2206206994597C13D831ec7) {
            IERC20 usdt = IERC20(symbol);
            usdt.safeApprove(address(LENDING_POOL), 2**256 - 1);
            usdt.safeApprove(uniRouter, 2**256 - 1);
        } else {
            Erc20Interface erc20 = Erc20Interface(symbol);
            assert(erc20.approve(address(LENDING_POOL), 2**256 - 1));
            assert(erc20.approve(uniRouter, 2**256 - 1));
        }
    }

    constructor() {
        ADDRESSES_PROVIDER = 
            ILendingPoolAddressesProvider(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
        LENDING_POOL = ILendingPool(ADDRESSES_PROVIDER.getLendingPool());

        // usdc
        approve(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        // weth
        approve(WETH);
    }

    receive() external payable {} 

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) override external returns (bool) {
        LiquidationParameters memory liqParams; 
        {
          (uint maxInputToSwap, uint rate, address user, address collateral) = 
            abi.decode(params, (uint, uint, address, address)); 
          liqParams = LiquidationParameters(
            maxInputToSwap,
            rate,
            user,
            collateral
          );
        }

        LENDING_POOL.repay(assets[0], amounts[0], liqParams.rate, liqParams.user);
        // when withdrawing, specify token addr of collateral NOT aToken addr
        LENDING_POOL.withdraw(liqParams.collateral, type(uint).max, address(this));
        
        address[] memory path = new address[](2);
        path[0] = liqParams.collateral;
        path[1] = assets[0];
        
        if (liqParams.collateral == WETH) {
          require(
            UniswapV2Router02(uniRouter)
              .swapETHForExactTokens{value: liqParams.maxInputToSwap}(
                amounts[0].add(premiums[0]), 
                path, 
                address(this), 
                block.timestamp
              )[1] == amounts[0].add(premiums[0])
          );
          payable(liqParams.user).transfer(address(this).balance);
        } else  {
          require(
            UniswapV2Router02(uniRouter)
              .swapTokensForExactTokens(
                amounts[0].add(premiums[0]), 
                liqParams.maxInputToSwap,
                path, 
                address(this), 
                block.timestamp
              )[1] == amounts[0].add(premiums[0])
          );
          require(
            Erc20Interface(liqParams.collateral)
              .transfer(
                liqParams.user, 
                Erc20Interface(liqParams.collateral).balanceOf(address(this))
              )
          );
        }
        return true;
    }
}