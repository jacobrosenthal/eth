import "./scripts/type-extensions";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { HardhatUserConfig, extendEnvironment } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-typechain";
import "@nomiclabs/hardhat-waffle";

const isProd = process.env.NODE_ENV === "production";

require("dotenv").config({
  path: isProd ? ".env.prod" : ".env.example",
});

const PROJECT_ID = process.env.project_id;
const DEPLOYER_MNEMONIC = process.env.deployer_mnemonic;
const DISABLE_ZK_CHECKS =
  process.env.DISABLE_ZK_CHECKS === undefined
    ? undefined
    : process.env.DISABLE_ZK_CHECKS === "true";

if (!PROJECT_ID || !DEPLOYER_MNEMONIC || DISABLE_ZK_CHECKS === undefined) {
  console.log(PROJECT_ID);
  console.log(DEPLOYER_MNEMONIC);
  console.log(DISABLE_ZK_CHECKS);

  console.error("environment variables not found!");
  process.exit(1);
}

extendEnvironment((env: HardhatRuntimeEnvironment) => {
  env.DEPLOYER_MNEMONIC = DEPLOYER_MNEMONIC;
  env.DISABLE_ZK_CHECKS = DISABLE_ZK_CHECKS;
  env.PROJECT_ID = PROJECT_ID;
});

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    xdai: {
      url: "https://rpc.xdaichain.com/",
      accounts: {
        mnemonic: DEPLOYER_MNEMONIC,
      },
    },
    localhost: {
      url: "http://localhost:8545/",
      accounts: {
        mnemonic: DEPLOYER_MNEMONIC,
        accountsBalance: "10000000000000000000000",
      },
    },
    // used when you dont specify a network on command line, like tests
    hardhat: {
      // from/deployer is default the first address in accounts
      accounts: [
        {
          privateKey:
            "0x044C7963E9A89D4F8B64AB23E02E97B2E00DD57FCB60F316AC69B77135003AEF",
          balance: "100000000000000000000",
        },
        {
          privateKey:
            "0x523170AAE57904F24FFE1F61B7E4FF9E9A0CE7557987C2FC034EACB1C267B4AE",
          balance: "100000000000000000000",
        },
        {
          privateKey:
            "0x67195c963ff445314e667112ab22f4a7404bad7f9746564eb409b9bb8c6aed32",
          balance: "100000000000000000000",
        },
      ],
      blockGasLimit: 16777215,
    },
  },
  solidity: {
    version: "0.6.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};

export default config;
