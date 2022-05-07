pragma solidity 0.8.9;

library Constants { 
  struct LiquidationParameters {
        address c_TOKEN_BORROWED;
        address c_TOKEN_COLLATERAL;
        address TOKEN_COLLATERAL;
        address BORROWER;
        uint256 MAX_SEIZE_TOKENS_TO_SWAP_WITH;
        uint256 MINER_PAYMENT;
        uint256 MIN_ETH_TO_SWAP_FOR;
    }
    
  address constant WBTC_ADDR = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
}