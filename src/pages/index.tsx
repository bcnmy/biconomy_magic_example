import React, { useState, useEffect } from "react";
import { IPaymaster, BiconomyPaymaster } from "@biconomy/paymaster";
import { IBundler, Bundler } from "@biconomy/bundler";
import {
  BiconomySmartAccountV2,
  DEFAULT_ENTRYPOINT_ADDRESS,
} from "@biconomy/account";
import {
  IHybridPaymaster,
  SponsorUserOperationDto,
  PaymasterMode,
} from "@biconomy/paymaster";
import { ethers } from "ethers";
import { ChainId } from "@biconomy/core-types";
import {
  ECDSAOwnershipValidationModule,
  DEFAULT_ECDSA_OWNERSHIP_MODULE,
} from "@biconomy/modules";
import { Magic } from "magic-sdk";
import { contractABI } from "../contract/contractABI";

// Create a provider for the Polygon Mumbai network
const provider = new ethers.providers.JsonRpcProvider(
  "https://rpc.ankr.com/polygon_mumbai"
);


// Specify the chain ID for Polygon Mumbai
let chainId = 80001; // Polygon Mumbai or change as per your preferred chain

// Create a Bundler instance
const bundler: IBundler = new Bundler({
  // get from biconomy dashboard https://dashboard.biconomy.io/
  // for mainnet bundler url contact us on Telegram
  bundlerUrl:
    `https://bundler.biconomy.io/api/v2/${chainId}/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44`,
  chainId: ChainId.POLYGON_MUMBAI, // or any supported chain of your choice
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
});


// Create a Paymaster instance
const paymaster: IPaymaster = new BiconomyPaymaster({
  // get from biconomy dashboard https://dashboard.biconomy.io/
  // Use this paymaster url for testing, you'll need to create your own paymaster for gasless transactions on your smart contracts.
  paymasterUrl:
    "https://paymaster.biconomy.io/api/v1/80001/-RObQRX9ei.fc6918eb-c582-4417-9d5a-0507b17cfe71",
});


export default function Home() {
  const [smartAccount, setSmartAccount] =
    useState<BiconomySmartAccountV2 | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(
    null
  );
  const [count, setCount] = useState<string | null>(null);

  let magic: any;

  useEffect(() => {
    // Initialize the Magic instance
    //You can get your own API key by signing up for Magic here: https://dashboard.magic.link/signup
    //Don't have an API KEY yet? Use this - "pk_live_DBDD65D080E15415"
    magic = new Magic("pk_live_DBDD65D080E15415", {
      network: {
        rpcUrl: "https://rpc.ankr.com/polygon_mumbai",
        chainId: 80001, // Polygon Mumbai or change as per your preferred chain
      },
    });

    console.log("Magic initialized", magic);
  }, []);

  const connect = async () => {
    try {
      await magic.wallet.connectWithUI();
      const web3Provider = new ethers.providers.Web3Provider(
        magic.rpcProvider,
        "any"
      );

      const ecdsaModule = await ECDSAOwnershipValidationModule.create({
        signer: web3Provider.getSigner(),
        moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE,
      });

      let biconomySmartAccount = await BiconomySmartAccountV2.create({
        chainId: ChainId.POLYGON_MUMBAI,
        bundler: bundler,
        paymaster: paymaster,
        entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
        defaultValidationModule: ecdsaModule,
        activeValidationModule: ecdsaModule,
      });
      console.log(biconomySmartAccount);
      setSmartAccount(biconomySmartAccount);
      const address = await biconomySmartAccount.getAccountAddress();
      console.log(address);
      setSmartAccountAddress(address);
    } catch (error) {
      console.error(error);
    }
  };

  const getCountId = async () => {
    const contractAddress = "0xc34E02663D5FFC7A1CeaC3081bF811431B096C8C";
    const contractInstance = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );
    const countId = await contractInstance.getCount();
    setCount(countId.toString());
  };

  const incrementCount = async () => {
    const contractAddress = "0xc34E02663D5FFC7A1CeaC3081bF811431B096C8C";
    const contractInstance = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );
    const minTx = await contractInstance.populateTransaction.increment();
    console.log("Mint Tx Data", minTx.data);
    const tx1 = {
      to: contractAddress,
      data: minTx.data,
    };
    let userOp = await smartAccount?.buildUserOp([tx1]);
    console.log("UserOp", { userOp });
    const biconomyPaymaster =
      smartAccount?.paymaster as IHybridPaymaster<SponsorUserOperationDto>;
    let paymasterServiceData: SponsorUserOperationDto = {
      mode: PaymasterMode.SPONSORED,
      smartAccountInfo: {
        name: "BICONOMY",
        version: "2.0.0",
      },
    };
    const paymasterAndDataResponse =
      await biconomyPaymaster?.getPaymasterAndData(
        //@ts-ignore
        userOp,
        paymasterServiceData
      );

    //@ts-ignore
    userOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData;
    //@ts-ignore
    const userOpResponse = await smartAccount?.sendUserOp(userOp);
    console.log("userOpHash", { userOpResponse });
    //@ts-ignore
    const { receipt } = await userOpResponse.wait(1);
    console.log("txHash", receipt.transactionHash);

    await getCountId();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-8 p-24">
      <div className="text-[4rem] font-bold text-orange-400">
        Biconomy-Magic
      </div>
      {!smartAccount && (
        <button
          className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
          onClick={connect}
        >
          Magic Sign in
        </button>
      )}

      {smartAccount && (
        <>
          {" "}
          <span>Smart Account Address</span>
          <span>{smartAccountAddress}</span>
          <div className="flex flex-row justify-between items-start gap-8">
            <div className="flex flex-col justify-center items-center gap-4">
              <button
                className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
                onClick={getCountId}
              >
                Get Count Id
              </button>
              <span>{count}</span>
            </div>
            <div className="flex flex-col justify-center items-center gap-4">
              <button
                className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
                onClick={incrementCount}
              >
                Increment Count
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
