import React, { useState, useEffect } from "react";
import {
  BiconomySmartAccountV2,
  BiconomySmartAccountV2Config,
} from "@biconomy/account";
import {
  IHybridPaymaster,
  SponsorUserOperationDto,
  PaymasterMode,
} from "@biconomy/paymaster";
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

      const biconomySmartAccountConfig: BiconomySmartAccountV2Config = {
        signer: web3Provider.getSigner(),
        chainId: 80001,
        biconomyPaymasterApiKey:
          "-RObQRX9ei.fc6918eb-c582-4417-9d5a-0507b17cfe71",
        bundlerUrl: `https://bundler.biconomy.io/api/v2/${chainId}/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44`,
      };

      let biconomySmartAccount = await BiconomySmartAccountV2.create(
        biconomySmartAccountConfig
      );

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

      toast.update(toastId, { render: "Building UserOp", autoClose: false });
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

      //Add the below if statement if you encounter AA34 signature Error
      if (
        userOp &&
        paymasterAndDataResponse.callGasLimit &&
        paymasterAndDataResponse.verificationGasLimit &&
        paymasterAndDataResponse.preVerificationGas
      ) {
        // Returned gas limits must be replaced in your op as you update paymasterAndData.
        // Because these are the limits paymaster service signed on to generate paymasterAndData
        // If you receive AA34 error check here..

        userOp.callGasLimit = paymasterAndDataResponse.callGasLimit;
        userOp.verificationGasLimit =
          paymasterAndDataResponse.verificationGasLimit;
        userOp.preVerificationGas = paymasterAndDataResponse.preVerificationGas;
      }

      toast.update(toastId, { render: "Sending UserOp", autoClose: false });
      //@ts-ignore
      const userOpResponse = await smartAccount?.sendUserOp(userOp);
      console.log("userOpHash", { userOpResponse });
      //@ts-ignore
      const { receipt } = await userOpResponse.wait(1);
      console.log("txHash", receipt.transactionHash);

      if (receipt.transactionHash) {
        toast.update(toastId, {
          render: "Transaction Successful",
          type: "success",
          autoClose: 5000,
        });
        setTxnHash(receipt.transactionHash);
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
