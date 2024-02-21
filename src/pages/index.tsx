import React, { useState, useEffect } from "react";
import {
  createSmartAccountClient,
  BiconomySmartAccountV2,
  PaymasterMode,
} from "@biconomy/account";
import { ethers } from "ethers";
import { Magic } from "magic-sdk";
import { contractABI } from "../contract/contractABI";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Create a provider for the Polygon Mumbai network
const provider = new ethers.providers.JsonRpcProvider(
  "https://rpc.ankr.com/polygon_mumbai"
);

// Specify the chain ID for Polygon Mumbai
let chainId = 80001; // Polygon Mumbai or change as per your preferred chain

export default function Home() {
  const [smartAccount, setSmartAccount] =
    useState<BiconomySmartAccountV2 | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(
    null
  );
  const [count, setCount] = useState<string | null>(null);
  const [txnHash, setTxnHash] = useState<string | null>(null);

  let magic: any;

  useEffect(() => {
    // Initialize the Magic instance
    //You can get your own API key by signing up for Magic here: https://dashboard.magic.link/signup
    //Don't have an API KEY yet? Use this - "pk_live_B3CC63B614156D0E"
    magic = new Magic("pk_live_B3CC63B614156D0E", {
      network: {
        rpcUrl: "https://rpc.ankr.com/polygon_mumbai",
        chainId: chainId, // Polygon Mumbai or change as per your preferred chain
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

      const config = {
        biconomyPaymasterApiKey:
          "-RObQRX9ei.fc6918eb-c582-4417-9d5a-0507b17cfe71",
        bundlerUrl: `https://bundler.biconomy.io/api/v2/${chainId}/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44`, // <-- Read about this at https://docs.biconomy.io/dashboard#bundler-url
      };

      const smartWallet = await createSmartAccountClient({
        signer: web3Provider.getSigner(),
        biconomyPaymasterApiKey: config.biconomyPaymasterApiKey,
        bundlerUrl: config.bundlerUrl,
        rpcUrl: "https://rpc.ankr.com/polygon_mumbai",
      });

      console.log("Biconomy Smart Account", smartWallet);
      setSmartAccount(smartWallet);
      const saAddress = await smartWallet.getAccountAddress();
      console.log("Smart Account Address", saAddress);
      setSmartAccountAddress(saAddress);
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
    try {
      const toastId = toast("Populating Transaction", { autoClose: false });

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

      toast.update(toastId, {
        render: "Sending Transaction",
        autoClose: false,
      });
      //@ts-ignore
      const userOpResponse = await smartAccount?.sendTransaction(tx1, {
        paymasterServiceData: { mode: PaymasterMode.SPONSORED },
      });
      //@ts-ignore
      const { transactionHash } = await userOpResponse.waitForTxHash();
      console.log("Transaction Hash", transactionHash);

      if (transactionHash) {
        toast.update(toastId, {
          render: "Transaction Successful",
          type: "success",
          autoClose: 5000,
        });
        setTxnHash(transactionHash);
      }

      await getCountId();
    } catch (error) {
      console.log(error);
      toast.error("Transaction Unsuccessful", { autoClose: 5000 });
    }
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
          <span>Network: Polygon Mumbai</span>
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
              {txnHash && (
                <a
                  target="_blank"
                  href={`https://mumbai.polygonscan.com/tx/${txnHash}`}
                >
                  <span className="text-white font-bold underline">
                    Txn Hash
                  </span>
                </a>
              )}
            </div>
          </div>
          <span className="text-white">Open console to view console logs.</span>
        </>
      )}
    </main>
  );
}
