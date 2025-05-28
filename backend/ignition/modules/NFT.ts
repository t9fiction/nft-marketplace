// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const nftMarket: string = '0x99BbAA88Ef22454FB464fB789CF484781b6661Ef';

const NFTModule = buildModule("NFTModule", (m) => {
  const contractAddress = m.getParameter("contractAddress", nftMarket);

  const lock = m.contract("NFT", [contractAddress] );

  return { lock };
});

export default NFTModule;
