// SPDX-License-Identifier: Unlicense
pragma solidity 0.6.12;

abstract contract Initializable {
    bool private _initialized;

    bool private _initializing;

    modifier initializer() {
        require(_initializing || !_initialized, "Initializable: contract is already initialized");

        bool isTopLevelCall = !_initializing;
        if (isTopLevelCall) {
            _initializing = true;
            _initialized = true;
        }

        _;

        if (isTopLevelCall) {
            _initializing = false;
        }
    }
}

interface CToken {}

interface ComptrollerInterface {
    function liquidateBorrowAllowed(
        address cTokenBorrowed,
        address cTokenCollateral,
        address liquidator,
        address borrower,
        uint repayAmount
    ) external returns (uint);
    function claimComp(address holder) external; 
    function claimComp(address holder, CToken[] memory cTokens) external;
}

interface Erc20Interface {
    function approve(address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256 balance);
}

interface CTokenInterface {
    function balanceOfUnderlying(address account) external returns (uint);
    function balanceOf(address owner) external view returns (uint256);
    function exchangeRateCurrent() external returns (uint);
}

interface CErc20Interface is CTokenInterface {
    function liquidateBorrow(address borrower, uint repayAmount, address collateral) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
}

interface CEtherInterface is CTokenInterface {
    function liquidateBorrow(address borrower, address collateral) payable external;
    function redeem(uint redeemTokens) external returns (uint);
}

interface UniswapV2Router02 {
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts);
    
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts);
}

interface WETHInterface is Erc20Interface {
    function deposit() payable external;
    function withdraw(uint wad) external;
}

interface WETHGateway {
    function withdrawETH(address lendingPool, uint256 amount, address to) external;
}

interface ILendingPool {
    function repay(
        address asset,
        uint256 amount,
        uint256 rateMode,
        address onBehalfOf
    ) external returns (uint256);

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);
}

interface ILendingPoolAddressesProvider {
    function getLendingPool() external view returns (address);
}
