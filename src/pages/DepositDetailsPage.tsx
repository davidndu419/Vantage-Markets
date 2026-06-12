/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { assetService } from '../services/assetService';
import { priceService } from '../services/priceService';
import { transactionService } from '../services/transactionService';
import type { Asset } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loader } from '../components/Loader';
import { QRCodeSVG } from 'qrcode.react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Coins,
  CheckCircle,
  Copy,
  AlertCircle,
  Globe,
  Wallet
} from 'lucide-react';

interface ActiveAddress {
  id: string;
  label: string;
  network: string;
  address: string;
  qrCodeUrl?: string;
  paymentAssetSymbol?: string;
  paymentAssetName?: string;
}

const getPaymentAssetDetails = (addr: ActiveAddress) => {
  const symbol = addr.paymentAssetSymbol || (addr.network === 'BTC' ? 'BTC' : 'USDT');
  const name = addr.paymentAssetName || (addr.network === 'BTC' ? 'Bitcoin' : 'Tether');
  return { symbol, name };
};

export const DepositDetailsPage: React.FC = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  
  const [loadingAsset, setLoadingAsset] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deposit input state
  const [amountStr, setAmountStr] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Wallet address data
  const [activeAddresses, setActiveAddresses] = useState<ActiveAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [pricesMap, setPricesMap] = useState<Record<string, number>>({});
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [submittingTx, setSubmittingTx] = useState(false);

  // 1. Fetch asset details & listen to price updates
  useEffect(() => {
    if (!assetId) return;

    let unsubPrices: (() => void) | null = null;

    const loadAsset = async () => {
      try {
        setLoadingAsset(true);
        setError(null);
        
        const fetchedAsset = await assetService.getAssetById(assetId);
        if (!fetchedAsset) {
          setError('The requested asset could not be located in our system catalog.');
          setLoadingAsset(false);
          return;
        }
        
        setAsset(fetchedAsset);

        // Fetch initial price
        const initialPrice = await assetService.getAssetPrice(fetchedAsset.ticker);
        setCurrentPrice(initialPrice);

        // Listen to price updates
        unsubPrices = priceService.onPricesChange((prices) => {
          setPricesMap(prices);
          const price = prices[fetchedAsset.ticker];
          if (price !== undefined) {
            setCurrentPrice(price);
          }
        });

      } catch (err: any) {
        console.error('Error fetching asset or price:', err);
        setError('Connection failure. Could not retrieve real-time spot price.');
      } finally {
        setLoadingAsset(false);
      }
    };

    loadAsset();

    return () => {
      if (unsubPrices) unsubPrices();
    };
  }, [assetId]);

  // 2. Fetch active deposit addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        setLoadingAddresses(true);
        const addressesCollection = collection(db, 'depositAddresses');
        const q = query(addressesCollection, where('active', '==', true));
        const querySnapshot = await getDocs(q);
        
        const list: ActiveAddress[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            label: data.label || '',
            network: data.network || '',
            address: data.address || '',
            qrCodeUrl: data.qrCodeUrl || '',
            paymentAssetSymbol: data.paymentAssetSymbol,
            paymentAssetName: data.paymentAssetName,
          });
        });
        
        setActiveAddresses(list);
      } catch (err) {
        console.error('Error fetching deposit addresses:', err);
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, []);

  // 3. Resolve default selected address ID once loaded
  useEffect(() => {
    if (activeAddresses.length > 0 && !selectedAddressId) {
      let match = activeAddresses.find(
        (addr) => addr.network.toLowerCase() === asset?.ticker?.toLowerCase()
      );
      if (!match && asset?.type === 'crypto' && asset.ticker === 'ETH') {
        match = activeAddresses.find((addr) => addr.network.toUpperCase() === 'ERC20');
      }
      if (!match && asset?.type === 'stock') {
        match = activeAddresses.find(
          (addr) => addr.network.toUpperCase() === 'TRC20' || addr.network.toUpperCase() === 'ERC20'
        );
      }
      const chosen = match || activeAddresses[0];
      Promise.resolve().then(() => setSelectedAddressId(chosen.id));
    }
  }, [activeAddresses, asset, selectedAddressId]);

  // Resolve selected address dynamically
  const selectedAddress = activeAddresses.find((addr) => addr.id === selectedAddressId) || null;

  // Calculate units dynamically
  const amount = parseFloat(amountStr) || 0;
  const calculatedQuantity = currentPrice > 0 ? amount / currentPrice : 0;

  // Validation
  const handleConfirm = () => {
    setValidationError(null);

    if (!amountStr) {
      setValidationError('Deposit amount is required.');
      return;
    }

    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Please enter a valid positive numerical amount.');
      return;
    }

    if (!asset) return;

    if (numAmount < asset.minDeposit) {
      setValidationError(`Amount is below the minimum limit of $${asset.minDeposit.toLocaleString()}.`);
      return;
    }

    if (numAmount > asset.maxDeposit) {
      setValidationError(`Amount exceeds the maximum cap of $${asset.maxDeposit.toLocaleString()}.`);
      return;
    }

    setIsConfirmed(true);
  };

  const handleCopy = () => {
    if (!selectedAddress) return;
    navigator.clipboard.writeText(selectedAddress.address);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleSubmitPayment = async () => {
    if (!user || !asset || !selectedAddress) return;

    const { symbol: paymentAssetSymbol, name: paymentAssetName } = getPaymentAssetDetails(selectedAddress);
    const paymentPriceAtTime = pricesMap[paymentAssetSymbol];
    if (paymentPriceAtTime === undefined || paymentPriceAtTime <= 0) {
      setValidationError(`Real-time price mapping for ${paymentAssetSymbol} is missing.`);
      return;
    }

    const paymentQuantity = amount / paymentPriceAtTime;

    setSubmittingTx(true);
    try {
      // Create pending transaction in service layer
      await transactionService.createTransaction({
        userId: user.uid,
        assetId: asset.id,
        assetName: asset.name,
        ticker: asset.ticker,
        type: 'deposit',
        amount: amount,
        quantity: calculatedQuantity,
        status: 'pending',
        visibleToUser: true,
        paymentAssetSymbol,
        paymentAssetName,
        paymentNetwork: selectedAddress.network,
        paymentAddress: selectedAddress.address,
        paymentQuantity,
        paymentPriceAtTime,
      });

      // Navigate to ledger
      navigate('/transactions');
    } catch (err: any) {
      console.error('Failed to submit payment confirmation:', err);
      setValidationError(err.message || 'Failed to register your deposit request. Please try again.');
    } finally {
      setSubmittingTx(false);
    }
  };

  if (loadingAsset) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader variant="inline" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col justify-center items-center px-6 text-center min-h-[300px]">
        <AlertCircle className="w-12 h-12 text-danger mb-4" />
        <h1 className="text-xl font-bold uppercase tracking-wider text-textPrimary">Asset Not Found</h1>
        <p className="text-sm text-textSecondary max-w-md mt-2 mb-6">{error || 'Asset details cannot be found.'}</p>
        <Button variant="secondary" onClick={() => navigate('/deposit')} className="text-xs font-bold uppercase tracking-wider">
          Return to Deposit Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 relative max-w-4xl mx-auto">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 h-96 w-96 bg-goldAccent/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Panel */}
      <section className="w-full flex-grow flex flex-col gap-6">
        
        {/* Step Progression Visual */}
        <div className="flex justify-between items-center bg-surface border border-borderCustom rounded-lg p-4 mb-2 select-none">
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${isConfirmed ? 'bg-success/20 text-success border border-success/30' : 'bg-goldAccent text-bgMain'}`}>
              1
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${isConfirmed ? 'text-textSecondary' : 'text-goldAccent'}`}>Configure Escrow</span>
          </div>
          <div className="flex-1 h-[1px] bg-borderCustom mx-4" />
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${isConfirmed ? 'bg-goldAccent text-bgMain' : 'bg-borderCustom text-textSecondary border border-borderCustom'}`}>
              2
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${isConfirmed ? 'text-goldAccent' : 'text-textSecondary'}`}>Execute Transfer</span>
          </div>
        </div>

        {/* Details and Form Grid */}
        <div className="grid md:grid-cols-5 gap-6 items-start">
          
          {/* Column Left: Asset Spec sheet (Col-span 2) */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <Card variant="standard" className="p-6 bg-surface">
              <h2 className="text-xs font-bold text-textSecondary uppercase tracking-widest border-b border-borderCustom/40 pb-2 mb-4">
                Asset Specifications
              </h2>
              
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[10px] text-textSecondary uppercase tracking-wider block">Security ID</span>
                  <span className="text-sm font-bold text-textPrimary">{asset.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-textSecondary uppercase tracking-wider block">Security Ticker</span>
                  <span className="text-sm font-bold font-mono text-goldAccent uppercase">{asset.ticker}</span>
                </div>
                <div>
                  <span className="text-[10px] text-textSecondary uppercase tracking-wider block">Spot Rate (USD)</span>
                  <span className="text-lg font-extrabold font-mono text-textPrimary">
                    ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-borderCustom/40 pt-3 mt-1">
                  <div>
                    <span className="text-[10px] text-textSecondary uppercase tracking-wider block">Min. Funding</span>
                    <span className="text-xs font-bold font-mono text-textPrimary">${asset.minDeposit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-textSecondary uppercase tracking-wider block">Max. Funding</span>
                    <span className="text-xs font-bold font-mono text-textPrimary">${asset.maxDeposit.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Column Right: Action Panel (Col-span 3) */}
          <div className="md:col-span-3 flex flex-col gap-6">
            
            {/* Phase 1: Configure Amount Form */}
            {!isConfirmed ? (
              <Card variant="elevated" className="p-6 bg-surface border-borderCustom flex flex-col gap-5">
                <div>
                  <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
                    <Coins className="w-4.5 h-4.5 text-goldAccent" /> Escrow Amount Configuration
                  </h2>
                  <p className="text-[10px] text-textSecondary mt-1 leading-relaxed">
                    Define the USD capital to deposit. Our calculation engine will compute the expected asset quantity.
                  </p>
                </div>

                {validationError && (
                  <div className="p-4 rounded-lg bg-danger/10 border border-danger/25 text-xs text-danger font-semibold tracking-wide flex items-center gap-2.5 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <Input
                    label="Funding Amount (USD)"
                    type="number"
                    placeholder="e.g. 500"
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value);
                      setValidationError(null);
                    }}
                    disabled={isConfirmed}
                  />

                  {/* Calculator Feed */}
                  <div className="p-4 rounded-lg bg-bgMain border border-borderCustom/80 flex flex-col justify-between gap-1 select-none">
                    <span className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Estimated Allocation Yield</span>
                    <div className="text-md font-bold text-goldAccent font-mono mt-1">
                      {calculatedQuantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      <span className="text-xs font-bold text-textPrimary uppercase ml-1.5">{asset.ticker}</span>
                    </div>
                    <span className="text-[8px] text-textSecondary/80 leading-normal block mt-1.5">
                      "You will receive {calculatedQuantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} shares/coins" based on live spot rate.
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  className="text-xs font-bold uppercase tracking-widest h-11"
                  onClick={handleConfirm}
                >
                  Configure Deposit Address
                </Button>
              </Card>
            ) : (
              /* Phase 2: Show wallet and confirm payment */
              <Card variant="elevated" className="p-6 bg-surface border-goldAccent/25 flex flex-col gap-6 shadow-[0_0_20px_rgba(201,168,76,0.08)]">
                <div>
                  <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="w-4.5 h-4.5 text-goldAccent" /> Wallet Funding Interface
                  </h2>
                  <p className="text-[10px] text-textSecondary mt-1 leading-relaxed">
                    Transmit the specified funding capital to the wallet below.
                  </p>
                </div>

                {/* Selector for payment options */}
                {activeAddresses.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[9px] text-textSecondary uppercase tracking-widest font-extrabold block">
                      Choose Funding Payment Method
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeAddresses.map((addr) => {
                        const { symbol, name } = getPaymentAssetDetails(addr);
                        const isChosen = addr.id === selectedAddressId;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => {
                              setSelectedAddressId(addr.id);
                              setValidationError(null);
                            }}
                            className={`cursor-pointer p-3 rounded-[8px] border transition-all duration-300 flex items-center justify-between ${
                              isChosen
                                ? 'border-goldAccent bg-goldAccent/5 text-goldAccent'
                                : 'border-borderCustom hover:border-textSecondary bg-bgMain/40 text-textSecondary hover:text-textPrimary'
                            }`}
                          >
                            <div>
                              <span className="text-xs font-bold uppercase block">{name} ({symbol})</span>
                              <span className="text-[9px] font-semibold text-textSecondary mt-0.5 block">{addr.network} • {addr.label}</span>
                            </div>
                            {isChosen && (
                              <span className="h-2 w-2 rounded-full bg-goldAccent shadow-[0_0_8px_#C9A84C]" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Amount Review */}
                {selectedAddress && (() => {
                  const { symbol: paymentAssetSymbol } = getPaymentAssetDetails(selectedAddress);
                  const paymentPrice = pricesMap[paymentAssetSymbol];
                  const hasPaymentPrice = paymentPrice !== undefined && paymentPrice > 0;
                  const paymentQuantity = hasPaymentPrice ? amount / paymentPrice : 0;

                  return (
                    <>
                      <div className="grid grid-cols-2 p-3 bg-bgMain rounded-lg border border-borderCustom/60 select-none">
                        <div>
                          <span className="text-[9px] text-textSecondary uppercase tracking-wider block">Target Value</span>
                          <span className="text-sm font-bold font-mono text-textPrimary">${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-textSecondary uppercase tracking-wider block">Transfer Quantity</span>
                          <span className="text-sm font-bold font-mono text-goldAccent">
                            {hasPaymentPrice ? (
                              `${paymentQuantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${paymentAssetSymbol}`
                            ) : (
                              <span className="text-danger">Price Missing</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {validationError && (
                        <div className="p-4 rounded-lg bg-danger/10 border border-danger/25 text-xs text-danger font-semibold tracking-wide flex items-center gap-2.5 animate-fadeIn">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{validationError}</span>
                        </div>
                      )}

                      {loadingAddresses ? (
                        <Loader variant="skeleton" count={2} />
                      ) : !hasPaymentPrice ? (
                        <div className="p-5 rounded-lg border border-danger/20 bg-danger/5 text-center flex flex-col items-center gap-2.5">
                          <AlertCircle className="w-8 h-8 text-danger" />
                          <div className="text-xs font-bold text-textPrimary uppercase">Rate Currently Unavailable</div>
                          <p className="text-[10px] text-textSecondary leading-relaxed max-w-xs">
                            The live rate for {paymentAssetSymbol} is currently missing from our database system. Please select another funding option or contact support.
                          </p>
                        </div>
                      ) : (
                        /* Normal Address Display */
                        <div className="flex flex-col gap-5">
                          
                          {/* QR Code and details block */}
                          <div className="flex flex-col sm:flex-row gap-5 items-center bg-bgMain p-4 rounded-lg border border-borderCustom/80">
                            
                            {/* Render QR code */}
                            <div className="bg-white p-2 rounded-lg shrink-0 border border-white/10 select-none shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                              <QRCodeSVG value={selectedAddress.address} size={110} />
                            </div>

                            <div className="flex flex-col gap-3 w-full text-center sm:text-left">
                              <div>
                                <span className="text-[9px] text-textSecondary uppercase tracking-widest block font-bold">Funding Network</span>
                                <span className="text-xs font-extrabold text-goldAccent uppercase flex items-center justify-center sm:justify-start gap-1 mt-0.5 select-none">
                                  <Globe className="w-3.5 h-3.5" /> {selectedAddress.network} ({selectedAddress.label})
                                </span>
                              </div>
                              
                              <div>
                                <span className="text-[9px] text-textSecondary uppercase tracking-widest block font-bold mb-1">Secured Wallet Address</span>
                                <div className="flex items-center bg-surface border border-borderCustom rounded-[6px] p-2 pr-1 gap-2">
                                  <span className="text-[10px] font-mono text-textPrimary break-all flex-1 text-left">
                                    {selectedAddress.address}
                                  </span>
                                  <button
                                    onClick={handleCopy}
                                    className="h-7 w-7 rounded bg-borderCustom hover:bg-goldAccent hover:text-bgMain flex items-center justify-center transition-colors shrink-0 relative group"
                                    title="Copy to Clipboard"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    {copyFeedback && (
                                      <span className="absolute bottom-full mb-2 bg-goldAccent text-bgMain text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(201,168,76,0.3)] select-none">
                                        Copied!
                                      </span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Deposit Instructions text */}
                          <div className="p-4 rounded-lg bg-borderCustom/15 border border-borderCustom/50 text-[10px] text-textSecondary leading-relaxed">
                            <span className="font-bold text-textPrimary uppercase tracking-wider block mb-1">Funding Instructions</span>
                            * Send exactly <span className="font-mono text-goldAccent font-bold">{paymentQuantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {paymentAssetSymbol}</span> in a single transfer.
                            <br />
                            * Ensure you use the correct <span className="font-bold text-goldAccent uppercase">{selectedAddress.network}</span> network. Failure to do so will result in permanent capital loss.
                            <br />
                            * After your wallet transaction clears, click the confirmation button below to record the intent statement.
                          </div>

                          {/* Actions */}
                          <div className="flex gap-4">
                            <Button
                              variant="secondary"
                              className="flex-1 text-xs font-bold uppercase tracking-wider h-11 border border-borderCustom"
                              onClick={() => setIsConfirmed(false)}
                              disabled={submittingTx}
                            >
                              Adjust Amount
                            </Button>
                            <Button
                              variant="primary"
                              className="flex-1 text-xs font-extrabold uppercase tracking-widest h-11 shadow-[0_0_15px_rgba(201,168,76,0.2)]"
                              onClick={handleSubmitPayment}
                              isLoading={submittingTx}
                            >
                              <CheckCircle className="w-4 h-4 mr-1.5" /> I Have Made Payment
                            </Button>
                          </div>

                        </div>
                      )}
                    </>
                  );
                })()}

                {loadingAddresses ? null : !selectedAddress ? (
                  /* Fallback display if no active address is configured */
                  <div className="p-5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-center flex flex-col items-center gap-2.5">
                    <AlertCircle className="w-8 h-8 text-yellow-500" />
                    <div className="text-xs font-bold text-textPrimary uppercase">No Active Funding Node Available</div>
                    <p className="text-[10px] text-textSecondary leading-relaxed max-w-xs">
                      There is no active ledger wallet address currently configured for this network class. Please contact the administrative desk to request instructions.
                    </p>
                    <Button
                      variant="secondary"
                      className="text-[10px] font-bold uppercase tracking-wider h-8 min-h-[32px] px-3 mt-1.5"
                      onClick={() => navigate('/dashboard')}
                    >
                      Return to Dashboard
                    </Button>
                  </div>
                ) : null}
              </Card>
            )}

          </div>

        </div>
      </section>
    </div>
  );
};
