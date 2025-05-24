// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { Contract } from "ethers"; // Assuming ethers is used for contract types

const nftMarket: string = '0x3262cfa622821B98D5C727f95583383cdEf61309';

const NFTModule = buildModule("NFTModule", (m) => {
  const contractAddress = m.getParameter("contractAddress", nftMarket);

  const lock = m.contract("NFT", [contractAddress] );

  return { lock };
});

export default NFTModule;
