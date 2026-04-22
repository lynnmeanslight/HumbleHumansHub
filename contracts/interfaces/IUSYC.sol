// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IUSYC
 * @notice Interface for the Hashnote USYC ERC-20 yield-bearing token.
 *         USYC appreciates in value relative to USDC as yield accrues.
 */
interface IUSYC {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);

    /**
     * @notice Current net asset value per USYC in USDC (6 decimals).
     *         This increases over time as yield accrues (~5% APR).
     */
    function nav() external view returns (uint256);
}
