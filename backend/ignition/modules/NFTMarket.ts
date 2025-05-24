// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const NFTMarketModule = buildModule("NFTMarketModule", (m) => {

  const market = m.contract("NFTMarketplace");

  return { market };
});

export default NFTMarketModule;
