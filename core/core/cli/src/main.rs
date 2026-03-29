//! Axionax CLI - Command Line Interface
//!
//! Usage: axionax <command> [options]

use axionax_cli::{build_rpc_request, hex_to_decimal, parse_rpc_response};
use clap::{Parser, Subcommand};
use colored::*;
use serde_json::Value;

#[derive(Parser)]
#[command(name = "axionax")]
#[command(about = "Axionax Protocol CLI", long_about = None)]
#[command(version)]
struct Cli {
    /// RPC endpoint URL
    #[arg(short, long, default_value = "http://localhost:8545")]
    rpc: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Get node status
    Status,

    /// Get current block number
    BlockNumber,

    /// Get block by number
    Block {
        /// Block number (hex or "latest")
        #[arg(default_value = "latest")]
        number: String,
    },

    /// Get transaction by hash
    Tx {
        /// Transaction hash
        hash: String,
    },

    /// Staking commands
    #[command(subcommand)]
    Staking(StakingCommands),

    /// Governance commands
    #[command(subcommand)]
    Gov(GovCommands),
}

#[derive(Subcommand)]
enum StakingCommands {
    /// List active validators
    Validators,

    /// Get staking stats
    Stats,

    /// Get validator info
    Validator {
        /// Validator address
        address: String,
    },
}

#[derive(Subcommand)]
enum GovCommands {
    /// List active proposals
    Proposals,

    /// Get governance stats
    Stats,

    /// Get proposal details
    Proposal {
        /// Proposal ID
        id: u64,
    },
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    match run(cli).await {
        Ok(_) => {}
        Err(e) => {
            eprintln!("{} {}", "Error:".red().bold(), e);
            std::process::exit(1);
        }
    }
}

async fn run(cli: Cli) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();

    match cli.command {
        Commands::Status => {
            println!("{}", "Axionax Node Status".cyan().bold());
            println!("{}", "=".repeat(40));

            let height = rpc_call(&client, &cli.rpc, "eth_blockNumber", vec![]).await?;
            let chain_id = rpc_call(&client, &cli.rpc, "eth_chainId", vec![]).await?;

            println!("Chain ID:     {}", chain_id.as_str().unwrap_or("unknown").green());
            println!("Block Height: {}", height.as_str().unwrap_or("0").green());
            println!("RPC Endpoint: {}", cli.rpc.yellow());
            println!("{}", "Status: Online".green().bold());
        }

        Commands::BlockNumber => {
            let result = rpc_call(&client, &cli.rpc, "eth_blockNumber", vec![]).await?;
            let hex = result.as_str().unwrap_or("0x0");
            let num = hex_to_decimal(hex);
            println!("{} ({})", hex.green(), num);
        }

        Commands::Block { number } => {
            let result = rpc_call(
                &client,
                &cli.rpc,
                "eth_getBlockByNumber",
                vec![serde_json::json!(number), serde_json::json!(false)],
            )
            .await?;

            if result.is_null() {
                println!("{}", "Block not found".red());
            } else {
                println!("{}", "Block Details".cyan().bold());
                println!("{}", "=".repeat(40));
                println!("Number:      {}", result["number"].as_str().unwrap_or("").green());
                println!("Hash:        {}", result["hash"].as_str().unwrap_or("").yellow());
                println!("Parent:      {}", result["parent_hash"].as_str().unwrap_or(""));
                println!("Proposer:    {}", result["proposer"].as_str().unwrap_or(""));
                println!("Timestamp:   {}", result["timestamp"].as_str().unwrap_or(""));
                println!("Txns:        {}", result["transactions"].as_array().map(|a| a.len()).unwrap_or(0));
            }
        }

        Commands::Tx { hash } => {
            let result = rpc_call(&client, &cli.rpc, "eth_getTransactionByHash", vec![serde_json::json!(hash)]).await?;

            if result.is_null() {
                println!("{}", "Transaction not found".red());
            } else {
                println!("{}", "Transaction Details".cyan().bold());
                println!("{}", "=".repeat(40));
                println!("Hash:   {}", result["hash"].as_str().unwrap_or("").green());
                println!("From:   {}", result["from"].as_str().unwrap_or(""));
                println!("To:     {}", result["to"].as_str().unwrap_or(""));
                println!("Value:  {}", result["value"].as_str().unwrap_or("0"));
            }
        }

        Commands::Staking(cmd) => match cmd {
            StakingCommands::Validators => {
                let result = rpc_call(&client, &cli.rpc, "staking_getActiveValidators", vec![]).await?;

                println!("{}", "Active Validators".cyan().bold());
                println!("{}", "=".repeat(60));

                if let Some(validators) = result.as_array() {
                    for v in validators {
                        println!(
                            "{} | Stake: {} | Active: {}",
                            v["address"].as_str().unwrap_or("").green(),
                            v["stake"].as_str().unwrap_or("0"),
                            if v["is_active"].as_bool().unwrap_or(false) { "✓".green() } else { "✗".red() }
                        );
                    }
                    println!("\nTotal: {} validators", validators.len());
                }
            }

            StakingCommands::Stats => {
                let result = rpc_call(&client, &cli.rpc, "staking_getStats", vec![]).await?;

                println!("{}", "Staking Statistics".cyan().bold());
                println!("{}", "=".repeat(40));
                println!("Total Staked:      {}", result["total_staked"].as_str().unwrap_or("0").green());
                println!("Total Validators:  {}", result["total_validators"]);
                println!("Active Validators: {}", result["active_validators"]);
                println!("Min Stake:         {}", result["min_stake"].as_str().unwrap_or("0"));
            }

            StakingCommands::Validator { address } => {
                let result = rpc_call(&client, &cli.rpc, "staking_getValidator", vec![serde_json::json!(address)]).await?;

                if result.is_null() {
                    println!("{}", "Validator not found".red());
                } else {
                    println!("{}", "Validator Details".cyan().bold());
                    println!("{}", "=".repeat(40));
                    println!("Address:    {}", result["address"].as_str().unwrap_or("").green());
                    println!("Stake:      {}", result["stake"].as_str().unwrap_or("0"));
                    println!("Delegated:  {}", result["delegated"].as_str().unwrap_or("0"));
                    println!("Power:      {}", result["voting_power"].as_str().unwrap_or("0"));
                    println!("Active:     {}", if result["is_active"].as_bool().unwrap_or(false) { "Yes".green() } else { "No".red() });
                    println!("Rewards:    {}", result["unclaimed_rewards"].as_str().unwrap_or("0"));
                }
            }
        },

        Commands::Gov(cmd) => match cmd {
            GovCommands::Proposals => {
                let result = rpc_call(&client, &cli.rpc, "gov_getActiveProposals", vec![]).await?;

                println!("{}", "Active Proposals".cyan().bold());
                println!("{}", "=".repeat(60));

                if let Some(proposals) = result.as_array() {
                    for p in proposals {
                        println!(
                            "#{} | {} | {}",
                            p["id"],
                            p["title"].as_str().unwrap_or("").green(),
                            p["status"].as_str().unwrap_or("")
                        );
                    }
                    println!("\nTotal: {} active proposals", proposals.len());
                }
            }

            GovCommands::Stats => {
                let result = rpc_call(&client, &cli.rpc, "gov_getStats", vec![]).await?;

                println!("{}", "Governance Statistics".cyan().bold());
                println!("{}", "=".repeat(40));
                println!("Active Proposals:    {}", result["active_proposals"]);
                println!("Voting Period:       {} blocks", result["voting_period_blocks"]);
                println!("Execution Delay:     {} blocks", result["execution_delay_blocks"]);
                println!("Quorum:              {} bps", result["quorum_bps"]);
                println!("Pass Threshold:      {} bps", result["pass_threshold_bps"]);
                println!("Min Proposal Stake:  {}", result["min_proposal_stake"].as_str().unwrap_or("0"));
            }

            GovCommands::Proposal { id } => {
                let result = rpc_call(&client, &cli.rpc, "gov_getProposal", vec![serde_json::json!(id)]).await?;

                if result.is_null() {
                    println!("{}", "Proposal not found".red());
                } else {
                    println!("{}", format!("Proposal #{}", id).cyan().bold());
                    println!("{}", "=".repeat(40));
                    println!("Title:       {}", result["title"].as_str().unwrap_or("").green());
                    println!("Proposer:    {}", result["proposer"].as_str().unwrap_or(""));
                    println!("Type:        {}", result["proposal_type"].as_str().unwrap_or(""));
                    println!("Status:      {}", result["status"].as_str().unwrap_or(""));
                    println!("Votes For:   {}", result["votes_for"].as_str().unwrap_or("0").green());
                    println!("Votes Against: {}", result["votes_against"].as_str().unwrap_or("0").red());
                    println!("Votes Abstain: {}", result["votes_abstain"].as_str().unwrap_or("0"));
                }
            }
        },
    }

    Ok(())
}

async fn rpc_call(
    client: &reqwest::Client,
    url: &str,
    method: &str,
    params: Vec<Value>,
) -> Result<Value, Box<dyn std::error::Error>> {
    let body = build_rpc_request(method, params);

    let response = client
        .post(url)
        .json(&body)
        .send()
        .await?
        .json::<Value>()
        .await?;

    parse_rpc_response(&response).map_err(|e| e.into())
}
