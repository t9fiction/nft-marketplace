// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const nftMarket: string = '0x3c516081d292745C26566347bD3d6D6C3d324075';

const NFTModule = buildModule("NFTModule", (m) => {
  const contractAddress = m.getParameter("contractAddress", nftMarket);

  const lock = m.contract("NFT", [contractAddress] );

  return { lock };
});

export default NFTModule;
