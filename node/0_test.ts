import { SigningCosmWasmClient, Secp256k1HdWallet, GasPrice, Coin } from "cosmwasm";

import * as fs from 'fs';
import axios from 'axios';
import { ClientRequest } from "http";
import assert from "assert";


const rpcEndpoint= "https://rpc-test.osmosis.zone";
// const rpcEndpoint = "https://rpc.testnet.osmosis.zone";
// const rpcEndpoint = "https://lcd.osmo-test.ccvalidators.com/";
// const rpcEndpoint = "https://testnet-rest.osmosis.zone/"
const swap_wasm = fs.readFileSync("../artifacts/osmo_swap.wasm");

const mnemonic =
"steak indicate rice motor change pond clarify sign fade call umbrella fork";

const swap_code_id = 5102;

const swap_addr = "osmo1t2da8tmaszhcthvmkuxgm7e3sfjz22ydv299wkmgtdl62w6va9eslnkkpz";
// #"osmo1fjwcwk70ztzz48fahev0qxhlnpwmsy60jdm83v2vnc7kyhh9ph7srytxfq";

export interface Timestamp {
    nanos: number;
    seconds: number;
    [k: string]: unknown;
  }

async function setupClient(mnemonic: string, rpc: string, gas: string | undefined): Promise<SigningCosmWasmClient> {
    if (gas === undefined) {
        let wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, { prefix: 'osmo'});
        let client = await SigningCosmWasmClient.connectWithSigner(rpc, wallet);
        return client;
    } else {
        let gas_price = GasPrice.fromString(gas);
        let wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, { prefix: 'osmo' });
        let client = await SigningCosmWasmClient.connectWithSigner(rpc, wallet, { gasPrice: gas_price });
        return client;
    }
}

async function getAddress(mnemonic: string, prefix: string = 'osmo') {
    let wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, { prefix });
    let accounts = await wallet.getAccounts();
    return accounts[0].address;
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe("swap Fullstack Test", () => {
    xit("Generate Wallet", async () => {
        let wallet = await Secp256k1HdWallet.generate(12);
        console.log(wallet.mnemonic);
    });

    xit("Get Address", async() => {
        console.log(await getAddress(mnemonic));
    }).timeout(200000);

    xit("Get Testnet Tokens", async () => {
        console.log(await getAddress(mnemonic));
        try {
            let res = await axios.post("https://faucet.osmosis.zone", { "denom": "uosmo", "address": await getAddress(mnemonic) });
            console.log(res);
        } catch (e) {
            console.log(e);
        }
    }).timeout(100000);

    xit("Send Testnet Tokens", async () => {
        let client = await setupClient(mnemonic, rpcEndpoint, "0.025uosmo");
        let receiver = "";
        let res = await client.sendTokens(await getAddress(mnemonic), receiver, [{denom:"uosmo", amount:"1000000"}], "auto");
        console.log(res);
    }).timeout(100000);

    xit("Balance Testnet Tokens", async () => {
        let client = await setupClient(mnemonic, rpcEndpoint, "0.025uosmo");
        let res = await client.getBalance(await getAddress(mnemonic), "uosmo");
        console.log(res);  
        let res2 = await client.getBalance(await getAddress(mnemonic), 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2');
        console.log(res2);   
    }).timeout(100000);


    //same as
    //junod tx wasm store artifacts/messages.wasm --from wallet --node https://rpc.uni.juno.deuslabs.fi --chain_id=uni-3 --gas-price=0.025uosmo --gas auto
    xit("1. Upload code to testnet", async () => {
        let client = await setupClient(mnemonic, rpcEndpoint, "0.025uosmo");
        let res = await client.upload(await getAddress(mnemonic), swap_wasm, "auto");
        console.log("Osmo contract: %s",JSON.stringify(res.logs[0].events));
    }).timeout(100000);


    xit("2. Instantiate contract code on testnet", async () => {
        let client = await setupClient(mnemonic, rpcEndpoint, "0.025uosmo");
            let res = await client.instantiate(await getAddress(mnemonic), swap_code_id, 
            {debug: true}, "messages", "auto");

        //InstantiateMsg {name: String, symbol: String, decimals: u8, initial_balances: Vec<Cw20Coin>, mint: Option<MinterResponse>, marketing: Option<InstantiateMarketingInfo>,}
        //  Cw20Coin {address: String, amount: Uint128,}
 
        //console.log(res);
        for (let i = 0; i<res.logs[0].events.length; i++) {
            console.log("------------EVENTS[%s]-----------------",i);
            console.log(res.logs[0].events[i]);          
        };
    }).timeout(60000);

    it("3. Query pool", async () => {
            let client = await setupClient(mnemonic, rpcEndpoint, "0.025uosmo");
            let res = await client.queryContractSmart(swap_addr, { query_pool : {pool_id: 3}});

            console.log(res);
            console.log("------------assets-----------------");
            console.log(res['pool']['pool_assets']);
        }).timeout(100000);

    xit("4. Query pool params", async () => {
        let client = await setupClient(mnemonic, rpcEndpoint, "0.025uosmo");
        let res = await client.queryContractSmart(swap_addr, { query_pool_params : {pool_id: 4}});

        console.log(res);
        // console.log("------------assets-----------------");
        // console.log(res['pool']['pool_assets']);
    }).timeout(100000);

    xit("5. Query epoch info", async () => {
        let client = await setupClient(mnemonic, rpcEndpoint, "0.025uosmo");
        let res = await client.queryContractSmart(swap_addr, { query_epochs_info : {}});
        console.log(res);
    }).timeout(100000);


    xit("6. Query arithmetic twap", async () => {
        let client = await setupClient(mnemonic, rpcEndpoint, "0.025uosmo");
        let res = await client.queryContractSmart(swap_addr, {
            query_arithmetic_twap : {
                pool_id: 1,
                base_asset: "uosmo",
                quote_asset: "ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2",
                start_time: "2023-01-03T13:35:58+00:00"
                // start_time: `${new Date(1635209044000).toISOString().slice(0, 23)}`
        }});
        console.log(res);
    }).timeout(100000);
 
    xit("7. swap exact amount in", async () => {
        let client = await setupClient(mnemonic, rpcEndpoint, "0.025uosmo");

        let out_denom = "ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2";
        let res = await client.execute(await getAddress(mnemonic), 
        swap_addr, { execute_swap_exact_amount_in: 
            {
                routes: [{pool_id: "1", 
                        token_out_denom: out_denom}],
                token_in: {amount: "10000", denom: "uosmo"}, 
                token_out_min_amount: "2550"
            }},

        "auto", "", 
        [{amount: "1000", denom: "uosmo"}]);

        console.log(res);
        console.log("\nxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n");
        let events = res['logs'][0]['events'];
        console.log(events);

        for (const ev of events) {
            console.log('---------------------------------');
            console.log(ev.type.toUpperCase());
            for (const val of ev.attributes) {
                console.log(val);
                };
            console.log('\n');
        };


        // for (let i = 0; i<res['contracts'].length; i++) {
        //     console.log("------------CONTRACTS[%s]-----------------", i);
        //     console.log(res['contracts'][i]);
        //     console.log("___________________________________________");
        // }

    }).timeout(100000);

    xit("8. swap exact amount in", async () => {
        let client = await setupClient(mnemonic, rpcEndpoint, "0.025uosmo");

        let in_denom = "ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2";
        let out_denom = "uosmo";
        let res = await client.execute(await getAddress(mnemonic), 
        swap_addr, { execute_swap_exact_amount_in: 
            {
                routes: [{pool_id: "1", 
                        token_out_denom: out_denom}],
                token_in: {amount: "38946", denom: in_denom}, 
                token_out_min_amount: "2550"
            }},

        "auto", "", 
        [{amount: "1000", denom: "uosmo"}]);
        console.log(res);
        console.log("\nxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n");
        console.log(res['logs'][0]['events']);
        let events = res['logs'][0]['events'];

        for (const ev of events) {
            console.log('---------------------------------');
            console.log(ev.type.toUpperCase());
            for (const val of ev.attributes) {
                console.log(val);
                };
            console.log('\n');
        };


        // for (let i = 0; i<res['contracts'].length; i++) {
        //     console.log("------------CONTRACTS[%s]-----------------", i);
        //     console.log(res['contracts'][i]);
        //     console.log("___________________________________________");
        // }

    }).timeout(100000);

});