// Prepares the transactions that move ownership of the Factory, VenueToken and PromoterToken to a Safe.
// Read-only: it only prints calldata. It sends no transaction, writes no file and needs no private key.
//
// The contracts use Solady's two-step ownership handover:
//   1. The Safe calls requestOwnershipHandover() on each contract. The request is valid for 48 hours.
//   2. The current owner calls completeOwnershipHandover(SAFE) on each contract within those 48 hours.
//   3. Check that owner() of each contract returns the Safe (re-run this script).
//   4. The Safe, now owner of both credit tokens, gives itself DEFAULT_ADMIN_ROLE and MANAGER_ROLE on
//      them and removes both roles from the old owner.
// Never use renounceOwnership(): it leaves the contract without an owner, permanently.
//
// Usage:
//   SAFE_ADDRESS=0x... npx hardhat run \
//     scripts/mainnet-deployment/belong-checkin/18-prepare-ownership-handover-safe.ts --network <net>

import type { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

import fs from 'fs';

const HANDOVER_INTERFACE = new ethers.utils.Interface([
  'function requestOwnershipHandover() payable',
  'function completeOwnershipHandover(address pendingOwner) payable',
  'function setRole(address holder, uint256 role, bool active) payable',
  'function owner() view returns (address)',
  'function DEFAULT_ADMIN_ROLE() view returns (uint256)',
  'function MANAGER_ROLE() view returns (uint256)',
]);

type DeploymentJson = {
  factory?: { proxy?: unknown };
  tokens?: {
    venueToken?: { address?: unknown };
    promoterToken?: { address?: unknown };
  };
};

type HandoverTarget = {
  name: string;
  address: string;
  owner: string;
  isCreditToken: boolean;
};

function printTransaction(title: string, from: string, to: string, data: string): void {
  console.log(`  ${title}`);
  console.log('    From: ', from);
  console.log('    To:   ', to);
  console.log('    Value:', '0');
  console.log('    Data: ', data);
}

async function main() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentFile = `deployments/chainId-${chainId}.json`;

  const safeInput = process.env.SAFE_ADDRESS?.trim();
  if (!safeInput || !ethers.utils.isAddress(safeInput)) {
    throw new Error('SAFE_ADDRESS is required and must be a valid address.');
  }
  const safe = ethers.utils.getAddress(safeInput);
  if ((await ethers.provider.getCode(safe)) === '0x') {
    throw new Error(`SAFE_ADDRESS ${safe} has no contract code on chain ${chainId}: it is not a deployed Safe there.`);
  }
  const isSafe = (address: string): boolean => address.toLowerCase() === safe.toLowerCase();

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  const deployments: DeploymentJson = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));

  const recordedAddress = (value: unknown, field: string): string => {
    if (typeof value !== 'string' || !ethers.utils.isAddress(value)) {
      throw new Error(`Missing or invalid ${field} in ${deploymentFile}.`);
    }
    return ethers.utils.getAddress(value);
  };
  const factory = recordedAddress(deployments.factory?.proxy, 'factory.proxy');
  const venueToken = recordedAddress(deployments.tokens?.venueToken?.address, 'tokens.venueToken.address');
  const promoterToken = recordedAddress(deployments.tokens?.promoterToken?.address, 'tokens.promoterToken.address');
  const contracts = [
    { name: 'Factory', address: factory, isCreditToken: false },
    { name: 'VenueToken', address: venueToken, isCreditToken: true },
    { name: 'PromoterToken', address: promoterToken, isCreditToken: true },
  ];

  console.log(`Ownership handover to Safe ${safe} on chain ${chainId}. This script sends nothing.`);
  console.log('');
  console.log('Current owners:');
  const targets: HandoverTarget[] = [];
  for (const contract of contracts) {
    const owner: string = await new ethers.Contract(contract.address, HANDOVER_INTERFACE, ethers.provider).owner();
    if (owner === ethers.constants.AddressZero) {
      throw new Error(`${contract.name} ${contract.address} has no owner (renounced): nothing can be handed over.`);
    }
    const note = isSafe(owner) ? ' (already the Safe)' : '';
    console.log(`  ${contract.name} ${contract.address}: owner() = ${owner}${note}`);
    targets.push({ ...contract, owner });
  }

  const requestData = HANDOVER_INTERFACE.encodeFunctionData('requestOwnershipHandover');
  const completeData = HANDOVER_INTERFACE.encodeFunctionData('completeOwnershipHandover', [safe]);

  console.log('');
  console.log('Step 1 - Safe: request the handover on each contract.');
  for (const target of targets) {
    if (isSafe(target.owner)) {
      console.log(`  ${target.name}: owner is already the Safe, skipped.`);
    } else {
      printTransaction(`${target.name}: requestOwnershipHandover()`, safe, target.address, requestData);
    }
  }

  console.log('');
  console.log('Step 2 - current owner: complete the handover. Each request is valid for 48 hours after step 1.');
  for (const target of targets) {
    if (isSafe(target.owner)) {
      console.log(`  ${target.name}: owner is already the Safe, skipped.`);
    } else {
      printTransaction(`${target.name}: completeOwnershipHandover(Safe)`, target.owner, target.address, completeData);
    }
  }

  console.log('');
  console.log('Step 3 - check that owner() of every contract above returns the Safe (re-run this script).');

  console.log('');
  console.log('Step 4 - Safe: move the credit-token roles. Only after step 3 shows the Safe as owner.');
  for (const target of targets.filter(candidate => candidate.isCreditToken)) {
    const token = new ethers.Contract(target.address, HANDOVER_INTERFACE, ethers.provider);
    const defaultAdminRole: BigNumber = await token.DEFAULT_ADMIN_ROLE();
    const managerRole: BigNumber = await token.MANAGER_ROLE();
    const printSetRole = (holder: string, roleName: string, role: BigNumber, active: boolean): void => {
      const data = HANDOVER_INTERFACE.encodeFunctionData('setRole', [holder, role, active]);
      printTransaction(`${target.name}: setRole(${holder}, ${roleName}, ${active})`, safe, target.address, data);
    };

    printSetRole(safe, 'DEFAULT_ADMIN_ROLE', defaultAdminRole, true);
    printSetRole(safe, 'MANAGER_ROLE', managerRole, true);
    if (isSafe(target.owner)) {
      // The old owner can no longer be read from chain: never print a revoke that would target the Safe itself.
      console.log(`  ${target.name}: owner is already the Safe, so the old owner is unknown here.`);
      console.log('    Remove its roles with setRole(<old owner>, DEFAULT_ADMIN_ROLE, false) and');
      console.log('    setRole(<old owner>, MANAGER_ROLE, false), as printed by the run made before the handover.');
    } else {
      printSetRole(target.owner, 'DEFAULT_ADMIN_ROLE', defaultAdminRole, false);
      printSetRole(target.owner, 'MANAGER_ROLE', managerRole, false);
    }
  }

  console.log('');
  console.log('Never call renounceOwnership() on any of these contracts.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
