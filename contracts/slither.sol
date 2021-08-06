//SPDX-License-Identifier: Unlicense
pragma solidity 0.6.12;

// TODO3 import from @modules, pramga solidity version them properly
import { ILendingPool } from "./ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "./ILendingPoolAddressesProvider.sol";
import { IFlashLoanReceiver } from "./IFlashLoanReceiver.sol";
import { IERC20 } from './IERC20.sol';

// TODO3 switch Compound code over to safe code
import { SafeERC20 } from './SafeERC20.sol';
import { SafeMath } from './SafeMath.sol';
import {    CToken, ComptrollerInterface, Erc20Interface, CTokenInterface, 
            CErc20Interface, CEtherInterface, UniswapV2Router02, WETHInterface
        } from './Interfaces.sol';

contract slither is IFlashLoanReceiver {

    mapping(string => address) ADDRESSES;
    address payable private OWNER;
    WETHInterface weth;
    address c_TOKEN_BORROWED;
    address TOKEN_BORROWED;
    address c_TOKEN_COLLATERAL;
    address TOKEN_COLLATERAL;
    address BORROWER;
    uint256 REPAY_AMOUNT;
    uint256 MAX_SEIZE_TOKENS;
    bool HAS_RESET;
    
    // required by IFlashLoanReceiver 
    ILendingPoolAddressesProvider public override ADDRESSES_PROVIDER;
    ILendingPool public override LENDING_POOL;

    // TODO3 switch over Erc20Interface to IERC20 to use SafeERC20
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    modifier onlyOwner {
        require(msg.sender == OWNER, "not owner");
        _;
    }

    function approve(address symbol, address csymbol) public {
        Erc20Interface erc20 = Erc20Interface(symbol);
        erc20.approve(csymbol, 2**256 - 1);
        erc20.approve(address(LENDING_POOL), 2**256 - 1);
        erc20.approve(ADDRESSES["uniswapRouter"], 2**256 - 1);
    }

    constructor() public {
        OWNER = msg.sender;
        
        ADDRESSES["uniswapRouter"] = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        ADDRESSES["compoundComptroller"] = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;          
        ADDRESSES["WETH"] = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

        ADDRESSES_PROVIDER = 
            ILendingPoolAddressesProvider(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
        LENDING_POOL = 
            ILendingPool(ADDRESSES_PROVIDER.getLendingPool());

        // TODO3 use permit to save some gas
        // dai
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

        // usdt has some non-standard erc20 methods see openzeppelin thread usdt approve estimate_gas error
        IERC20 usdt = IERC20(0xdAC17F958D2ee523a2206206994597C13D831ec7);
        usdt.safeApprove(0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9, 2**256 - 1);
        usdt.safeApprove(address(LENDING_POOL), 2**256 - 1);
        usdt.safeApprove(ADDRESSES["uniswapRouter"], 2**256 - 1);

        weth = WETHInterface(ADDRESSES["WETH"]);
        // dont need to approve cether contract to take weth since eth is sent
        weth.approve(address(LENDING_POOL), 2**256 - 1);
        weth.approve(ADDRESSES["uniswapRouter"], 2**256 - 1);
    }

    receive() external payable {} 

    function liquidate(
        address cTokenBorrowed,
        address tokenBorrowed,
        address cTokenCollateral,
        address tokenCollateral,
        address borrower,
        uint repayAmount,
        uint maxSeizeTokens
    ) external onlyOwner {
        HAS_RESET = true;
        
        c_TOKEN_BORROWED = cTokenBorrowed;
        TOKEN_BORROWED = tokenBorrowed;
        c_TOKEN_COLLATERAL = cTokenCollateral;
        TOKEN_COLLATERAL = tokenCollateral;
        BORROWER = borrower;
        REPAY_AMOUNT = repayAmount;
        MAX_SEIZE_TOKENS = maxSeizeTokens;

        address receiverAddress = address(this);
        address[] memory assets = new address[](1);
        assets[0] = tokenBorrowed;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = repayAmount;
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        address onBehalfOf = address(this);
        bytes memory params = "";
        uint16 referralCode = 0;

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

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) override external returns (bool) {
        require(HAS_RESET);
        HAS_RESET = false;
        
        uint code;
        if (TOKEN_BORROWED == ADDRESSES["WETH"]) {
            weth.withdraw(REPAY_AMOUNT);
            CEtherInterface cether = CEtherInterface(c_TOKEN_BORROWED);
            // no code, reverts upon failure
            cether.liquidateBorrow{value: REPAY_AMOUNT}(BORROWER, c_TOKEN_COLLATERAL);
        } else {
            CErc20Interface ctokenOfBorrow = CErc20Interface(c_TOKEN_BORROWED);
            code = ctokenOfBorrow.liquidateBorrow(BORROWER, REPAY_AMOUNT, c_TOKEN_COLLATERAL);
        

            require(code == 0, "liquidateBorrow failed");
        }
        
        // TODO3 pass en extra int to represent this
        if (TOKEN_COLLATERAL == ADDRESSES["WETH"]) {
            CEtherInterface cether = CEtherInterface(c_TOKEN_COLLATERAL);
            code = cether.redeem(cether.balanceOf(address(this)));
        } else {
            CErc20Interface ctoken = CErc20Interface(c_TOKEN_COLLATERAL);
        
            
            code = ctoken.redeem(ctoken.balanceOf(address(this)));

        }
        require(code == 0, "redeem failed");

        uint amountOwed = amounts[0].add(premiums[0]);
        UniswapV2Router02 uniRouter = UniswapV2Router02(ADDRESSES["uniswapRouter"]);

        address[] memory path = new address[](3);

        path[0] = TOKEN_COLLATERAL;
        path[1] = ADDRESSES["WETH"];
        path[2] = TOKEN_BORROWED; 

        if (TOKEN_COLLATERAL == ADDRESSES["WETH"]) {
            path = new address[](2);
            path[0] = ADDRESSES["WETH"];
            path[1] = TOKEN_BORROWED;
        } else if (TOKEN_BORROWED == ADDRESSES["WETH"]) {
            path = new address[](2);
            path[0] = TOKEN_COLLATERAL;
            path[1] = ADDRESSES["WETH"]; 
        }
        
        if (TOKEN_COLLATERAL == ADDRESSES["WETH"]) {
            // address(this).balance
            uint[] memory swapAmounts = 
                uniRouter.swapETHForExactTokens{value: MAX_SEIZE_TOKENS}(
                    amountOwed, 
                    path, 
                    address(this), 
                    block.timestamp
                );
            

            OWNER.transfer(address(this).balance);
        } else {
            Erc20Interface token = Erc20Interface(TOKEN_COLLATERAL);
            // token.balanceOf(address(this))
            uint[] memory swapAmounts = 
                uniRouter.swapTokensForExactTokens(
                    amountOwed, 
                    MAX_SEIZE_TOKENS, 
                    path, 
                    address(this), 
                    block.timestamp
                );

            
            token.transfer(OWNER, token.balanceOf(address(this)));
        }
        return true;
    }  
}
 