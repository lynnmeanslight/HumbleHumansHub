// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ITeller.sol";
import "./interfaces/IUSYC.sol";

/**
 * @title ReaderVault
 * @notice Manages reader USDC/USYC balance for micro-payments on HumbleHumansHub.
 *
 * Flow:
 *   1. Reader deposits USDC
 *   2. $0.01 stays as USDC float for instant reads (no redemption latency)
 *   3. Remainder auto-stakes into USYC via Hashnote Teller (yield-bearing)
 *   4. On article read: redeem $0.001 USYC → USDC → WriterVault atomically
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract ReaderVault {
    // ─── Constants ───────────────────────────────────────────────────────────
    uint256 public constant PRICE_PER_READ = 1000;   // 0.001 USDC (6 decimals)
    uint256 public constant FLOAT_AMOUNT   = 10_000; // 0.010 USDC float

    // ─── State ────────────────────────────────────────────────────────────────
    IERC20  public immutable usdc;
    IUSYC   public immutable usycToken;
    ITeller public immutable teller;
    address public immutable writerVault;
    address public immutable owner;

    /// Reader address → USDC float balance
    mapping(address => uint256) public usdcFloat;
    /// Reader address → USYC staked balance
    mapping(address => uint256) public usycStaked;

    // ─── Events ───────────────────────────────────────────────────────────────
    event Deposited(address indexed reader, uint256 usdcAmount, uint256 usycMinted);
    event ArticleRead(address indexed reader, address indexed writer, string slug, uint256 usdcPaid);
    event Withdrawn(address indexed reader, uint256 usdcAmount);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error InsufficientBalance();
    error TransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _usdc,
        address _usycToken,
        address _teller,
        address _writerVault
    ) {
        usdc        = IERC20(_usdc);
        usycToken   = IUSYC(_usycToken);
        teller      = ITeller(_teller);
        writerVault = _writerVault;
        owner       = msg.sender;
    }

    // ─── Reader Actions ───────────────────────────────────────────────────────

    /**
     * @notice Deposit USDC. Keeps FLOAT_AMOUNT as liquid USDC; stakes rest into USYC.
     * @param amount USDC amount (6 decimals)
     */
    function deposit(uint256 amount) external {
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();

        uint256 currentFloat = usdcFloat[msg.sender];
        uint256 needed = currentFloat >= FLOAT_AMOUNT ? 0 : FLOAT_AMOUNT - currentFloat;
        uint256 toFloat = amount < needed ? amount : needed;
        uint256 toStake = amount - toFloat;

        usdcFloat[msg.sender] += toFloat;

        uint256 usycMinted = 0;
        if (toStake > 0) {
            usdc.approve(address(teller), toStake);
            usycMinted = teller.subscribe(toStake);
            usycStaked[msg.sender] += usycMinted;
        }

        emit Deposited(msg.sender, amount, usycMinted);
    }

    /**
     * @notice Pay for an article read. Deducts from USDC float first, then redeems USYC.
     * @param reader  Reader address (called by x402 middleware via trusted relayer)
     * @param writer  Writer address to receive payment
     * @param slug    Article slug (for event indexing)
     */
    function payForRead(address reader, address writer, string calldata slug) external {
        uint256 float = usdcFloat[reader];

        if (float >= PRICE_PER_READ) {
            // Fast path: use USDC float
            usdcFloat[reader] -= PRICE_PER_READ;
            if (!usdc.transfer(writerVault, PRICE_PER_READ)) revert TransferFailed();
        } else {
            // Slow path: redeem USYC → USDC
            uint256 usycNeeded = teller.usdcToUsyc(PRICE_PER_READ);
            if (usycStaked[reader] < usycNeeded) revert InsufficientBalance();

            usycStaked[reader] -= usycNeeded;
            uint256 usdcOut = teller.redeem(usycNeeded);

            if (usdcOut < PRICE_PER_READ) revert InsufficientBalance();
            if (!usdc.transfer(writerVault, PRICE_PER_READ)) revert TransferFailed();

            // Refund any excess back to float
            if (usdcOut > PRICE_PER_READ) {
                usdcFloat[reader] += (usdcOut - PRICE_PER_READ);
            }
        }

        emit ArticleRead(reader, writer, slug, PRICE_PER_READ);
    }

    /**
     * @notice Withdraw all balances (USDC float + USYC redeemed to USDC).
     */
    function withdraw() external {
        uint256 float = usdcFloat[msg.sender];
        uint256 staked = usycStaked[msg.sender];

        usdcFloat[msg.sender] = 0;
        usycStaked[msg.sender] = 0;

        uint256 total = float;

        if (staked > 0) {
            uint256 redeemed = teller.redeem(staked);
            total += redeemed;
        }

        if (total == 0) revert InsufficientBalance();
        if (!usdc.transfer(msg.sender, total)) revert TransferFailed();

        emit Withdrawn(msg.sender, total);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function balanceOf(address reader) external view returns (
        uint256 usdcBalance,
        uint256 usycBalance,
        uint256 estimatedUsdcValue
    ) {
        usdcBalance      = usdcFloat[reader];
        usycBalance      = usycStaked[reader];
        estimatedUsdcValue = usdcBalance + teller.usycToUsdc(usycBalance);
    }
}
