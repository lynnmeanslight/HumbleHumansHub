// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITeller
 * @notice ERC-4626 Interface for Hashnote USYC Teller contract.
 *         Enables T+0 atomic USDC ↔ USYC conversion.
 */
interface ITeller {
    function deposit(uint256 assets, address receiver) external payable returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    
    function previewDeposit(uint256 assets) external view returns (uint256 shares);
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
    function convertToShares(uint256 assets) external view returns (uint256 shares);
    function convertToAssets(uint256 shares) external view returns (uint256 assets);
    
    function asset() external view returns (address);
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
