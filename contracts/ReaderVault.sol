// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ITeller.sol";
import "./interfaces/IUSYC.sol";
import "./interfaces/IWriterVault.sol";

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
contract ReaderVault {
    // ─── Constants ───────────────────────────────────────────────────────────
    uint256 public constant PLATFORM_FEE = 1_000_000_000_000_000;   // 0.001 USDC (18 decimals)
    uint256 public constant FLOAT_AMOUNT   = 10_000_000_000_000_000; // 0.010 USDC float (18 decimals)

    // ─── State ────────────────────────────────────────────────────────────────
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
    event CommentPaid(address indexed reader, address indexed writer, string slug, uint256 usdcPaid, string commentHash);
    event ClapPaid(address indexed reader, address indexed writer, string slug, uint256 usdcPaid);
    event Withdrawn(address indexed reader, uint256 usdcAmount);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error InsufficientBalance();
    error TransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _usycToken,
        address _teller,
        address _writerVault
    ) {
        usycToken   = IUSYC(_usycToken);
        teller      = ITeller(_teller);
        writerVault = _writerVault;
        owner       = msg.sender;
    }

    // ─── Reader Actions ───────────────────────────────────────────────────────

    /**
     * @notice Deposit USDC (Native). Keeps FLOAT_AMOUNT as liquid USDC; stakes rest into USYC.
     */
    function deposit() external payable {
        uint256 amount = msg.value;
        require(amount > 0, "Amount must be greater than 0");

        uint256 currentFloat = usdcFloat[msg.sender];
        uint256 needed = currentFloat >= FLOAT_AMOUNT ? 0 : FLOAT_AMOUNT - currentFloat;
        uint256 toFloat = amount < needed ? amount : needed;
        uint256 toStake = amount - toFloat;

        usdcFloat[msg.sender] += toFloat;

        uint256 usycMinted = 0;
        if (toStake > 0) {
            address assetAddress = teller.asset();
            IERC20(assetAddress).approve(address(teller), toStake);
            usycMinted = teller.deposit(toStake, address(this));
            usycStaked[msg.sender] += usycMinted;
        }

        emit Deposited(msg.sender, amount, usycMinted);
    }

    /**
     * @notice Internal logic to deduct funds and route payment.
     */
    function _processPayment(address reader, address writer, string calldata slug, uint256 price, uint256 fee) internal {
        uint256 writerShare = price - fee;
        uint256 floatBalance = usdcFloat[reader];

        if (floatBalance >= price) {
            // Fast path: use USDC float
            usdcFloat[reader] -= price;
            
            if (fee > 0) {
                (bool success, ) = owner.call{value: fee}("");
                if (!success) revert TransferFailed();
            }
            if (writerShare > 0) {
                IWriterVault(writerVault).receivePayment{value: writerShare}(writer, slug);
            }
        } else {
            // Slow path: redeem USYC → USDC
            uint256 usycNeeded = teller.previewDeposit(price); // approximate shares needed to get 'price' assets back
            // To be safe, add a tiny buffer to avoid rounding issues, or just use convertToShares
            usycNeeded = teller.convertToShares(price); 
            if (usycStaked[reader] < usycNeeded) revert InsufficientBalance();

            usycStaked[reader] -= usycNeeded;
            uint256 usdcOut = teller.redeem(usycNeeded, address(this), address(this));

            if (usdcOut < price) revert InsufficientBalance();
            
            if (fee > 0) {
                (bool success, ) = owner.call{value: fee}("");
                if (!success) revert TransferFailed();
            }
            if (writerShare > 0) {
                IWriterVault(writerVault).receivePayment{value: writerShare}(writer, slug);
            }

            // Refund any excess back to float
            if (usdcOut > price) {
                usdcFloat[reader] += (usdcOut - price);
            }
        }
    }

    /**
     * @notice Pay for an article read. Deducts from USDC float first, then redeems USYC.
     * @param reader  Reader address (called by x402 middleware via trusted relayer)
     * @param writer  Writer address to receive payment
     * @param slug    Article slug (for event indexing)
     * @param price   Total dynamic price set by the creator
     */
    function payForRead(address reader, address writer, string calldata slug, uint256 price) external {
        require(price >= PLATFORM_FEE, "Price must be at least platform fee");
        _processPayment(reader, writer, slug, price, PLATFORM_FEE);
        emit ArticleRead(reader, writer, slug, price);
    }

    /**
     * @notice Pay to leave a comment (anti-spam).
     * @param reader      Reader address
     * @param writer      Writer address
     * @param slug        Article slug
     * @param price       Dynamic comment price set by creator
     * @param commentHash IPFS/Content hash of the comment
     */
    function payForComment(address reader, address writer, string calldata slug, uint256 price, string calldata commentHash) external {
        require(price > 0, "Comment price must be > 0");
        _processPayment(reader, writer, slug, price, 0); // No platform fee for comments
        emit CommentPaid(reader, writer, slug, price, commentHash);
    }

    /**
     * @notice Micro-tip an author via a 'Clap'. Streams exactly $0.001 per clap to author.
     * @param reader Reader address
     * @param writer Writer address
     * @param slug   Article slug
     */
    function payForClap(address reader, address writer, string calldata slug) external {
        uint256 clapPrice = 1_000_000_000_000_000; // $0.001 USDC
        _processPayment(reader, writer, slug, clapPrice, 0); // No platform fee
        emit ClapPaid(reader, writer, slug, clapPrice);
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
            uint256 redeemed = teller.redeem(staked, address(this), address(this));
            total += redeemed;
        }

        if (total == 0) revert InsufficientBalance();
        (bool success, ) = msg.sender.call{value: total}("");
        if (!success) revert TransferFailed();

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
        estimatedUsdcValue = usdcBalance + teller.convertToAssets(usycBalance);
    }

    receive() external payable {}
}
