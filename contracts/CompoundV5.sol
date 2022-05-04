//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.5;

// not importing from @ modules, since this way pramga solidity version gets version controlled
import { ILendingPool } from "./ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "./ILendingPoolAddressesProvider.sol";
import { IFlashLoanReceiver } from "./IFlashLoanReceiver.sol";

import { SafeERC20 } from './SafeERC20.sol';
import { IERC20 } from './IERC20.sol';

import { SafeMath } from './SafeMath.sol';

import {    CToken, ComptrollerInterface, Erc20Interface, CTokenInterface, 
            CErc20Interface, CEtherInterface, UniswapV2Router02, WETHInterface
        } from './Interfaces.sol';

import "forge-std/console.sol";

contract CompoundV5 is IFlashLoanReceiver { 

    struct LiquidationParameters {
        address c_TOKEN_BORROWED;
        address c_TOKEN_COLLATERAL;
        address TOKEN_COLLATERAL;
        address BORROWER;
        uint256 MAX_SEIZE_TOKENS_TO_SWAP_WITH;
    }
    mapping(string => address) ADDRESSES;
    address payable private OWNER;
    WETHInterface WETH;
    
    // required by IFlashLoanReceiver 
    ILendingPoolAddressesProvider public override ADDRESSES_PROVIDER;
    ILendingPool public override LENDING_POOL;

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    modifier onlyOwner {
        require(msg.sender == OWNER, "erorr, not owner");
        _;
    }

    function approve(address symbol, address csymbol) public {
        if (symbol == 0xdAC17F958D2ee523a2206206994597C13D831ec7) {
            // see openzeppelin thread usdt approve estimate_gas error (use safeApprove, otherwise modify erc20 approve signature for usdt to match its actual signature)
            // see erc20 verifier from openzeppelin for other non-standard usdt erc20 functions
            IERC20 usdt = IERC20(symbol);
            usdt.safeApprove(csymbol, 2**256 - 1);
            usdt.safeApprove(address(LENDING_POOL), 2**256 - 1);
            usdt.safeApprove(ADDRESSES["uniswapRouter"], 2**256 - 1);
        } else if (symbol == ADDRESSES["WETH"]) {
            WETH = WETHInterface(ADDRESSES["WETH"]);
            // dont need to approve cether contract to take WETH since eth is sent
            WETH.approve(address(LENDING_POOL), 2**256 - 1);
            WETH.approve(ADDRESSES["uniswapRouter"], 2**256 - 1);
        } else {
            Erc20Interface erc20 = Erc20Interface(symbol);
            erc20.approve(csymbol, 2**256 - 1);
            erc20.approve(address(LENDING_POOL), 2**256 - 1);
            erc20.approve(ADDRESSES["uniswapRouter"], 2**256 - 1);
        }
    }

    constructor() {
        OWNER = payable(msg.sender);
        
        ADDRESSES["uniswapRouter"] = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        ADDRESSES["compoundComptroller"] = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;          
        ADDRESSES["WETH"] = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

        ADDRESSES_PROVIDER = 
            ILendingPoolAddressesProvider(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
        LENDING_POOL = 
            ILendingPool(ADDRESSES_PROVIDER.getLendingPool());

        // TODO use permit to save some gas
        // approve cdai to take dai
        approve(0x6B175474E89094C44Da98b954EedeAC495271d0F, 
            0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643);
        // wbtc
        approve(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599, 
            0xC11b1268C1A384e55C48c2391d8d480264A3A7F4);
        // bat
        approve(0x0D8775F648430679A709E98d2b0Cb6250d2887EF, 
            0x6C8c6b02E7b2BE14d4fA6022Dfd6d75921D90E4E);
        // uni
        approve(0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984, 
            0x35A18000230DA775CAc24873d00Ff85BccdeD550);
        // usdc
        approve(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 
            0x39AA39c021dfbaE8faC545936693aC917d5E7563);
        // zrx
        approve(0xE41d2489571d322189246DaFA5ebDe1F4699F498, 
            0xB3319f5D18Bc0D84dD1b4825Dcde5d5f7266d407);
        // comp
        approve(0xc00e94Cb662C3520282E6f5717214004A7f26888, 
            0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4);
        // usdt
        approve(0xdAC17F958D2ee523a2206206994597C13D831ec7, 
            0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9);
        // WETH 
        approve(ADDRESSES["WETH"], address(0));
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
            (   
                address c_TOKEN_BORROWED,
                address c_TOKEN_COLLATERAL,
                address TOKEN_COLLATERAL,
                address BORROWER,
                uint256 MAX_SEIZE_TOKENS_TO_SWAP_WITH
            ) = abi.decode(params, (address, address, address, address, uint256));
            liqParams = LiquidationParameters(c_TOKEN_BORROWED, c_TOKEN_COLLATERAL, TOKEN_COLLATERAL, BORROWER, MAX_SEIZE_TOKENS_TO_SWAP_WITH);
        }

        if (assets[0] == ADDRESSES["WETH"]) {
            WETH.withdraw(amounts[0]);
            CEtherInterface(liqParams.c_TOKEN_BORROWED).liquidateBorrow{value: amounts[0]}(liqParams.BORROWER, liqParams.c_TOKEN_COLLATERAL);
        } else {
            require(CErc20Interface(liqParams.c_TOKEN_BORROWED).liquidateBorrow(liqParams.BORROWER, amounts[0], liqParams.c_TOKEN_COLLATERAL) == 0, "liquidateBorrow failed");
        }
        
        if (liqParams.TOKEN_COLLATERAL == ADDRESSES["WETH"]) {
            // we redeem to get eth back, NOT WETH 
            require(CEtherInterface(liqParams.c_TOKEN_COLLATERAL).redeem(CEtherInterface(liqParams.c_TOKEN_COLLATERAL).balanceOf(address(this))) == 0, "redeem failed");
        } else {
            require(CErc20Interface(liqParams.c_TOKEN_COLLATERAL).balanceOf(address(this)) != 0);
            require(CErc20Interface(liqParams.c_TOKEN_COLLATERAL).redeem(CErc20Interface(liqParams.c_TOKEN_COLLATERAL).balanceOf(address(this))) == 0, "redeem failed");
            require(Erc20Interface(liqParams.TOKEN_COLLATERAL).balanceOf(address(this)) != 0);
        }

        uint amountOwed = amounts[0].add(premiums[0]);
        UniswapV2Router02 uniRouter = UniswapV2Router02(ADDRESSES["uniswapRouter"]);   
        
        bool isEthCollateral = (liqParams.TOKEN_COLLATERAL == ADDRESSES["WETH"]);
        bool isEthBorrow = (assets[0] == ADDRESSES["WETH"]);
        if (isEthCollateral || isEthBorrow) {
            address[] memory path = new address[](2);
            if (isEthCollateral) {
                path[0] = ADDRESSES["WETH"];
                path[1] = assets[0];
            } else {
                path[0] = assets[0];
                path[1] = ADDRESSES["WETH"];
            }

            uint[] memory swapAmounts = 
                uniRouter.swapETHForExactTokens{value: liqParams.MAX_SEIZE_TOKENS_TO_SWAP_WITH}(
                    amountOwed, 
                    path, 
                    address(this), 
                    block.timestamp
                );
            
            for(uint i = 0; i < swapAmounts.length; i++) {
                require(swapAmounts[i] != 0);
            }

            OWNER.transfer(address(this).balance);
        } else {
            address[] memory path = new address[](3);
            path[0] = liqParams.TOKEN_COLLATERAL;
            path[1] = ADDRESSES["WETH"];
            path[2] = assets[0]; 

            require(Erc20Interface(liqParams.TOKEN_COLLATERAL).balanceOf(address(this)) != 0);

            uint[] memory swapAmounts = 
                uniRouter.swapTokensForExactTokens(
                    amountOwed, 
                    liqParams.MAX_SEIZE_TOKENS_TO_SWAP_WITH, 
                    path, 
                    address(this), 
                    block.timestamp
                );

            for(uint i = 0; i < swapAmounts.length; i++) {
                require(swapAmounts[i] != 0);
            }
            require(Erc20Interface(liqParams.TOKEN_COLLATERAL).balanceOf(address(this)) != 0);

            path = new address[](2);
            path[0] = liqParams.TOKEN_COLLATERAL;
            path[1] = ADDRESSES["WETH"];
            // TODO make 2**256 - 1 safer by computing minimum eth received offchain
            swapAmounts = 
                uniRouter.swapExactTokensForETH(
                    Erc20Interface(liqParams.TOKEN_COLLATERAL).balanceOf(address(this)), 
                    2**256 - 1,
                    path, 
                    OWNER, 
                    block.timestamp
                );
            
            for(uint i = 0; i < swapAmounts.length; i++) {
                require(swapAmounts[i] != 0);
            }
        }
        return true;
    }  
}
 