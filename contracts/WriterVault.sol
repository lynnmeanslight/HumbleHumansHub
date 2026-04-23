// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ITeller.sol";
import "./interfaces/IUSYC.sol";

/**
 * @title WriterVault
 * @notice Accumulates writer earnings from the ReaderVault and auto-stakes into USYC.
 *
 * Flow:
 *   1. ReaderVault sends $0.001 USDC per read
 *   2. WriterVault auto-stakes incoming USDC → USYC (yield-bearing)
 *   3. Writer can withdraw anytime: USYC → USDC via Teller (T+0)
 */
contract WriterVault {
    // ─── State ────────────────────────────────────────────────────────────────
    IUSYC   public immutable usycToken;
    ITeller public immutable teller;
    address public immutable owner;

    /// Writer address → USYC staked balance
    mapping(address => uint256) public usycBalance;
    /// Writer address → total USDC reads received (for dashboard)
    mapping(address => uint256) public totalUsdcEarned;
    /// Writer address → total reads count
    mapping(address => uint256) public totalReads;

    // ─── Events ───────────────────────────────────────────────────────────────
    event EarningsReceived(address indexed writer, uint256 usdcAmount, uint256 usycMinted, string slug);
    event EarningsWithdrawn(address indexed writer, uint256 usdcAmount);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error Unauthorized();
    error InsufficientBalance();
    error TransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _usycToken, address _teller) {
        usycToken = IUSYC(_usycToken);
        teller    = ITeller(_teller);
        owner     = msg.sender;
    }

    // ─── Called by ReaderVault ────────────────────────────────────────────────

    /**
     * @notice Receive USDC payment for a read and auto-stake to USYC.
     * @param writer Writer address to credit
     * @param slug   Article slug (for indexing)
     */
    function receivePayment(address writer, string calldata slug) external payable {
        uint256 amount = msg.value;
        require(amount > 0, "Amount must be greater than 0");

        // Auto-stake all native USDC into USYC
        uint256 usycMinted = teller.subscribe{value: amount}();

        usycBalance[writer]     += usycMinted;
        totalUsdcEarned[writer] += amount;
        totalReads[writer]      += 1;

        emit EarningsReceived(writer, amount, usycMinted, slug);
    }

    // ─── Writer Actions ───────────────────────────────────────────────────────

    /**
     * @notice Withdraw all earnings. Redeems USYC → USDC and sends to writer.
     */
    function withdraw() external {
        uint256 staked = usycBalance[msg.sender];
        if (staked == 0) revert InsufficientBalance();

        usycBalance[msg.sender] = 0;

        uint256 usdcOut = teller.redeem(staked);
        (bool success, ) = msg.sender.call{value: usdcOut}("");
        if (!success) revert TransferFailed();

        emit EarningsWithdrawn(msg.sender, usdcOut);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function earningsOf(address writer) external view returns (
        uint256 usyc,
        uint256 estimatedUsdc,
        uint256 reads,
        uint256 lifetimeUsdc
    ) {
        usyc           = usycBalance[writer];
        estimatedUsdc  = teller.usycToUsdc(usyc);
        reads          = totalReads[writer];
        lifetimeUsdc   = totalUsdcEarned[writer];
    }

    receive() external payable {}
}
