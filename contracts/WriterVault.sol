// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ITeller.sol";
import "./interfaces/IUSYC.sol";
import "./interfaces/IWriterVault.sol";

/**
 * @title WriterVault
 * @notice Accumulates writer earnings from the ReaderVault and auto-stakes into USYC.
 */
contract WriterVault {
    // ─── State ────────────────────────────────────────────────────────────────
    IUSYC   public immutable usycToken;
    ITeller public immutable teller;
    address public immutable owner;

    /// Writer address → USYC staked balance
    mapping(address => uint256) public usycBalance;
    /// Writer address → total USDC earnings received (for dashboard)
    mapping(address => uint256) public totalUsdcEarned;
    /// Writer address → total reads count
    mapping(address => uint256) public totalReads;
    /// Writer address → total claps count
    mapping(address => uint256) public totalClaps;
    /// Writer address → total comments count
    mapping(address => uint256) public totalComments;

    // ─── Events ───────────────────────────────────────────────────────────────
    event EarningsReceived(address indexed writer, uint256 usdcAmount, uint256 usycMinted, string slug, IWriterVault.PaymentType pType);
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
     * @param pType  Type of payment (Read, Clap, Comment)
     */
    function receivePayment(address writer, string calldata slug, IWriterVault.PaymentType pType) external payable {
        uint256 amount = msg.value;
        uint256 usycMinted = 0;

        if (amount > 0) {
            // Auto-stake all native USDC into USYC
            usycMinted = teller.deposit{value: amount}(amount, address(this));
            usycBalance[writer]     += usycMinted;
            totalUsdcEarned[writer] += amount;
        }

        if (pType == IWriterVault.PaymentType.Read) {
            totalReads[writer] += 1;
        } else if (pType == IWriterVault.PaymentType.Clap) {
            totalClaps[writer] += 1;
        } else if (pType == IWriterVault.PaymentType.Comment) {
            totalComments[writer] += 1;
        }

        emit EarningsReceived(writer, amount, usycMinted, slug, pType);
    }

    // ─── Writer Actions ───────────────────────────────────────────────────────

    /**
     * @notice Withdraw all earnings. Redeems USYC → USDC and sends to writer.
     */
    function withdraw() external {
        uint256 staked = usycBalance[msg.sender];
        if (staked == 0) revert InsufficientBalance();

        usycBalance[msg.sender] = 0;

        uint256 usdcOut = teller.redeem(staked, address(this), address(this));
        (bool success, ) = msg.sender.call{value: usdcOut}("");
        if (!success) revert TransferFailed();

        emit EarningsWithdrawn(msg.sender, usdcOut);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function earningsOf(address writer) external view returns (
        uint256 usyc,
        uint256 estimatedUsdc,
        uint256 reads,
        uint256 claps,
        uint256 comments,
        uint256 lifetimeUsdc
    ) {
        usyc           = usycBalance[writer];
        estimatedUsdc  = teller.convertToAssets(usyc);
        reads          = totalReads[writer];
        claps          = totalClaps[writer];
        comments       = totalComments[writer];
        lifetimeUsdc   = totalUsdcEarned[writer];
    }

    receive() external payable {}
}
