// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const nftMarket: string = '0x7D649D8210E99125E6208E70f2d9065Ca6181D01';

const NFTModule = buildModule("NFTModule", (m) => {
  const contractAddress = m.getParameter("contractAddress", nftMarket);

  const lock = m.contract("NFT", [contractAddress] );

  return { lock };
});

export default NFTModule;
