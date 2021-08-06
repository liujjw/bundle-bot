//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.12;

// import "hardhat/console.sol";

// TODO3 import from @modules, pramga solidity version them properly
import { ILendingPool } from "./ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "./ILendingPoolAddressesProvider.sol";
import { IFlashLoanReceiver } from "./IFlashLoanReceiver.sol";
import { IERC20 } from './IERC20.sol';

// TODO3 switch Compound code over to safe code
import { SafeERC20 } from './SafeERC20.sol';
import { SafeMath } from './SafeMath.sol';
import {    CToken, ComptrollerInterface, Erc20Interface, CTokenInterface, 
            CErc20Interface, CEtherInterface, UniswapV2Router02, WETHInterface, Initializable
        } from './Interfaces.sol';

contract CompoundV2Impl is IFlashLoanReceiver, Initializable {

    mapping(string => address) ADDRESSES;
    address payable private OWNER;
    WETHInterface weth;
    uint MAX_INT;
    address c_TOKEN_BORROWED;
    address TOKEN_BORROWED;
    address c_TOKEN_COLLATERAL;
    address TOKEN_COLLATERAL;
    address BORROWER;
    uint256 REPAY_AMOUNT;
    // uint256 EXPECTED_SEIZE_TOKENS;
    uint256 MAX_SEIZE_TOKENS;
    
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

    function approve(string memory symbol) public {
        Erc20Interface erc20 = Erc20Interface(ADDRESSES[symbol]);
        erc20.approve(ADDRESSES[string(abi.encodePacked("c", symbol))], MAX_INT);
        erc20.approve(address(LENDING_POOL), MAX_INT);
        erc20.approve(ADDRESSES["uniswapRouter"], MAX_INT);
    }

    // use constructor if not deploying as the impl of a proxy
    function initialize() public initializer {
    // constructor() public {
        // BaseContract.initialize();
        // console.log('ensuring init is called');
        OWNER = msg.sender;
        MAX_INT = 2**256 - 1;
        
        ADDRESSES["aaveLendingPoolAddressesProvider"] = 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5;
        ADDRESSES["uniswapRouter"] = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        ADDRESSES["compoundComptroller"] = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;          
        ADDRESSES["cETH"] = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
        ADDRESSES["cDAI"] = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
        ADDRESSES["cWBTC"] = 0xC11b1268C1A384e55C48c2391d8d480264A3A7F4; 
        ADDRESSES["cBAT"] = 0x6C8c6b02E7b2BE14d4fA6022Dfd6d75921D90E4E;
        ADDRESSES["cUNI"] = 0x35A18000230DA775CAc24873d00Ff85BccdeD550;
        ADDRESSES["cUSDC"] = 0x39AA39c021dfbaE8faC545936693aC917d5E7563;
        ADDRESSES["cUSDT"] = 0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9;
        ADDRESSES["cZRX"] = 0xB3319f5D18Bc0D84dD1b4825Dcde5d5f7266d407;
        ADDRESSES["cCOMP"] = 0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4;
        ADDRESSES["WETH"] = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
        ADDRESSES["USDC"] = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        ADDRESSES["DAI"] = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
        ADDRESSES["WBTC"] = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
        ADDRESSES["BAT"] = 0x0D8775F648430679A709E98d2b0Cb6250d2887EF;
        ADDRESSES["UNI"] = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;
        ADDRESSES["ZRX"] = 0xE41d2489571d322189246DaFA5ebDe1F4699F498;
        ADDRESSES["USDT"] = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
        ADDRESSES["COMP"] = 0xc00e94Cb662C3520282E6f5717214004A7f26888;

        ADDRESSES_PROVIDER = 
            ILendingPoolAddressesProvider(ADDRESSES["aaveLendingPoolAddressesProvider"]);
        LENDING_POOL = 
            ILendingPool(ADDRESSES_PROVIDER.getLendingPool());

        // TODO3 use permit to save some gas
        approve("DAI");
        approve("WBTC");
        approve("BAT");
        approve("UNI");
        approve("USDC");
        approve("ZRX");
        approve("COMP");

        // usdt has some non-standard erc20 methods see openzeppelin thread usdt approve estimate_gas error
        IERC20 usdt = IERC20(ADDRESSES["USDT"]);
        usdt.safeApprove(ADDRESSES["cUSDT"], MAX_INT);
        usdt.safeApprove(address(LENDING_POOL), MAX_INT);
        usdt.safeApprove(ADDRESSES["uniswapRouter"], MAX_INT);

        weth = WETHInterface(ADDRESSES["WETH"]);
        weth.approve(address(LENDING_POOL), MAX_INT);
        weth.approve(ADDRESSES["uniswapRouter"], MAX_INT);
    }

    receive() external payable {} 

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) override external returns (bool) {
        decode(params);

        {
            ComptrollerInterface troller = ComptrollerInterface(ADDRESSES["compoundComptroller"]);
            CToken cTokenBorrowed = CToken(c_TOKEN_BORROWED);
            CToken[] memory arr = new CToken[](1);
            arr[0] = cTokenBorrowed;
            troller.claimComp(BORROWER, arr);
        }
        
        uint code;
        if (TOKEN_BORROWED == ADDRESSES["WETH"]) {
            weth.withdraw(REPAY_AMOUNT);
            CEtherInterface cether = CEtherInterface(ADDRESSES["cETH"]);
            // no code, reverts upon failure
            cether.liquidateBorrow{value: REPAY_AMOUNT}(BORROWER, c_TOKEN_COLLATERAL);
        } else {
            CErc20Interface ctokenOfBorrow = CErc20Interface(c_TOKEN_BORROWED);
            code = ctokenOfBorrow.liquidateBorrow(BORROWER, REPAY_AMOUNT, c_TOKEN_COLLATERAL);
            // TODO3 token insufficient balance error code
            // if (code != 0) {
            //     console.log(code);
            //     console.log(c_TOKEN_BORROWED, c_TOKEN_COLLATERAL);
            //     console.log(BORROWER, REPAY_AMOUNT);
            // }
            require(code == 0, "liquidateBorrow failed");
        }
        
        if (TOKEN_COLLATERAL == ADDRESSES["WETH"]) {
            CEtherInterface cether = CEtherInterface(ADDRESSES["cETH"]);
            code = cether.redeem(cether.balanceOf(address(this)));
        } else {
            CErc20Interface ctoken = CErc20Interface(c_TOKEN_COLLATERAL);
            code = ctoken.redeem(ctoken.balanceOf(address(this)));
        }
        require(code == 0, "redeem failed");

        // console.log(c_TOKEN_BORROWED, c_TOKEN_COLLATERAL);
        // uint borrowed = amounts[0];
        // uint premium = premiums[0];
        // console.log(borrowed, premium);
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
        
        uint amountOwed = amounts[0].add(premiums[0]);
        if (TOKEN_COLLATERAL == ADDRESSES["WETH"]) {
            uint[] memory _swapAmounts = 
                uniRouter.swapETHForExactTokens{value: address(this).balance}(
                    amountOwed, 
                    path, 
                    address(this), 
                    block.timestamp
                );
            
            OWNER.transfer(address(this).balance);
        } else {
            Erc20Interface token = Erc20Interface(TOKEN_COLLATERAL);
            // console.log(token.balanceOf(address(this)), EXPECTED_SEIZE_TOKENS);

            uint[] memory _swapAmounts = 
                uniRouter.swapTokensForExactTokens(
                    amountOwed, 
                    token.balanceOf(address(this)), 
                    path, 
                    address(this), 
                    block.timestamp
                );
            
            token.transfer(OWNER, token.balanceOf(address(this)));
        }
        return true;
    }  

    function decode(bytes memory params) internal {
        (
            c_TOKEN_BORROWED, 
            TOKEN_BORROWED,
            c_TOKEN_COLLATERAL,
            TOKEN_COLLATERAL,
            BORROWER, 
            REPAY_AMOUNT,
            MAX_SEIZE_TOKENS
        ) = abi.decode(params, (
            address, 
            address, 
            address, 
            address, 
            address,
            uint256, 
            uint256
        ));
    }
}
 