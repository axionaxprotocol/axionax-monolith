#!/usr/bin/env node

/**
 * Genesis Generator CLI
 *
 * Command-line tool for generating mainnet genesis blocks
 * from testnet snapshot data.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import {
  generateGenesis,
  validateGenesis,
  exportGenesisJSON,
  type GenerateGenesisOptions,
} from './generator.js';
import { verifyMerkleProof } from './merkle.js';
import { exportAllocationsCSV, formatAllocation, type AddressScore } from './allocations.js';

const program = new Command();

// ============================================
// CLI Configuration
// ============================================

program
  .name('genesis-generator')
  .description('Generate mainnet genesis blocks from testnet data')
  .version('0.1.0');

// ============================================
// Generate Command
// ============================================

program
  .command('generate')
  .description('Generate a genesis block from testnet snapshot')
  .option('-i, --input <file>', 'Input snapshot JSON file')
  .option('-o, --output <file>', 'Output genesis JSON file', 'genesis.json')
  .option('-c, --chain-id <id>', 'Mainnet chain ID (match core-universe)', '86150')
  .option('-n, --name <name>', 'Network name', 'axionax-mainnet')
  .option('--consensus <type>', 'Consensus type (clique|ethash)', 'clique')
  .option('--signers <addresses>', 'Comma-separated signer addresses for Clique')
  .option('--gas-limit <limit>', 'Block gas limit', '0x1c9c380')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    console.log(chalk.cyan('\n🚀 Axionax Genesis Generator\n'));

    const config: Partial<GenerateGenesisOptions> = {
      chainId: parseInt(options.chainId),
      chainName: options.name,
      consensusType: options.consensus as 'clique' | 'ethash',
      gasLimit: options.gasLimit,
    };

    // Interactive mode
    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'chainId',
          message: 'Mainnet Chain ID:',
          default: '86150',
        },
        {
          type: 'input',
          name: 'chainName',
          message: 'Network name:',
          default: 'axionax-mainnet',
        },
        {
          type: 'list',
          name: 'consensusType',
          message: 'Consensus type:',
          choices: ['clique', 'ethash'],
          default: 'clique',
        },
        {
          type: 'input',
          name: 'inputFile',
          message: 'Snapshot input file:',
          default: 'snapshot.json',
        },
        {
          type: 'input',
          name: 'outputFile',
          message: 'Genesis output file:',
          default: 'genesis.json',
        },
      ]);

      config.chainId = parseInt(answers.chainId);
      config.chainName = answers.chainName;
      config.consensusType = answers.consensusType;
      options.input = answers.inputFile;
      options.output = answers.outputFile;

      if (answers.consensusType === 'clique') {
        const signerAnswer = await inquirer.prompt([
          {
            type: 'input',
            name: 'signers',
            message: 'Signer addresses (comma-separated):',
          },
        ]);
        if (signerAnswer.signers) {
          config.cliqueSigners = signerAnswer.signers.split(',').map((s: string) => s.trim());
        }
      }
    }

    // Parse signers if provided
    if (options.signers) {
      config.cliqueSigners = options.signers.split(',').map((s: string) => s.trim());
    }

    // Load snapshot data
    const spinner = ora('Loading snapshot data...').start();

    try {
      let snapshotData: { block: number; timestamp: string; scores: AddressScore[] };

      if (options.input && existsSync(options.input)) {
        const rawData = readFileSync(resolve(options.input), 'utf-8');
        snapshotData = JSON.parse(rawData);
      } else {
        // Demo data for testing
        spinner.info('No input file provided, using demo data');
        snapshotData = {
          block: 1000000,
          timestamp: new Date().toISOString(),
          scores: [
            { address: '0x1111111111111111111111111111111111111111', score: 5500 },
            { address: '0x2222222222222222222222222222222222222222', score: 2000 },
            { address: '0x3333333333333333333333333333333333333333', score: 800 },
            { address: '0x4444444444444444444444444444444444444444', score: 300 },
            { address: '0x5555555555555555555555555555555555555555', score: 150 },
          ],
        };
      }

      spinner.succeed('Snapshot loaded');

      // Generate genesis
      spinner.start('Generating genesis block...');

      const fullOptions: GenerateGenesisOptions = {
        ...(config as GenerateGenesisOptions),
        testnetSnapshot: {
          block: snapshotData.block,
          timestamp: new Date(snapshotData.timestamp),
          scores: snapshotData.scores,
        },
      };

      const result = generateGenesis(fullOptions);

      // Validate
      const validation = validateGenesis(result.genesis);
      if (!validation.valid) {
        spinner.fail('Genesis validation failed');
        console.error(chalk.red('Errors:'), validation.errors);
        process.exit(1);
      }

      spinner.succeed('Genesis block generated');

      // Write output
      spinner.start('Writing output files...');

      const genesisJson = exportGenesisJSON(result.genesis);
      writeFileSync(resolve(options.output), genesisJson);

      // Write metadata
      const metadataFile = options.output.replace('.json', '-metadata.json');
      writeFileSync(resolve(metadataFile), JSON.stringify(result.metadata, null, 2));

      // Write proofs
      const proofsFile = options.output.replace('.json', '-proofs.json');
      const proofsObj: Record<string, string[]> = {};
      result.proofs.forEach((proof, addr) => {
        proofsObj[addr] = proof;
      });
      writeFileSync(resolve(proofsFile), JSON.stringify(proofsObj, null, 2));

      spinner.succeed('Output files written');

      // Summary
      console.log(chalk.green('\n✅ Genesis generation complete!\n'));
      console.log(chalk.white('Files created:'));
      console.log(chalk.gray(`  - ${options.output}`));
      console.log(chalk.gray(`  - ${metadataFile}`));
      console.log(chalk.gray(`  - ${proofsFile}`));
      console.log(chalk.white('\nStatistics:'));
      console.log(chalk.gray(`  Chain ID: ${config.chainId}`));
      console.log(chalk.gray(`  Merkle Root: ${result.merkleRoot}`));
      console.log(chalk.gray(`  Total Allocations: ${result.metadata.allocations.total}`));
      console.log(
        chalk.gray(
          `  Total Amount: ${formatAllocation(result.metadata.allocations.totalAmount)} AXX`,
        ),
      );
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// ============================================
// Validate Command
// ============================================

program
  .command('validate')
  .description('Validate a genesis JSON file')
  .argument('<file>', 'Genesis JSON file to validate')
  .action((file) => {
    console.log(chalk.cyan('\n🔍 Validating genesis file...\n'));

    try {
      const rawData = readFileSync(resolve(file), 'utf-8');
      const genesis = JSON.parse(rawData);

      const result = validateGenesis(genesis);

      if (result.valid) {
        console.log(chalk.green('✅ Genesis file is valid'));
        console.log(chalk.gray(`\n  Chain ID: ${genesis.config.chainId}`));
        console.log(chalk.gray(`  Allocations: ${Object.keys(genesis.alloc).length}`));
        console.log(chalk.gray(`  Gas Limit: ${genesis.gasLimit}`));
      } else {
        console.log(chalk.red('❌ Genesis file is invalid'));
        console.log(chalk.yellow('\nErrors:'));
        for (const error of result.errors) {
          console.log(chalk.red(`  - ${error}`));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error reading file:'), error);
      process.exit(1);
    }
  });

// ============================================
// Verify Command
// ============================================

program
  .command('verify')
  .description('Verify a Merkle proof for an address')
  .option('-a, --address <address>', 'Address to verify')
  .option('-m, --amount <amount>', 'Amount (in wei)')
  .option('-p, --proof <file>', 'Proof JSON file')
  .option('-r, --root <hash>', 'Merkle root')
  .action((options) => {
    console.log(chalk.cyan('\n🔐 Verifying Merkle proof...\n'));

    try {
      let proof: string[];

      if (options.proof) {
        const rawData = readFileSync(resolve(options.proof), 'utf-8');
        const proofs = JSON.parse(rawData);
        proof = proofs[options.address.toLowerCase()];
      } else {
        console.error(chalk.red('Please provide a proof file'));
        process.exit(1);
      }

      if (!proof) {
        console.error(chalk.red('Proof not found for address'));
        process.exit(1);
      }

      const isValid = verifyMerkleProof(options.address, options.amount, proof, options.root);

      if (isValid) {
        console.log(chalk.green('✅ Proof is valid'));
        console.log(chalk.gray(`\n  Address: ${options.address}`));
        console.log(chalk.gray(`  Amount: ${formatAllocation(options.amount)} AXX`));
      } else {
        console.log(chalk.red('❌ Proof is invalid'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Verification error:'), error);
      process.exit(1);
    }
  });

// ============================================
// Export Command
// ============================================

program
  .command('export')
  .description('Export allocations to CSV')
  .argument('<input>', 'Genesis or metadata JSON file')
  .option('-o, --output <file>', 'Output CSV file', 'allocations.csv')
  .action((input, options) => {
    console.log(chalk.cyan('\n📊 Exporting allocations...\n'));

    try {
      const rawData = readFileSync(resolve(input), 'utf-8');
      const data = JSON.parse(rawData);

      // Extract allocations from genesis or metadata
      let allocations;
      if (data.alloc) {
        // Genesis file
        const allocEntries = Object.entries(data.alloc) as [string, { balance?: string }][];
        allocations = allocEntries.map(([address, info]) => ({
          address,
          amount: BigInt(info?.balance ?? 0).toString(),
          tier: 'unknown',
          score: 0,
          percentage: 0,
        }));
      } else if (data.allocations) {
        allocations = data.allocations;
      } else {
        console.error(chalk.red('No allocations found in file'));
        process.exit(1);
      }

      const csv = exportAllocationsCSV(allocations);
      writeFileSync(resolve(options.output), csv);

      console.log(
        chalk.green(`✅ Exported ${allocations.length} allocations to ${options.output}`),
      );
    } catch (error) {
      console.error(chalk.red('Export error:'), error);
      process.exit(1);
    }
  });

// ============================================
// Run CLI
// ============================================

program.parse();
