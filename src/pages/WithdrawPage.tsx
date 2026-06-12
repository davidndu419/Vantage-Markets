/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { holdingService } from '../services/holdingService';
import { priceService } from '../services/priceService';
import { transactionService } from '../services/transactionService';
import type { Holding } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loader } from '../components/Loader';
import {
  ArrowUpRight,
  ShieldAlert,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export const WithdrawPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  // Holdings & Pricing state
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(true);

  // Form states
  const [selectedHoldingId, setSelectedHoldingId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState('');
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submittingTx, setSubmittingTx] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Fetch user holdings and prices in real-time
  useEffect(() => {
    if (!user) return;

    const unsubHoldings = holdingService.onHoldingsChange(user.uid, (fetchedHoldings) => {
      setHoldings(fetchedHoldings);
      setLoadingHoldings(false);
      // Auto-select the first holding if available
      if (fetchedHoldings.length > 0 && !selectedHoldingId) {
        setSelectedHoldingId(fetchedHoldings[0].id || '');
      }
    });

    const unsubPrices = priceService.onPricesChange((pricesMap) => {
      setPrices(pricesMap);
      setLoadingPrices(false);
    });

    return () => {
      unsubHoldings();
      unsubPrices();
    };
  }, [user, selectedHoldingId]);

  // Find the selected holding object
  const selectedHolding = holdings.find((h) => h.id === selectedHoldingId || (h.assetId === selectedHoldingId));
  const currentPrice = selectedHolding ? prices[selectedHolding.ticker] || 0 : 0;
  
  // Convert inputs
  const withdrawAmount = parseFloat(amountStr) || 0;
  const calculatedQuantity = currentPrice > 0 ? withdrawAmount / currentPrice : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    // 1. Core checks
    if (!selectedHolding) {
      setValidationError('Please select an asset position to liquidate.');
      return;
    }

    if (!amountStr) {
      setValidationError('Withdrawal amount is required.');
      return;
    }

    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Please enter a valid positive numerical amount.');
      return;
    }

    if (!walletAddress.trim()) {
      setValidationError('Target external wallet address is required.');
      return;
    }

    setSubmittingTx(true);

    try {
      // 2. Withdrawal Balance constraint check: Must not exceed current balance
      const currentLiquidValue = selectedHolding.quantity * currentPrice;
      if (numAmount > currentLiquidValue) {
        throw new Error(
          `Withdrawal amount $${numAmount.toLocaleString()} exceeds your active position value of $${currentLiquidValue.toLocaleString()} in ${selectedHolding.ticker}.`
        );
      }

      // 3. Create a pending transaction
      await transactionService.createTransaction({
        userId: user!.uid,
        assetId: selectedHolding.assetId,
        assetName: selectedHolding.assetName,
        ticker: selectedHolding.ticker,
        type: 'withdrawal',
        amount: numAmount,
        quantity: calculatedQuantity,
        status: 'pending',
        visibleToUser: true,
      });

      setSuccessMessage('Withdrawal request successfully registered and sent for processing.');
      
      setTimeout(() => {
        navigate('/transactions');
      }, 2000);

    } catch (err: any) {
      console.error('Error submitting withdrawal:', err);
      setValidationError(err.message || 'Failed to submit withdrawal request. Please try again.');
    } finally {
      setSubmittingTx(false);
    }
  };

  // Loading Screen
  if (loadingHoldings || loadingPrices) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader variant="inline" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 relative max-w-3xl mx-auto">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 h-96 w-96 bg-goldAccent/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Page Title */}
      <section>
        <h1 className="text-2xl md:text-3xl font-extrabold text-textPrimary tracking-tight flex items-center gap-2.5 uppercase">
          <ArrowUpRight className="w-6 h-6 text-goldAccent" /> Liquidation & Withdrawal Desk
        </h1>
        <p className="text-xs text-textSecondary font-medium mt-1 uppercase tracking-wider">
          Transfer capital back to your designated external nodes.
        </p>
      </section>

      {/* CONDITION 1: Withdrawal Frozen Warning State */}
      {userProfile?.withdrawalFrozen ? (
        <Card variant="standard" className="p-8 border-danger/20 bg-danger/5 flex flex-col gap-6 glow-card">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center text-danger shrink-0 select-none">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-danger">Transactions Suspended</h3>
              <p className="text-xs text-textSecondary mt-2 leading-relaxed">
                Your capital liquidation services have been administrative frozen by the risk department.
              </p>
              
              {/* Display Freeze Reason */}
              <div className="mt-4 p-4 rounded-lg bg-bgMain border border-borderCustom/80">
                <span className="text-[9px] text-textSecondary uppercase tracking-widest block font-bold mb-1">Restriction Code / Reason</span>
                <p className="text-xs font-mono font-bold text-textPrimary">
                  {userProfile.freezeReason || 'Administrative freeze under standard security protocol review.'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-borderCustom/40 pt-4 flex justify-end">
            <Button
              variant="primary"
              onClick={() => navigate('/support')}
              className="text-xs font-extrabold uppercase tracking-widest h-10 min-h-[40px] px-5"
            >
              Contact Support Desk
            </Button>
          </div>
        </Card>
      ) : (
        /* CONDITION 2: Normal Withdrawal Request Form */
        <div className="flex flex-col gap-6">
          
          {successMessage && (
            <div className="p-4 rounded-lg bg-success/10 border border-success/25 text-xs text-success font-semibold tracking-wide flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle className="w-4 h-4 shrink-0 text-success" />
              <span>{successMessage}</span>
            </div>
          )}

          {validationError && (
            <div className="p-4 rounded-lg bg-danger/10 border border-danger/25 text-xs text-danger font-semibold tracking-wide flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
              <span>{validationError}</span>
            </div>
          )}

          {holdings.length === 0 ? (
            /* Empty state: No holdings to liquidate */
            <Card variant="standard" className="p-10 text-center flex flex-col items-center justify-center border-borderCustom">
              <p className="text-sm text-textSecondary font-medium">You hold no active positions to liquidate.</p>
              <p className="text-[10px] text-textSecondary/70 mt-1 max-w-xs leading-relaxed font-medium">
                To execute withdrawals, your account must hold active assets. Fund your account using the deposit desk.
              </p>
              <Button
                variant="primary"
                className="mt-6 text-xs font-bold uppercase tracking-wider"
                onClick={() => navigate('/deposit')}
              >
                Deposit Desk
              </Button>
            </Card>
          ) : (
            <form onSubmit={handleSubmit}>
              <Card variant="elevated" className="p-6 bg-surface border-borderCustom flex flex-col gap-6">
                
                {/* Select Asset */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest">
                    Select Position Asset
                  </label>
                  <select
                    value={selectedHoldingId}
                    onChange={(e) => {
                      setSelectedHoldingId(e.target.value);
                      setValidationError(null);
                      setAmountStr('');
                    }}
                    className="bg-bgMain text-textPrimary border border-borderCustom focus:border-goldAccent focus:outline-none rounded-[8px] h-11 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    {holdings.map((h) => (
                      <option key={h.id || h.assetId} value={h.id || h.assetId}>
                        {h.assetName} ({h.ticker}) — Balance: {h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pricing and balance review */}
                {selectedHolding && (
                  <div className="grid grid-cols-2 p-3.5 bg-bgMain rounded-lg border border-borderCustom/60 select-none">
                    <div>
                      <span className="text-[9px] text-textSecondary uppercase tracking-wider block">Spot Rate</span>
                      <span className="text-sm font-bold font-mono text-textPrimary">
                        ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-textSecondary uppercase tracking-wider block">Liquid Value</span>
                      <span className="text-sm font-bold font-mono text-goldAccent">
                        ${(selectedHolding.quantity * currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Input details */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Liquidation Amount (USD)"
                    type="number"
                    placeholder="e.g. 250"
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value);
                      setValidationError(null);
                    }}
                    disabled={submittingTx}
                  />

                  {/* Quantity conversion feed */}
                  <div className="flex flex-col justify-end">
                    <div className="p-3.5 bg-bgMain border border-borderCustom/85 rounded-lg min-h-[44px] h-[44px] flex items-center justify-between select-none">
                      <span className="text-[9px] text-textSecondary uppercase tracking-wider font-bold">Deducting Yield</span>
                      <span className="text-xs font-extrabold text-goldAccent font-mono">
                        {calculatedQuantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}{' '}
                        <span className="text-[9px] font-bold text-textPrimary uppercase">{selectedHolding?.ticker}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target address details */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Target Wallet Address"
                    type="text"
                    placeholder="e.g. 0x742d...44e"
                    value={walletAddress}
                    onChange={(e) => {
                      setWalletAddress(e.target.value);
                      setValidationError(null);
                    }}
                    disabled={submittingTx}
                  />
                  <Input
                    label="Transfer Network"
                    type="text"
                    placeholder="e.g. ERC20, TRC20, BTC"
                    value={network}
                    onChange={(e) => {
                      setNetwork(e.target.value);
                      setValidationError(null);
                    }}
                    disabled={submittingTx}
                  />
                </div>

                {/* Submit withdrawal */}
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  className="text-xs font-extrabold uppercase tracking-widest h-11 mt-2 shadow-[0_0_15px_rgba(201,168,76,0.1)]"
                  isLoading={submittingTx}
                >
                  Confirm Liquidation & Withdraw
                </Button>

              </Card>
            </form>
          )}

        </div>
      )}
    </div>
  );
};

export default WithdrawPage;
