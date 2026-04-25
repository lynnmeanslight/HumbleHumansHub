// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ITeller.sol";
import "./interfaces/IUSYC.sol";

contract MockUSYC is IUSYC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }
    function burn(address from, uint256 amount) external {
        balanceOf[from] -= amount;
        totalSupply -= amount;
    }
    function nav() external pure returns (uint256) {
        return 1e6; // 1:1 value ratio
    }
}

contract MockTeller is ITeller {
    MockUSYC public usycToken;
    address public dummyAsset = address(this); // Just a dummy address

    constructor() {
        usycToken = new MockUSYC();
    }

    function deposit(uint256 assets, address receiver) external payable returns (uint256 shares) {
        require(msg.value == assets, "Must send exact native value");
        usycToken.mint(receiver, assets);
        return assets;
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        usycToken.burn(owner, shares);
        (bool success, ) = receiver.call{value: shares}("");
        require(success, "Transfer failed");
        return shares;
    }

    function previewDeposit(uint256 assets) external pure returns (uint256) { return assets; }
    function previewRedeem(uint256 shares) external pure returns (uint256) { return shares; }
    function convertToShares(uint256 assets) external pure returns (uint256) { return assets; }
    function convertToAssets(uint256 shares) external pure returns (uint256) { return shares; }
    function asset() external view returns (address) { return dummyAsset; }
}
