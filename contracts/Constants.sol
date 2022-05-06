pragma solidity 0.8.9;

library Constants { 
  struct LiquidationParameters {
        address c_TOKEN_BORROWED;
        address c_TOKEN_COLLATERAL;
        address TOKEN_COLLATERAL;
        address BORROWER;
        uint256 MAX_SEIZE_TOKENS_TO_SWAP_WITH;
    }
    
}