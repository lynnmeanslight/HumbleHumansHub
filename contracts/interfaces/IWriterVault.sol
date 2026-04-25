// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWriterVault {
    enum PaymentType { Read, Clap, Comment, AgentSearch }
    function receivePayment(address writer, string calldata slug, PaymentType pType) external payable;
}
