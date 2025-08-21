// scripts/deploy.js
import hre from "hardhat";

async function main() {
  const { ethers } = hre; // pull ethers from hre
  const AnimalRegistry = await ethers.getContractFactory("AnimalRegistry");
  const animalRegistry = await AnimalRegistry.deploy();

  await animalRegistry.waitForDeployment();

  console.log("✅ AnimalRegistry deployed to:", await animalRegistry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
