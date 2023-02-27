# setup

pip3 install slither-analyzer

# install solc on ubuntu

pip3 install solc-select
solc-select install 0.6.12
solc-select use 0.6.12
solc --version

# use

slither contracts/CompoundV5.sol

# the config file is for foundry test sol files
