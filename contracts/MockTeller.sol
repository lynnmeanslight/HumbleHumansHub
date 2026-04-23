// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockTeller
 * @notice Local stand-in for the Hashnote USYC Teller on Arc Testnet.
 *
 * The production Teller (0x9fdF14c5B14173D74C08Af27AebFf39240dC105A) uses an
 * ERC-4626 interface AND restricts deposits via an on-chain allowlist
 * (maxDeposit returns 0 for any non-whitelisted caller).  ReaderVault would
 * need to be added by the Hashnote/Arc team before the real Teller can be used.
 *
 * This mock:
 *   - Keeps the subscribe()/redeem() interface expected by ReaderVault
 *   - Maintains a 1:1 USDC ↔ USYC rate (no real yield, simplified for demo)
 *   - Has no allowlist — any contract can call subscribe/redeem
 *   - Uses native USDC (msg.value) throughout, matching Arc Testnet semantics
 */
contract MockTeller {
    // ─── State ───────────────────────────────────────────────────────────────
    /// Simulated "USYC" balance per holder (in native USDC units, 1:1 rate)
    mapping(address => uint256) public usycBalance;

    // ─── Events ──────────────────────────────────────────────────────────────
    event Subscribed(address indexed caller, uint256 usdcIn, uint256 usycOut);
    event Redeemed(address indexed caller, uint256 usycIn, uint256 usdcOut);

    // ─── Subscribe: USDC (native) → USYC ─────────────────────────────────────

    /**
     * @notice Stake native USDC; receive USYC 1:1.
     * @dev Called by ReaderVault with `teller.subscribe{value: toStake}()`.
     * @return usycAmount Amount of USYC credited to the caller.
     */
    function subscribe() external payable returns (uint256 usycAmount) {
        require(msg.value > 0, "MockTeller: zero value");
        usycAmount = msg.value; // 1:1 rate
        usycBalance[msg.sender] += usycAmount;
        emit Subscribed(msg.sender, msg.value, usycAmount);
    }

    // ─── Redeem: USYC → USDC (native) ────────────────────────────────────────

    /**
     * @notice Burn USYC; receive native USDC back 1:1.
     * @param usycAmount Amount of USYC to redeem.
     * @return usdcAmount Amount of native USDC returned.
     */
    function redeem(uint256 usycAmount) external returns (uint256 usdcAmount) {
        require(usycBalance[msg.sender] >= usycAmount, "MockTeller: insufficient USYC");
        usycBalance[msg.sender] -= usycAmount;
        usdcAmount = usycAmount; // 1:1 rate
        (bool ok, ) = msg.sender.call{value: usdcAmount}("");
        require(ok, "MockTeller: transfer failed");
        emit Redeemed(msg.sender, usycAmount, usdcAmount);
    }

    // ─── Conversion views ─────────────────────────────────────────────────────

    /// @notice Convert USDC amount to equivalent USYC (1:1 for mock).
    function usdcToUsyc(uint256 usdcAmount) external pure returns (uint256) {
        return usdcAmount;
    }

    /// @notice Convert USYC amount to equivalent USDC (1:1 for mock).
    function usycToUsdc(uint256 usycAmount) external pure returns (uint256) {
        return usycAmount;
    }

    /// @notice Exchange rate: 1 USYC = 1 USDC (scaled 1e18 per convention).
    function exchangeRate() external pure returns (uint256) {
        return 1e18;
    }

    // ─── Receive ─────────────────────────────────────────────────────────────
    receive() external payable {}
}
