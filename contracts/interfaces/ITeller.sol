// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITeller
 * @notice Interface for Hashnote USYC Teller contract.
 *         Enables T+0 atomic USDC ↔ USYC conversion.
 *
 * On Arc Testnet, the Teller is deployed by Circle/Hashnote.
 * Subscribe: USDC in → USYC out (yield-bearing)
 * Redeem:    USYC in → USDC out (atomic, T+0)
 */
interface ITeller {
    /**
     * @notice Subscribe USDC to receive USYC.
     * @return usycAmount Amount of USYC minted
     */
    function subscribe() external payable returns (uint256 usycAmount);

    /**
     * @notice Redeem USYC for USDC.
     * @param usycAmount Amount of USYC to redeem
     * @return usdcAmount Amount of USDC returned
     */
    function redeem(uint256 usycAmount) external returns (uint256 usdcAmount);

    /**
     * @notice Convert USDC amount to equivalent USYC at current rate.
     */
    function usdcToUsyc(uint256 usdcAmount) external view returns (uint256 usycAmount);

    /**
     * @notice Convert USYC amount to equivalent USDC at current rate.
     */
    function usycToUsdc(uint256 usycAmount) external view returns (uint256 usdcAmount);

    /**
     * @notice Current USYC/USDC exchange rate (scaled by 1e18).
     */
    function exchangeRate() external view returns (uint256);
}
