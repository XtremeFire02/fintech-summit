/* eslint-env es2020 */
import React, { useState, useEffect, useRef } from "react";
import {
  BrowserProvider,
  Contract,
  parseUnits,
  formatUnits
} from "ethers";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Button } from "react-bootstrap";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import Papa from "papaparse";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import carbonCreditABI from "./contracts/CarbonCredit.json";
import marketplaceABI from "./contracts/CarbonCreditMarketplace.json";
import homeIcon from "./icons/home.png";
import marketplaceIcon from "./icons/marketplace.png";
import userIcon from "./icons/user.png";
import adminIcon from "./icons/admin.png";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// These addresses are set by deploy.ts — update after each redeployment
const CARBON_CREDIT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const MARKETPLACE_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const XRPL_TOKEN_ADDRESS = "0x39fBBABf11738317a448031930706cd3e612e1B9";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

const priceHistoryData = [
  { timestamp: 1704067200, price: "95" },
  { timestamp: 1704153600, price: "98" },
  { timestamp: 1704240000, price: "102" },
  { timestamp: 1704326400, price: "110" },
  { timestamp: 1704412800, price: "108" },
  { timestamp: 1704499200, price: "112" },
  { timestamp: 1704585600, price: "115" },
  { timestamp: 1704672000, price: "120" },
  { timestamp: 1704758400, price: "118" },
  { timestamp: 1704844800, price: "121" },
  { timestamp: 1704931200, price: "123" },
  { timestamp: 1705017600, price: "125" },
  { timestamp: 1705104000, price: "128" },
  { timestamp: 1705190400, price: "130" },
  { timestamp: 1705276800, price: "127" },
  { timestamp: 1705363200, price: "129" },
  { timestamp: 1705449600, price: "135" },
  { timestamp: 1705536000, price: "140" },
  { timestamp: 1705622400, price: "137" },
  { timestamp: 1705708800, price: "142" },
  { timestamp: 1705795200, price: "145" },
  { timestamp: 1705881600, price: "148" },
  { timestamp: 1705968000, price: "152" },
  { timestamp: 1706054400, price: "150" },
  { timestamp: 1706140800, price: "155" },
  { timestamp: 1706227200, price: "158" },
  { timestamp: 1706313600, price: "160" },
  { timestamp: 1706400000, price: "165" },
  { timestamp: 1706486400, price: "168" },
  { timestamp: 1706572800, price: "172" }
];

function App() {
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [carbonCreditContract, setCarbonCreditContract] = useState(null);
  const [marketplaceContract, setMarketplaceContract] = useState(null);
  const [xrplTokenContract, setXrplTokenContract] = useState(null);
  const [batchMintNumber, setBatchMintNumber] = useState("1");
  const [mintToAddress, setMintToAddress] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemEmissionId, setRedeemEmissionId] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [creditBalance, setCreditBalance] = useState("");
  const [xrplBalance, setXrplBalance] = useState("");
  const [marketplaceInfo, setMarketplaceInfo] = useState(null);
  const [ownerAddressQuery, setOwnerAddressQuery] = useState("");
  const [queriedBalance, setQueriedBalance] = useState("");
  const [currentUserAddress, setCurrentUserAddress] = useState("");
  const [contractOwnerAddress, setContractOwnerAddress] = useState("");
  const [setBuyPriceInput, setSetBuyPriceInput] = useState("");
  const [setSellPriceInput, setSetSellPriceInput] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [showModal, setShowModal] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const nodeRefs = {
    home: useRef(null),
    marketplace: useRef(null),
    user: useRef(null),
    admin: useRef(null)
  };
  const isUserOwner =
    currentUserAddress &&
    contractOwnerAddress &&
    currentUserAddress.toLowerCase() === contractOwnerAddress.toLowerCase();

  const [walletError, setWalletError] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletError("MetaMask not detected!");
      return;
    }
    try {
      // Switch to Hardhat localhost network (chain ID 31337 = 0x7A69)
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x7A69" }]
        });
      } catch (switchErr) {
        // If network doesn't exist in MetaMask, add it
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x7A69",
              chainName: "Hardhat Local",
              rpcUrls: ["http://127.0.0.1:8545"],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
            }]
          });
        }
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      const _provider = new BrowserProvider(window.ethereum);

      const network = await _provider.getNetwork();
      console.log("Connected to chain ID:", network.chainId.toString());

      const _signer = await _provider.getSigner();
      const ccContract = new Contract(
        CARBON_CREDIT_ADDRESS,
        carbonCreditABI.abi,
        _signer
      );
      const mpContract = new Contract(
        MARKETPLACE_ADDRESS,
        marketplaceABI.abi,
        _signer
      );
      const xrplContract = new Contract(
        XRPL_TOKEN_ADDRESS,
        ERC20_ABI,
        _signer
      );
      setSigner(_signer);
      setProvider(_provider);
      setCarbonCreditContract(ccContract);
      setMarketplaceContract(mpContract);
      setXrplTokenContract(xrplContract);

      const addr = await _signer.getAddress();
      setCurrentUserAddress(addr);

      const owner = await ccContract.owner();
      setContractOwnerAddress(owner);
      setWalletError("");
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setWalletError(err.message || String(err));
    }
  };

  useEffect(() => {
    connectWallet();

    // Update state when user switches accounts in MetaMask
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setCurrentUserAddress(accounts[0]);
          connectWallet();
        } else {
          setCurrentUserAddress("");
          setSigner(null);
        }
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  const handleShowPopup = (title, message) => {
    setPopupTitle(title);
    setPopupMessage(message);
    setShowModal(true);
  };

  const fetchMarketplaceInfo = async () => {
    if (!marketplaceContract) return;
    try {
      const info = await marketplaceContract.getMarketplaceInfo();
      setMarketplaceInfo({
        creditBalance: info[0].toString(),
        xrplBalance: formatUnits(info[1], 18),
        buyPrice: formatUnits(info[2], 18),
        sellPrice: formatUnits(info[3], 18),
        buyPriceRaw: info[2],
        sellPriceRaw: info[3]
      });
    } catch (err) {
      console.error(err);
      handleShowPopup("Error!", "Failed to fetch marketplace info.");
    }
  };

  const handleBuyCredits = async () => {
    if (!marketplaceContract || !xrplTokenContract) return;
    const parsed = parseInt(buyAmount, 10);
    if (!parsed || parsed <= 0 || isNaN(parsed)) {
      handleShowPopup("Warning", "Please enter a valid whole number of credits to buy.");
      return;
    }
    try {
      const amount = BigInt(parsed);
      const info = await marketplaceContract.getMarketplaceInfo();
      const totalCost = amount * info[2];
      const approveTx = await xrplTokenContract.approve(MARKETPLACE_ADDRESS, totalCost);
      await approveTx.wait();
      const tx = await marketplaceContract.buyCredits(amount);
      await tx.wait();
      handleShowPopup(
        "Purchase Complete",
        `You bought ${parsed} credit(s) for ${formatUnits(totalCost, 18)} XRPL tokens.`
      );
      fetchMarketplaceInfo();
    } catch (err) {
      console.error(err);
      handleShowPopup("Error!", err.reason || "Failed to buy credits.");
    }
  };

  const handleSellCredits = async () => {
    if (!marketplaceContract || !carbonCreditContract) return;
    const parsed = parseInt(sellAmount, 10);
    if (!parsed || parsed <= 0 || isNaN(parsed)) {
      handleShowPopup("Warning", "Please enter a valid whole number of credits to sell.");
      return;
    }
    try {
      const amount = BigInt(parsed);
      const info = await marketplaceContract.getMarketplaceInfo();
      const totalPayout = amount * info[3];
      const approveTx = await carbonCreditContract.approve(MARKETPLACE_ADDRESS, amount);
      await approveTx.wait();
      const tx = await marketplaceContract.sellCredits(amount);
      await tx.wait();
      handleShowPopup(
        "Sale Complete",
        `You sold ${parsed} credit(s) for ${formatUnits(totalPayout, 18)} XRPL tokens.`
      );
      fetchMarketplaceInfo();
    } catch (err) {
      console.error(err);
      handleShowPopup("Error!", err.reason || "Failed to sell credits.");
    }
  };

  const handleCheckCreditBalance = async () => {
    if (!carbonCreditContract || !signer) return;
    try {
      const addr = await signer.getAddress();
      const bal = await carbonCreditContract.balanceOf(addr);
      setCreditBalance(bal.toString());
      handleShowPopup("Balance Retrieved", `You hold ${bal.toString()} carbon credit(s).`);
    } catch (err) {
      console.error(err);
      handleShowPopup("Error!", "Failed to retrieve credit balance.");
    }
  };

  const handleCheckXrplBalance = async () => {
    if (!xrplTokenContract || !signer) return;
    try {
      const addr = await signer.getAddress();
      const bal = await xrplTokenContract.balanceOf(addr);
      setXrplBalance(formatUnits(bal, 18));
      handleShowPopup("Balance Retrieved", `You have ${formatUnits(bal, 18)} XRPL tokens.`);
    } catch (err) {
      console.error(err);
      handleShowPopup("Error!", "Failed to retrieve XRPL balance.");
    }
  };

  const handleCheckAddressBalance = async () => {
    if (!carbonCreditContract || !ownerAddressQuery) {
      handleShowPopup("Warning", "Please enter a valid address.");
      return;
    }
    try {
      const bal = await carbonCreditContract.balanceOf(ownerAddressQuery);
      setQueriedBalance(bal.toString());
      handleShowPopup(
        "Query Complete",
        `Address holds ${bal.toString()} carbon credit(s).`
      );
    } catch (err) {
      console.error(err);
      handleShowPopup("Error!", "Could not retrieve balance.");
    }
  };

  const handleMintBatch = async () => {
    if (!carbonCreditContract || !signer) return;
    const parsed = parseInt(batchMintNumber, 10);
    if (!parsed || parsed <= 0 || isNaN(parsed)) {
      handleShowPopup("Warning", "Please enter a valid whole number of credits to mint.");
      return;
    }
    try {
      const toAddress =
        mintToAddress.trim() !== "" ? mintToAddress : await signer.getAddress();
      const tx = await carbonCreditContract.mintCredits(toAddress, parsed);
      await tx.wait();
      handleShowPopup(
        "Minting Success",
        `Minted ${parsed} credits to ${toAddress}.`
      );
    } catch (err) {
      console.error(err);
      handleShowPopup("Error!", err.reason || "Failed to mint credits.");
    }
  };

  const handleRedeem = async () => {
    if (!carbonCreditContract) return;
    const parsed = parseInt(redeemAmount, 10);
    if (!parsed || parsed <= 0 || isNaN(parsed)) {
      handleShowPopup("Warning", "Please enter a valid whole number of credits to redeem.");
      return;
    }
    if (!redeemEmissionId || redeemEmissionId.trim() === "") {
      handleShowPopup("Warning", "Please enter an emission ID.");
      return;
    }
    try {
      const tx = await carbonCreditContract.redeemCredits(parsed, redeemEmissionId.trim());
      await tx.wait();
      handleShowPopup(
        "Redeemed",
        `${parsed} credit(s) redeemed for emission: ${redeemEmissionId.trim()}`
      );
    } catch (err) {
      console.error(err);
      handleShowPopup("Error!", err.reason || "Failed to redeem credits.");
    }
  };

  const handleSetBuyPrice = async () => {
    if (!marketplaceContract) return;
    const val = parseFloat(setBuyPriceInput);
    if (!val || val <= 0 || isNaN(val)) {
      handleShowPopup("Warning", "Please enter a valid positive price.");
      return;
    }
    try {
      const priceBN = parseUnits(setBuyPriceInput, 18);
      const tx = await marketplaceContract.setBuyPrice(priceBN);
      await tx.wait();
      handleShowPopup("Price Updated", `Buy price set to ${setBuyPriceInput} XRPL per credit.`);
      fetchMarketplaceInfo();
    } catch (err) {
      console.error(err);
      handleShowPopup("Error!", err.reason || "Failed to set buy price.");
    }
  };

  const handleSetSellPrice = async () => {
    if (!marketplaceContract) return;
    const val = parseFloat(setSellPriceInput);
    if (!val || val <= 0 || isNaN(val)) {
      handleShowPopup("Warning", "Please enter a valid positive price.");
      return;
    }
    try {
      const priceBN = parseUnits(setSellPriceInput, 18);
      const tx = await marketplaceContract.setSellPrice(priceBN);
      await tx.wait();
      handleShowPopup("Price Updated", `Sell price set to ${setSellPriceInput} XRPL per credit.`);
      fetchMarketplaceInfo();
    } catch (err) {
      console.error(err);
      handleShowPopup("Error!", err.reason || "Failed to set sell price.");
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <HomeTab
            setActiveTab={setActiveTab}
            connectWallet={connectWallet}
            nodeRef={nodeRefs["home"]}
          />
        );
      case "marketplace":
        return (
          <MarketplaceTab
            buyAmount={buyAmount}
            setBuyAmount={setBuyAmount}
            sellAmount={sellAmount}
            setSellAmount={setSellAmount}
            handleBuyCredits={handleBuyCredits}
            handleSellCredits={handleSellCredits}
            marketplaceInfo={marketplaceInfo}
            fetchMarketplaceInfo={fetchMarketplaceInfo}
            nodeRef={nodeRefs["marketplace"]}
          />
        );
      case "user":
        return (
          <UserTab
            creditBalance={creditBalance}
            xrplBalance={xrplBalance}
            handleCheckCreditBalance={handleCheckCreditBalance}
            handleCheckXrplBalance={handleCheckXrplBalance}
            ownerAddressQuery={ownerAddressQuery}
            setOwnerAddressQuery={setOwnerAddressQuery}
            handleCheckAddressBalance={handleCheckAddressBalance}
            queriedBalance={queriedBalance}
            currentUserAddress={currentUserAddress}
            redeemAmount={redeemAmount}
            setRedeemAmount={setRedeemAmount}
            redeemEmissionId={redeemEmissionId}
            setRedeemEmissionId={setRedeemEmissionId}
            handleRedeem={handleRedeem}
            nodeRef={nodeRefs["user"]}
          />
        );
      case "admin":
        return (
          <AdminTab
            isUserOwner={isUserOwner}
            batchMintNumber={batchMintNumber}
            setBatchMintNumber={setBatchMintNumber}
            mintToAddress={mintToAddress}
            setMintToAddress={setMintToAddress}
            handleMintBatch={handleMintBatch}
            setBuyPriceInput={setBuyPriceInput}
            setSetBuyPriceInput={setSetBuyPriceInput}
            setSellPriceInput={setSellPriceInput}
            setSetSellPriceInput={setSetSellPriceInput}
            handleSetBuyPrice={handleSetBuyPrice}
            handleSetSellPrice={handleSetSellPrice}
            marketplaceInfo={marketplaceInfo}
            fetchMarketplaceInfo={fetchMarketplaceInfo}
            contractOwnerAddress={contractOwnerAddress}
            carbonCreditContract={carbonCreditContract}
            currentUserAddress={currentUserAddress}
            handleShowPopup={handleShowPopup}
            connectWallet={connectWallet}
            walletError={walletError}
            nodeRef={nodeRefs["admin"]}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{popupTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{popupMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
      <style>{`
        .animated-btn {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .animated-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 10px rgba(0,0,0,0.15);
        }
        .fade-enter {
          opacity: 0.01;
        }
        .fade-enter.fade-enter-active {
          opacity: 1;
          transition: opacity 300ms ease-in;
        }
        .fade-exit {
          opacity: 1;
        }
        .fade-exit.fade-exit-active {
          opacity: 0.01;
          transition: opacity 300ms ease-in;
        }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <div
          style={{
            width: isSidebarCollapsed ? "60px" : "250px",
            backgroundColor: "#e3f6f5",
            borderRight: "1px solid #ccc",
            transition: "width 0.3s ease",
            position: "relative"
          }}
        >
          <button
            style={{
              position: "absolute",
              top: 10,
              right: isSidebarCollapsed ? "-35px" : "-45px",
              width: "30px",
              height: "30px",
              cursor: "pointer",
              transition: "right 0.3s ease"
            }}
            onClick={toggleSidebar}
            className="btn btn-outline-secondary btn-sm animated-btn"
          >
            {isSidebarCollapsed ? ">" : "<"}
          </button>
          <div style={{ marginTop: "60px" }}>
            <div
              className={`p-2 ${activeTab === "home" ? "bg-primary text-white" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => setActiveTab("home")}
            >
              {isSidebarCollapsed ? (
                <img src={homeIcon} alt="Home" style={{ width: "24px" }} />
              ) : (
                "Home"
              )}
            </div>
            <div
              className={`p-2 ${
                activeTab === "marketplace" ? "bg-primary text-white" : ""
              }`}
              style={{ cursor: "pointer" }}
              onClick={() => setActiveTab("marketplace")}
            >
              {isSidebarCollapsed ? (
                <img
                  src={marketplaceIcon}
                  alt="Marketplace"
                  style={{ width: "24px" }}
                />
              ) : (
                "Marketplace"
              )}
            </div>
            <div
              className={`p-2 ${activeTab === "user" ? "bg-primary text-white" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => setActiveTab("user")}
            >
              {isSidebarCollapsed ? (
                <img src={userIcon} alt="User" style={{ width: "24px" }} />
              ) : (
                "User"
              )}
            </div>
            <div
              className={`p-2 ${activeTab === "admin" ? "bg-primary text-white" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => setActiveTab("admin")}
            >
              {isSidebarCollapsed ? (
                <img src={adminIcon} alt="Admin" style={{ width: "24px" }} />
              ) : (
                "Admin"
              )}
            </div>
          </div>
        </div>
        <div className="container py-4" style={{ flex: 1 }}>
          <h1 className="mb-4" style={{ textAlign: "center" }}>
            Carbon Credit Trading
          </h1>
          <TransitionGroup component={null}>
            <CSSTransition
              key={activeTab}
              nodeRef={nodeRefs[activeTab]}
              timeout={300}
              classNames="fade"
            >
              <div ref={nodeRefs[activeTab]} style={{ minHeight: "300px" }}>
                {renderTabContent()}
              </div>
            </CSSTransition>
          </TransitionGroup>
        </div>
      </div>
    </>
  );
}

function HomeTab({ setActiveTab, connectWallet, nodeRef }) {
  return (
    <div ref={nodeRef}>
      <div
        className="card mb-4"
        style={{
          border: "0",
          boxShadow: "0 0 20px rgba(0,0,0,0.3)",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle at top, rgba(255, 255, 0, 0.7), rgba(0, 206, 209, 0.7)), url('https://images.unsplash.com/photo-1528825871115-3581a5387919') center/cover",
            minHeight: "400px",
            color: "#fff",
            padding: "40px 30px",
            position: "relative"
          }}
        >
          <div
            style={{
              fontSize: "4rem",
              fontWeight: "800",
              marginBottom: "20px",
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
            }}
          >
            SAVE THE EARTH!
          </div>
          <p
            style={{
              fontSize: "1.4rem",
              maxWidth: "800px",
              textShadow: "1px 1px 2px rgba(0,0,0,0.3)"
            }}
          >
            Invest in carbon credits to rescue our planet from impending doom!
            This is sustainability so next-level, your mind might just explode
            into glitter and unicorns.
          </p>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/7/7f/Rotating_earth_animated_transparent.gif"
            alt="Over-the-top environment"
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              position: "absolute",
              bottom: "20px",
              right: "20px",
              boxShadow: "0 0 12px rgba(0,0,0,0.3)"
            }}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-4 mb-4">
          <div
            className="card h-100"
            style={{ border: "3px solid #0dcaf0", transform: "rotate(-1deg)" }}
          >
            <div className="card-body text-center">
              <h2
                style={{
                  color: "#0dcaf0",
                  fontWeight: "900",
                  marginBottom: "15px"
                }}
              >
                Step 1
              </h2>
              <p className="card-text" style={{ fontSize: "1.2rem" }}>
                Connect your wallet or create an account to begin.
              </p>
              <button
                className="btn btn-primary animated-btn"
                onClick={connectWallet}
              >
                Connect Wallet
              </button>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div
            className="card h-100"
            style={{ border: "3px solid #198754", transform: "rotate(1deg)" }}
          >
            <div className="card-body text-center">
              <h2
                style={{
                  color: "#198754",
                  fontWeight: "900",
                  marginBottom: "15px"
                }}
              >
                Step 2
              </h2>
              <p className="card-text" style={{ fontSize: "1.2rem" }}>
                Explore our Marketplace to buy/sell carbon credits.
              </p>
              <button
                className="btn btn-success animated-btn"
                onClick={() => setActiveTab("marketplace")}
              >
                Go to Marketplace
              </button>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div
            className="card h-100"
            style={{ border: "3px solid #ffc107", transform: "rotate(-1deg)" }}
          >
            <div className="card-body text-center">
              <h2
                style={{
                  color: "#ffc107",
                  fontWeight: "900",
                  marginBottom: "15px"
                }}
              >
                Step 3
              </h2>
              <p className="card-text" style={{ fontSize: "1.2rem" }}>
                Redeem credits to offset emissions and boost eco-karma!
              </p>
              <button
                className="btn btn-warning animated-btn"
                onClick={() => setActiveTab("user")}
              >
                Redeem Credits
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketplaceTab({
  buyAmount,
  setBuyAmount,
  sellAmount,
  setSellAmount,
  handleBuyCredits,
  handleSellCredits,
  marketplaceInfo,
  fetchMarketplaceInfo,
  nodeRef
}) {
  const fancyCardStyle = {
    border: "2px solid #0dcaf0",
    borderRadius: "8px",
    backgroundColor: "#f0fcff",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    marginBottom: "25px",
    overflow: "hidden"
  };
  const fancyCardHeader = {
    backgroundColor: "#20c997",
    color: "#fff",
    fontWeight: "700",
    padding: "10px 20px",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  };
  const fancyCardBody = {
    padding: "20px"
  };
  const bigHeadingStyle = {
    color: "#034f84",
    fontWeight: "900",
    margin: 0
  };

  const parsedBuy = parseInt(buyAmount, 10);
  const buyTotal =
    parsedBuy > 0 && marketplaceInfo && marketplaceInfo.buyPriceRaw

      ? (BigInt(parsedBuy) * BigInt(marketplaceInfo.buyPriceRaw)).toString()
      : null;

  const parsedSell = parseInt(sellAmount, 10);
  const sellTotal =
    parsedSell > 0 && marketplaceInfo && marketplaceInfo.sellPriceRaw

      ? (BigInt(parsedSell) * BigInt(marketplaceInfo.sellPriceRaw)).toString()
      : null;

  return (
    <div ref={nodeRef}>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>Market Info</h3>
          <button
            className="btn btn-outline-light btn-sm animated-btn"
            onClick={fetchMarketplaceInfo}
          >
            Refresh
          </button>
        </div>
        <div style={fancyCardBody}>
          {!marketplaceInfo ? (
            <p>Click Refresh to load marketplace data.</p>
          ) : (
            <div className="row">
              <div className="col-md-3 text-center mb-2">
                <strong>Buy Price</strong>
                <div style={{ fontSize: "1.5rem", color: "#198754" }}>
                  {marketplaceInfo.buyPrice} XRPL
                </div>
              </div>
              <div className="col-md-3 text-center mb-2">
                <strong>Sell Price</strong>
                <div style={{ fontSize: "1.5rem", color: "#dc3545" }}>
                  {marketplaceInfo.sellPrice} XRPL
                </div>
              </div>
              <div className="col-md-3 text-center mb-2">
                <strong>Credits in Pool</strong>
                <div style={{ fontSize: "1.5rem" }}>
                  {marketplaceInfo.creditBalance}
                </div>
              </div>
              <div className="col-md-3 text-center mb-2">
                <strong>XRPL in Pool</strong>
                <div style={{ fontSize: "1.5rem" }}>
                  {marketplaceInfo.xrplBalance}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>Buy Credits</h3>
        </div>
        <div style={fancyCardBody}>
          <p className="text-muted">
            Purchase carbon credits from the marketplace pool.
          </p>
          <div className="mb-3">
            <label>Number of Credits to Buy:</label>
            <input
              type="number"
              className="form-control"
              min="1"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
            />
          </div>
          {buyTotal && (
            <p>
              <strong>Total Cost:</strong> {formatUnits(buyTotal, 18)} XRPL tokens
            </p>
          )}
          <button
            className="btn btn-success animated-btn"
            onClick={handleBuyCredits}
          >
            Approve &amp; Buy
          </button>
        </div>
      </div>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>Sell Credits</h3>
        </div>
        <div style={fancyCardBody}>
          <p className="text-muted">
            Sell your carbon credits back to the marketplace pool.
          </p>
          <div className="mb-3">
            <label>Number of Credits to Sell:</label>
            <input
              type="number"
              className="form-control"
              min="1"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
            />
          </div>
          {sellTotal && (
            <p>
              <strong>Total Payout:</strong> {formatUnits(sellTotal, 18)} XRPL tokens
            </p>
          )}
          <button
            className="btn btn-primary animated-btn"
            onClick={handleSellCredits}
          >
            Approve &amp; Sell
          </button>
        </div>
      </div>
      <PriceHistoryChart />
    </div>
  );
}

function UserTab({
  creditBalance,
  xrplBalance,
  handleCheckCreditBalance,
  handleCheckXrplBalance,
  ownerAddressQuery,
  setOwnerAddressQuery,
  handleCheckAddressBalance,
  queriedBalance,
  currentUserAddress,
  redeemAmount,
  setRedeemAmount,
  redeemEmissionId,
  setRedeemEmissionId,
  handleRedeem,
  nodeRef
}) {
  const fancyCardStyle = {
    border: "2px solid #0dcaf0",
    borderRadius: "8px",
    backgroundColor: "#f0fcff",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    marginBottom: "25px",
    overflow: "hidden"
  };
  const fancyCardHeader = {
    backgroundColor: "#20c997",
    color: "#fff",
    fontWeight: "700",
    padding: "10px 20px",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  };
  const fancyCardBody = {
    padding: "20px"
  };
  const bigHeadingStyle = {
    color: "#034f84",
    fontWeight: "900",
    margin: 0
  };
  return (
    <div ref={nodeRef}>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>My Balances</h3>
        </div>
        <div style={fancyCardBody}>
          <div className="d-flex gap-2 mb-3">
            <button
              className="btn btn-info animated-btn"
              onClick={handleCheckCreditBalance}
            >
              Check Credit Balance
            </button>
            <button
              className="btn btn-secondary animated-btn"
              onClick={handleCheckXrplBalance}
            >
              Check XRPL Balance
            </button>
          </div>
          <div className="row">
            <div className="col-md-6">
              <label style={{ fontWeight: "bold" }}>Carbon Credits:</label>
              <span className="ms-2">
                {creditBalance !== "" ? creditBalance : "Not fetched yet"}
              </span>
            </div>
            <div className="col-md-6">
              <label style={{ fontWeight: "bold" }}>XRPL Tokens:</label>
              <span className="ms-2">
                {xrplBalance !== "" ? xrplBalance : "Not fetched yet"}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>Check Balance of Address</h3>
        </div>
        <div style={fancyCardBody}>
          <div className="mb-3">
            <label>Address to Query:</label>
            <input
              type="text"
              className="form-control"
              placeholder="0x123..."
              value={ownerAddressQuery}
              onChange={(e) => setOwnerAddressQuery(e.target.value)}
            />
          </div>
          <button
            className="btn btn-info mb-2 animated-btn"
            onClick={handleCheckAddressBalance}
          >
            Check Balance
          </button>
          <div>
            <label style={{ fontWeight: "bold" }}>Credits Held:</label>
            <span className="ms-2">
              {queriedBalance !== "" ? queriedBalance : "Not fetched yet"}
            </span>
          </div>
        </div>
      </div>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>Retire Credits</h3>
        </div>
        <div style={fancyCardBody}>
          <p className="text-muted">
            Burn your carbon credits to permanently offset an emission and confirm your Net Zero status.
          </p>
          <div className="mb-3">
            <label>Number of Credits to Retire:</label>
            <input
              type="number"
              className="form-control"
              min="1"
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label>Emission ID:</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. EM-2025-001"
              value={redeemEmissionId}
              onChange={(e) => setRedeemEmissionId(e.target.value)}
            />
          </div>
          <button className="btn btn-danger animated-btn" onClick={handleRedeem}>
            Retire Credits
          </button>
        </div>
      </div>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>My Account</h3>
        </div>
        <div style={fancyCardBody}>
          <div className="mb-2">
            <label style={{ fontWeight: "bold" }}>My Address:</label>
            <span className="ms-2">
              {currentUserAddress || "Not fetched yet"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminTab({
  isUserOwner,
  batchMintNumber,
  setBatchMintNumber,
  mintToAddress,
  setMintToAddress,
  handleMintBatch,
  setBuyPriceInput,
  setSetBuyPriceInput,
  setSellPriceInput,
  setSetSellPriceInput,
  handleSetBuyPrice,
  handleSetSellPrice,
  marketplaceInfo,
  fetchMarketplaceInfo,
  contractOwnerAddress,
  nodeRef,
  carbonCreditContract,
  currentUserAddress,
  handleShowPopup,
  connectWallet,
  walletError
}) {
  const fancyCardStyle = {
    border: "2px solid #0dcaf0",
    borderRadius: "8px",
    backgroundColor: "#f0fcff",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    marginBottom: "25px",
    overflow: "hidden"
  };
  const fancyCardHeader = {
    backgroundColor: "#20c997",
    color: "#fff",
    fontWeight: "700",
    padding: "10px 20px",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  };
  const fancyCardBody = {
    padding: "20px"
  };
  const bigHeadingStyle = {
    color: "#034f84",
    fontWeight: "900",
    margin: 0
  };
  const [emissionRecords, setEmissionRecords] = useState([]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setEmissionRecords(results.data);
        },
        error: (err) => {
          console.error("Error parsing CSV:", err);
          handleShowPopup("Error!", "Failed to parse CSV file.");
        }
      });
    }
  };

  const handleRedeemForEmission = async (emissionId, quantity) => {
    try {
      const amount = parseInt(quantity, 10);
      if (!amount || amount <= 0 || isNaN(amount)) {
        handleShowPopup("Error!", `Invalid quantity "${quantity}" for emission ${emissionId}.`);
        return;
      }
      if (!emissionId || String(emissionId).trim() === "") {
        handleShowPopup("Error!", "Missing emission ID in CSV row.");
        return;
      }
      const tx = await carbonCreditContract.redeemCredits(amount, String(emissionId).trim());
      await tx.wait();
      handleShowPopup(
        "Redeemed",
        `${amount} credit(s) redeemed for emission: ${emissionId}`
      );
    } catch (err) {
      console.error(err);
      handleShowPopup(
        "Error!",
        err.reason || `Failed to redeem for emission ${emissionId}.`
      );
    }
  };

  const handleRedeemAll = async () => {
    for (const record of emissionRecords) {
      await handleRedeemForEmission(record.emissionId, record.quantity);
    }
  };

  if (!isUserOwner) {
    return (
      <div ref={nodeRef} className="alert alert-danger">
        <p><strong>You do not have permission to view this section.</strong></p>
        <small>
          Your address: {currentUserAddress || "(not connected)"}<br />
          Contract owner: {contractOwnerAddress || "(loading...)"}<br />
          Chain ID in MetaMask must be 31337 (Hardhat Local)
        </small>
        {walletError && (
          <div className="alert alert-warning mt-2 mb-0">
            <strong>Error:</strong> {walletError}
          </div>
        )}
        <br />
        <button
          className="btn btn-sm btn-outline-danger mt-2"
          onClick={connectWallet}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div ref={nodeRef}>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>Mint Carbon Credits</h3>
        </div>
        <div style={fancyCardBody}>
          <p className="text-muted">
            Enter how many credits to create, plus an optional recipient address.
          </p>
          <div className="mb-3">
            <label>Number of Credits:</label>
            <input
              type="number"
              className="form-control"
              value={batchMintNumber}
              onChange={(e) => setBatchMintNumber(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label>Mint To Address (optional):</label>
            <input
              type="text"
              className="form-control"
              placeholder="0x1234... (defaults to your address)"
              value={mintToAddress}
              onChange={(e) => setMintToAddress(e.target.value)}
            />
          </div>
          <button className="btn btn-primary animated-btn" onClick={handleMintBatch}>
            Mint Credits
          </button>
        </div>
      </div>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>Set Marketplace Prices</h3>
        </div>
        <div style={fancyCardBody}>
          <div className="mb-3">
            <label>Buy Price (XRPL per credit):</label>
            <input
              type="text"
              className="form-control"
              value={setBuyPriceInput}
              onChange={(e) => setSetBuyPriceInput(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary me-2 animated-btn"
            onClick={handleSetBuyPrice}
          >
            Set Buy Price
          </button>
          <div className="mb-3 mt-3">
            <label>Sell Price (XRPL per credit):</label>
            <input
              type="text"
              className="form-control"
              value={setSellPriceInput}
              onChange={(e) => setSetSellPriceInput(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary animated-btn"
            onClick={handleSetSellPrice}
          >
            Set Sell Price
          </button>
        </div>
      </div>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>Marketplace Info</h3>
          <button
            className="btn btn-outline-light btn-sm animated-btn"
            onClick={fetchMarketplaceInfo}
          >
            Refresh
          </button>
        </div>
        <div style={fancyCardBody}>
          {!marketplaceInfo ? (
            <p>Click Refresh to load marketplace data.</p>
          ) : (
            <div>
              <p><strong>Credits in Pool:</strong> {marketplaceInfo.creditBalance}</p>
              <p><strong>XRPL in Pool:</strong> {marketplaceInfo.xrplBalance}</p>
              <p><strong>Buy Price:</strong> {marketplaceInfo.buyPrice} XRPL</p>
              <p><strong>Sell Price:</strong> {marketplaceInfo.sellPrice} XRPL</p>
            </div>
          )}
        </div>
      </div>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>Contract Owner</h3>
        </div>
        <div style={fancyCardBody}>
          <p>CarbonCredit Contract Owner:</p>
          <strong>{contractOwnerAddress}</strong>
        </div>
      </div>
      <div style={fancyCardStyle}>
        <div style={fancyCardHeader}>
          <h3 style={bigHeadingStyle}>Redeem Emissions from CSV</h3>
        </div>
        <div style={fancyCardBody}>
          <div className="mb-3">
            <label className="form-label">Upload Emission CSV:</label>
            <input
              type="file"
              className="form-control"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>
          {emissionRecords.length > 0 && (
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Emission ID</th>
                  <th>Quantity (Credits to Redeem)</th>
                  <th>Redeem Action</th>
                </tr>
              </thead>
              <tbody>
                {emissionRecords.map((record, idx) => {
                  const emissionId = record.emissionId;
                  const quantity = record.quantity;
                  return (
                    <tr key={idx}>
                      <td>{emissionId}</td>
                      <td>{quantity}</td>
                      <td>
                        <button
                          className="btn btn-primary animated-btn"
                          onClick={() => handleRedeemForEmission(emissionId, quantity)}
                        >
                          Redeem
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {emissionRecords.length > 0 && (
            <button className="btn btn-success mt-2 animated-btn" onClick={handleRedeemAll}>
              Redeem All Emissions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PriceHistoryChart() {
  const labels = priceHistoryData.map((point) =>
    new Date(point.timestamp * 1000).toLocaleDateString()
  );
  const prices = priceHistoryData.map((point) => Number(point.price));
  const data = {
    labels,
    datasets: [
      {
        label: "Carbon Credit Price (XRPL)",
        data: prices,
        fill: false,
        borderColor: "rgba(0, 123, 255, 1)",
        tension: 0.1
      }
    ]
  };
  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Price History of Carbon Credits"
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: "Price (XRPL)"
        }
      },
      x: {
        title: {
          display: true,
          text: "Date"
        }
      }
    }
  };
  const fancyCardStyle = {
    border: "2px solid #0dcaf0",
    backgroundColor: "#f0fcff",
    marginBottom: "25px",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)"
  };
  const fancyCardHeader = {
    backgroundColor: "#20c997",
    color: "#fff",
    fontWeight: "700",
    padding: "10px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  };
  const bigHeadingStyle = {
    color: "#034f84",
    fontWeight: "900",
    margin: 0
  };
  return (
    <div style={fancyCardStyle}>
      <div style={fancyCardHeader}>
        <h3 style={bigHeadingStyle}>Price History</h3>
        <small>(Line Chart)</small>
      </div>
      <div style={{ padding: "20px" }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

export default App;
