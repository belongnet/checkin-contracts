// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;


interface IFactory {
    function signerAddress() view external returns(address);
    function platformAddress() view external returns(address);
    function platformCommission() view external returns(uint8);
}