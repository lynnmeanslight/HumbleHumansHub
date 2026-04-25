import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  EarningsReceived as EarningsReceivedEvent,
  EarningsWithdrawn as EarningsWithdrawnEvent,
} from "../generated/WriterVault/WriterVault";
import {
  ArticleStats,
  WriterAccount,
  WriterEarning,
  WriterWithdrawal,
} from "../generated/schema";

function eventId(hash: Bytes, logIndex: BigInt): Bytes {
  return hash.concatI32(logIndex.toI32());
}

function loadOrCreateWriterAccount(writer: Bytes, timestamp: BigInt): WriterAccount {
  let account = WriterAccount.load(writer);
  if (account == null) {
    account = new WriterAccount(writer);
    account.totalReads = BigInt.zero();
    account.totalReceived = BigInt.zero();
    account.totalWithdrawn = BigInt.zero();
    account.totalUsycMinted = BigInt.zero();
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

export function handleEarningsReceived(event: EarningsReceivedEvent): void {
  const id = eventId(event.transaction.hash, event.logIndex);

  const entity = new WriterEarning(id);
  entity.txHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.timestamp = event.block.timestamp;
  entity.writer = event.params.writer;
  entity.slug = event.params.slug;
  entity.usdcAmount = event.params.usdcAmount;
  entity.usycMinted = event.params.usycMinted;
  entity.save();

  const writer = loadOrCreateWriterAccount(event.params.writer, event.block.timestamp);
  writer.totalReads = writer.totalReads.plus(BigInt.fromI32(1));
  writer.totalReceived = writer.totalReceived.plus(event.params.usdcAmount);
  writer.totalUsycMinted = writer.totalUsycMinted.plus(event.params.usycMinted);
  writer.save();

  const stats = loadOrCreateArticleStats(event.params.slug, event.block.timestamp);
  stats.totalWriterUsycMinted = stats.totalWriterUsycMinted.plus(event.params.usycMinted);
  stats.lastWriter = event.params.writer;
  stats.save();
}

export function handleEarningsWithdrawn(event: EarningsWithdrawnEvent): void {
  const id = eventId(event.transaction.hash, event.logIndex);

  const entity = new WriterWithdrawal(id);
  entity.txHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.timestamp = event.block.timestamp;
  entity.writer = event.params.writer;
  entity.usdcAmount = event.params.usdcAmount;
  entity.save();

  const writer = loadOrCreateWriterAccount(event.params.writer, event.block.timestamp);
  writer.totalWithdrawn = writer.totalWithdrawn.plus(event.params.usdcAmount);
  writer.save();
}