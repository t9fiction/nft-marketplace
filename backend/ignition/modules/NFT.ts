// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const nftMarket: string = '0x8b035CAb51b0FbA6D8e537523c13FA50136650cE';

const NFTModule = buildModule("NFTModule", (m) => {
  const contractAddress = m.getParameter("contractAddress", nftMarket);

  const lock = m.contract("NFT", [contractAddress] );

  return { lock };
});

export default NFTModule;
