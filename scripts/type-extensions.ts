/* eslint-disable @typescript-eslint/no-explicit-any */
import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    DEPLOYER_MNEMONIC: string;
    DISABLE_ZK_CHECKS: boolean;
    PROJECT_ID: string;
  }
}
