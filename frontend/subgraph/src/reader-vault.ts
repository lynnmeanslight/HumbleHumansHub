import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ArticleRead as ArticleReadEvent,
  Deposited as DepositedEvent,
  Withdrawn as WithdrawnEvent,
} from "../generated/ReaderVault/ReaderVault";
import {
  ArticleRead,
  ArticleStats,
  ReaderAccount,
  ReaderDeposit,
  ReaderWithdrawal,
} from "../generated/schema";

function eventId(hash: Bytes, logIndex: BigInt): Bytes {
  return hash.concatI32(logIndex.toI32());
}

function loadOrCreateReaderAccount(reader: Bytes, timestamp: BigInt): ReaderAccount {
  let account = ReaderAccount.load(reader);
  if (account == null) {
    account = new ReaderAccount(reader);
    account.totalDeposited = BigInt.zero();
    account.totalWithdrawn = BigInt.zero();
    account.totalUsycMinted = BigInt.zero();
    account.readCount = BigInt.zero();
    account.totalReadVolume = BigInt.zero();
    account.createdAt = timestamp;
  }
  account.updatedAt = timestamp;
  return account;
}

function loadOrCreateArticleStats(slug: string, timestamp: BigInt): ArticleStats {
  let stats = ArticleStats.load(slug);
  if (stats == null) {
    stats = new ArticleStats(slug);
    stats.slug = slug;
    stats.totalReads = BigInt.zero();
    stats.totalVolume = BigInt.zero();
    stats.totalWriterUsycMinted = BigInt.zero();
    stats.createdAt = timestamp;
  }
  stats.updatedAt = timestamp;
  return stats;
}

export function handleArticleRead(event: ArticleReadEvent): void {
  const id = eventId(event.transaction.hash, event.logIndex);

  const entity = new ArticleRead(id);
  entity.txHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.timestamp = event.block.timestamp;
  entity.reader = event.params.reader;
  entity.writer = event.params.writer;
  entity.slug = event.params.slug;
  entity.usdcPaid = event.params.usdcPaid;
  entity.save();

  const reader = loadOrCreateReaderAccount(event.params.reader, event.block.timestamp);
  reader.readCount = reader.readCount.plus(BigInt.fromI32(1));
  reader.totalReadVolume = reader.totalReadVolume.plus(event.params.usdcPaid);
  reader.save();

  const stats = loadOrCreateArticleStats(event.params.slug, event.block.timestamp);
  stats.totalReads = stats.totalReads.plus(BigInt.fromI32(1));
  stats.totalVolume = stats.totalVolume.plus(event.params.usdcPaid);
  stats.lastReader = event.params.reader;
  stats.lastWriter = event.params.writer;
  stats.save();
}

export function handleDeposited(event: DepositedEvent): void {
  const id = eventId(event.transaction.hash, event.logIndex);

  const entity = new ReaderDeposit(id);
  entity.txHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.timestamp = event.block.timestamp;
  entity.reader = event.params.reader;
  entity.usdcAmount = event.params.usdcAmount;
  entity.usycMinted = event.params.usycMinted;
  entity.save();

  const reader = loadOrCreateReaderAccount(event.params.reader, event.block.timestamp);
  reader.totalDeposited = reader.totalDeposited.plus(event.params.usdcAmount);
  reader.totalUsycMinted = reader.totalUsycMinted.plus(event.params.usycMinted);
  reader.save();
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  const id = eventId(event.transaction.hash, event.logIndex);

  const entity = new ReaderWithdrawal(id);
  entity.txHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.timestamp = event.block.timestamp;
  entity.reader = event.params.reader;
  entity.usdcAmount = event.params.usdcAmount;
  entity.save();

  const reader = loadOrCreateReaderAccount(event.params.reader, event.block.timestamp);
  reader.totalWithdrawn = reader.totalWithdrawn.plus(event.params.usdcAmount);
  reader.save();
}