// Were only using one account, getSigners()[0], the deployer, is there actually a ProxyAdmin?
import * as util from "util";
// import * as fs from "fs";
import * as readlineSync from "readline-sync";
import {
  network,
  ethers,
  upgrades,
  DEPLOYER_MNEMONIC,
  PROJECT_ID,
  DISABLE_ZK_CHECKS,
} from "hardhat";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DarkForestCore } from "../typechain/DarkForestCore";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DarkForestTokens } from "../typechain/DarkForestTokens";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Whitelist } from "../typechain/Whitelist";

import "./type-extensions";

const rawExec = util.promisify(require("child_process").exec);
const isDev = network.name === "localhost";

const exec = async (command: string) => {
  const { error, stdout, stderr } = await rawExec(command);
  console.log(">> ", command);

  if (error) {
    console.error(`{command} failed with error ${error} and stderr ${stderr}.`);
    throw "";
  } else {
    return stdout.trim();
  }
};

const deploy = async () => {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.

  const [deployer] = await ethers.getSigners();

  // Only when deploying to production, give the deployer wallet money,
  // in order for it to be able to deploy the contracts
  // if (!isDev) {
  //   console.log(`Give some eth to ${deployer.address}`);
  //   readlineSync.question("Press enter when you're done.");
  // }

  // deploy the whitelist contract
  const whitelist = await deployWhitelist(deployer.address);

  // // todo probably more but were testing?
  // await deployer.sendTransaction({
  //   to: whitelist.address,
  //   value: ethers.utils.parseEther("0.001"),
  // });

  const whitelistContractAddress = whitelist.address;
  console.log("Whitelist deployed to:", whitelistContractAddress);

  // // Save the deployment environment variables relevant for whitelist
  // writeEnv(`../whitelist/${isDev ? "dev" : "prod"}.autogen.env`, {
  //   mnemonic: DEPLOYER_MNEMONIC,
  //   project_id: PROJECT_ID,
  //   contract_address: whitelistContractAddress,
  // });

  // deploy the tokens contract
  const darkForestTokens = await deployTokens();
  const tokensContractAddress = darkForestTokens.address;
  console.log("DarkForestTokens deployed to:", tokensContractAddress);

  // deploy the core contract
  const darkForestCore = await deployCore(
    deployer.address,
    whitelistContractAddress,
    tokensContractAddress
  );
  const coreContractAddress = darkForestCore.address;
  console.log("DarkForestCore deployed to:", coreContractAddress);

  // late initlialize tokens now that we have corecontract address
  await darkForestTokens.initialize(coreContractAddress, deployer.address);

  // // save the addresses of the deployed contracts to files that
  // // are accessible by typesript, so that the client connects to the correct
  // // contracts
  // fs.writeFileSync(
  //   isDev
  //     ? "../client/src/utils/local_contract_addr.ts"
  //     : "../client/src/utils/prod_contract_addr.ts",
  //   `export const contractAddress = '${coreContractAddress}';\nexport const tokensContract = '${tokensContractAddress}';\nexport const whitelistContract = '${whitelistContractAddress}';\n`
  // );

  // save the core contract json
  // await exec("mkdir -p ../client/public/contracts");
  // await exec(
  //   "cp artifacts/contracts/DarkForestCore.sol/DarkForestCore.json ../client/public/contracts/"
  // );
  // await exec(
  //   "cp artifacts/contracts/DarkForestTokens.sol/DarkForestTokens.json ../client/public/contracts/"
  // );
  // await exec(
  //   "cp artifacts/contracts/Whitelist.sol/Whitelist.json ../client/public/contracts/"
  // );

  // this was deployed with deployer, is there a ProxyAdmin??
  // await upgrades.admin.changeProxyAdmin(deployer.address, deployer.address);

  // save environment variables (i.e. contract addresses) and contract ABI to cache-server
  // save the addresses of the deployed contracts to files that
  // are accessible by typesript, so that the client connects to the correct
  // contracts
  // fs.writeFileSync(
  //   isDev
  //     ? "../cache-server/src/local_contract_addr.ts"
  //     : "../cache-server/src/prod_contract_addr.ts",
  //   `export const contractAddress = '${coreContractAddress}';\nexport const tokensContract = '${tokensContractAddress}';\nexport const whitelistContract = '${whitelistContractAddress}';\n`
  // );

  // await exec(
  //   "cp artifacts/contracts/DarkForestCore.sol/DarkForestCore.json ../cache-server/src/abi/"
  // );
  // await exec(
  //   "cp artifacts/contracts/DarkForestTokens.sol/DarkForestTokens.json ../cache-server/src/abi/"
  // );
  // await exec(
  //   "cp artifacts/contracts/Whitelist.sol/Whitelist.json ../cache-server/src/abi/"
  // );

  console.log("Deployed successfully. Godspeed cadet.");
};

const deployWhitelist = async (
  whitelistControllerAddress: string
): Promise<Whitelist> => {
  const Whitelist = await ethers.getContractFactory("Whitelist");
  const whitelist = await upgrades.deployProxy(Whitelist, [
    whitelistControllerAddress,
    !isDev,
  ]);
  await whitelist.deployed();

  return whitelist as Whitelist;
};

const deployTokens = async (): Promise<DarkForestTokens> => {
  const DarkForestTokens = await ethers.getContractFactory("DarkForestTokens");
  // Defining structs like `Planet` is not yet supported, you can skip this
  // check with the `unsafeAllowCustomTypes` flag
  const darkForestTokens = await upgrades.deployProxy(DarkForestTokens, [], {
    initializer: false,
    unsafeAllowCustomTypes: true,
  });
  await darkForestTokens.deployed();
  return darkForestTokens as DarkForestTokens;
};

const deployCore = async (
  coreControllerAddress: string,
  whitelistAddress: string,
  tokensAddress: string
): Promise<DarkForestCore> => {
  const Utils = await ethers.getContractFactory("DarkForestUtils");
  const utils = await Utils.deploy();
  await utils.deployed();

  const LazyUpdate = await ethers.getContractFactory("DarkForestLazyUpdate");
  const lazyUpdate = await LazyUpdate.deploy();
  await lazyUpdate.deployed();

  const Planet = await ethers.getContractFactory("DarkForestPlanet", {
    libraries: {
      DarkForestLazyUpdate: lazyUpdate.address,
      DarkForestUtils: utils.address,
    },
  });
  const planet = await Planet.deploy();
  await planet.deployed();

  const Initialize = await ethers.getContractFactory("DarkForestInitialize");
  const initialize = await Initialize.deploy();
  await initialize.deployed();

  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();
  await verifier.deployed();

  const DarkForestCore = await ethers.getContractFactory("DarkForestCore", {
    libraries: {
      DarkForestInitialize: initialize.address,
      DarkForestPlanet: planet.address,
      DarkForestUtils: utils.address,
      Verifier: verifier.address,
    },
  });
  // Defining structs like `Proof` is not yet supported, you can skip this check
  // with the `unsafeAllowCustomTypes` flag
  // Linking external libraries like `DarkForestUtils` is not yet supported, or
  // skip this check with the `unsafeAllowLinkedLibraries` flag
  const darkForestCore = await upgrades.deployProxy(
    DarkForestCore,
    [coreControllerAddress, whitelistAddress, tokensAddress, DISABLE_ZK_CHECKS],
    { unsafeAllowCustomTypes: true, unsafeAllowLinkedLibraries: true }
  );
  await darkForestCore.deployed();
  return darkForestCore as DarkForestCore;
};

// const writeEnv = (filename: string, dict: Record<string, string>): void => {
//   const str = Object.entries(dict)
//     .map(([k, v]) => `${k}=${v}`)
//     .join("\n");
//   fs.writeFileSync(filename, str);
// };

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
