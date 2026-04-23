// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWriterVault {
    function receivePayment(address writer, string calldata slug) external payable;
}
