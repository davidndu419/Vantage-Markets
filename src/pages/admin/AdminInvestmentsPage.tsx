/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { adminService } from '../../services/adminService';
import { marketPriceService } from '../../services/marketPriceService';
import type { Asset } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Loader } from '../../components/Loader';
import { Modal } from '../../components/Modal';
import { AssetLogo } from '../../components/AssetLogo';
import { Plus, Edit2, Trash2, Coins, RefreshCw, Sliders, Layers } from 'lucide-react';

export const AdminInvestmentsPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Bulk Limits State
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkMinDeposit, setBulkMinDeposit] = useState('100');
  const [bulkMaxDeposit, setBulkMaxDeposit] = useState('20000');
  const [bulkFilterType, setBulkFilterType] = useState<'all' | 'crypto' | 'stock'>('all');
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

  const handleOpenBulkEdit = () => {
    setBulkError('');
    setBulkSuccess('');
    setBulkEditOpen(true);
  };

  const handleApplyBulkLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingBulk) return;

    const minDep = parseFloat(bulkMinDeposit);
    const maxDep = parseFloat(bulkMaxDeposit);

    if (isNaN(minDep) || minDep <= 0 || isNaN(maxDep) || maxDep <= minDep) {
      setBulkError('Please enter positive numbers where maximum deposit is strictly greater than minimum deposit.');
      return;
    }

    setSubmittingBulk(true);
    setBulkError('');
    setBulkSuccess('');

    try {
      const count = await adminService.updateBulkAssetLimits(minDep, maxDep, bulkFilterType);
      setBulkSuccess(`Successfully updated limits across ${count} assets.`);
      await fetchAssetsAndPrices();
      setTimeout(() => {
        setBulkEditOpen(false);
        setBulkSuccess('');
      }, 1200);
    } catch (err: any) {
      setBulkError(err.message || 'Failed to update bulk limits.');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleSyncPrices = async () => {
    setSyncingPrices(true);
    setSyncMessage(null);
    try {
      const res = await marketPriceService.syncAllPrices();
      setSyncMessage({ text: res.message || 'Prices updated successfully.', type: 'success' });
      await fetchAssetsAndPrices();
    } catch (err: any) {
      setSyncMessage({ text: err?.message || 'Failed to sync prices.', type: 'error' });
    } finally {
      setSyncingPrices(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  // Add Asset Form States
  const [newAssetId, setNewAssetId] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetTicker, setNewAssetTicker] = useState('');
  const [newAssetType, setNewAssetType] = useState<'stock' | 'crypto'>('crypto');
  const [newMinDeposit, setNewMinDeposit] = useState('');
  const [newMaxDeposit, setNewMaxDeposit] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newCoingeckoId, setNewCoingeckoId] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Edit Asset Modal States
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editName, setEditName] = useState('');
  const [editMinDeposit, setEditMinDeposit] = useState('');
  const [editMaxDeposit, setEditMaxDeposit] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const fetchAssetsAndPrices = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch assets
      const assetsSnapshot = await getDocs(collection(db, 'assets'));
      const assetList = assetsSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Asset[];
      setAssets(assetList);

      // 2. Fetch prices from assetPrices
      const pricesSnapshot = await getDocs(collection(db, 'assetPrices'));
      const pricesMap: Record<string, number> = {};
      pricesSnapshot.forEach((docSnapshot) => {
        pricesMap[docSnapshot.id] = docSnapshot.data().price || 0;
      });
      setPrices(pricesMap);
    } catch (error) {
      console.error('Error fetching investments data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribeAssets = onSnapshot(
      collection(db, 'assets'),
      (snapshot) => {
        setAssets(snapshot.docs.map((assetDoc) => ({
          id: assetDoc.id,
          ...assetDoc.data(),
        })) as Asset[]);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to investment assets:', error);
        setLoading(false);
      }
    );

    const unsubscribePrices = onSnapshot(
      collection(db, 'assetPrices'),
      (snapshot) => {
        const pricesMap: Record<string, number> = {};
        snapshot.forEach((priceDoc) => {
          const data = priceDoc.data();
          pricesMap[data.ticker || priceDoc.id] = Number(data.price) || 0;
        });
        setPrices(pricesMap);
      },
      (error) => {
        console.error('Error listening to investment prices:', error);
      }
    );

    return () => {
      unsubscribeAssets();
      unsubscribePrices();
    };
  }, []);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingAdd) return;

    const formattedId = newAssetId.trim().toLowerCase();
    const formattedTicker = newAssetTicker.trim().toUpperCase();
    const formattedName = newAssetName.trim();
    const formattedLogoUrl = newLogoUrl.trim();
    const formattedCoingeckoId = newCoingeckoId.trim().toLowerCase();
    const minDep = parseFloat(newMinDeposit);
    const maxDep = parseFloat(newMaxDeposit);

    setAddError('');
    setAddSuccess('');

    if (!formattedId || !formattedTicker || !formattedName || !formattedLogoUrl) {
      setAddError('ID, name, ticker, type, and logo URL are required.');
      return;
    }

    if (
      !Number.isFinite(minDep)
      || minDep <= 0
      || !Number.isFinite(maxDep)
      || maxDep < minDep
    ) {
      setAddError('Deposit limits must be positive numbers and maximum cannot be below minimum.');
      return;
    }

    if (newAssetType === 'crypto' && !formattedCoingeckoId) {
      setAddError('CoinGecko ID is required for crypto assets.');
      return;
    }

    setSubmittingAdd(true);
    try {
      const quote = await marketPriceService.createAssetWithLivePrice({
        id: formattedId,
        name: formattedName,
        ticker: formattedTicker,
        type: newAssetType,
        minDeposit: minDep,
        maxDeposit: maxDep,
        logoUrl: formattedLogoUrl,
        ...(newAssetType === 'crypto'
          ? { coingeckoId: formattedCoingeckoId }
          : {}),
      });

      setAddSuccess(
        `${formattedTicker} created at $${quote.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 8,
        })} from ${quote.provider}.`
      );
      
      // Reset form
      setNewAssetId('');
      setNewAssetName('');
      setNewAssetTicker('');
      setNewMinDeposit('');
      setNewMaxDeposit('');
      setNewLogoUrl('');
      setNewCoingeckoId('');

      await fetchAssetsAndPrices();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add new asset.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleOpenEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setEditName(asset.name);
    setEditMinDeposit(asset.minDeposit.toString());
    setEditMaxDeposit(asset.maxDeposit.toString());
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset || submittingEdit) return;

    const minDep = parseFloat(editMinDeposit);
    const maxDep = parseFloat(editMaxDeposit);
    const updatedName = editName.trim();

    if (!updatedName) {
      alert('Please enter a valid asset name.');
      return;
    }

    if (isNaN(minDep) || minDep <= 0 || isNaN(maxDep) || maxDep <= minDep) {
      alert('Ensure deposit limits are positive numbers and maximum is strictly greater than minimum.');
      return;
    }

    setSubmittingEdit(true);
    try {
      await adminService.updateAsset(editingAsset.id, {
        name: updatedName,
        minDeposit: minDep,
        maxDeposit: maxDep,
      });
      alert('Asset configuration updated.');
      setEditingAsset(null);
      await fetchAssetsAndPrices();
    } catch (err: any) {
      alert(err.message || 'Failed to update asset.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (window.confirm('WARNING: Are you sure you want to delete this asset? This can cause layout issues for users holding this asset.')) {
      try {
        await adminService.deleteAsset(assetId);
        alert('Asset deleted successfully.');
        await fetchAssetsAndPrices();
      } catch (err: any) {
        alert(err.message || 'Failed to delete asset.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <Loader variant="inline" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-textPrimary uppercase tracking-wider">Asset Catalog Configurations</h1>
          <p className="text-[10px] text-textSecondary font-semibold uppercase tracking-widest block mt-1">Configure trading instruments, deposit parameters, and review current spot rates</p>
        </div>

        <div className="flex items-center gap-3">
          {syncMessage && (
            <span
              className={`text-xs px-3 py-1.5 rounded-md font-medium ${
                syncMessage.type === 'success'
                  ? 'bg-success/15 text-success border border-success/30'
                  : 'bg-danger/15 text-danger border border-danger/30'
              }`}
            >
              {syncMessage.text}
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenBulkEdit}
            className="flex items-center gap-2 border-goldAccent/30 hover:border-goldAccent text-textPrimary hover:bg-goldAccent/10"
          >
            <Sliders className="w-3.5 h-3.5 text-goldAccent" />
            Bulk Edit Limits
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSyncPrices}
            disabled={syncingPrices}
            className="flex items-center gap-2 border-goldAccent/30 hover:border-goldAccent text-textPrimary hover:bg-goldAccent/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-goldAccent ${syncingPrices ? 'animate-spin' : ''}`} />
            {syncingPrices ? 'Syncing Market...' : 'Sync Live Prices'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Add Asset Form (4 cols) */}
        <div className="lg:col-span-4 flex">
          <Card className="flex-1 bg-surface border border-borderCustom p-6 flex flex-col justify-between">
            <form onSubmit={handleAddAsset} className="flex flex-col h-full justify-between gap-5">
              <div>
                <h3 className="text-xs font-extrabold text-textPrimary uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Plus className="w-4 h-4 text-goldAccent" /> Add New Asset Node
                </h3>

                <div className="flex flex-col gap-4">
                  {/* Asset ID */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Unique Asset ID (slug)</label>
                    <input
                      type="text"
                      value={newAssetId}
                      onChange={(e) => setNewAssetId(e.target.value)}
                      placeholder="e.g. bitcoin, apple"
                      required
                      className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                    />
                  </div>

                  {/* Asset Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Display Name</label>
                    <input
                      type="text"
                      value={newAssetName}
                      onChange={(e) => setNewAssetName(e.target.value)}
                      placeholder="e.g. Bitcoin, Apple Inc."
                      required
                      className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                    />
                  </div>

                  {/* Ticker */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Ticker Code</label>
                    <input
                      type="text"
                      value={newAssetTicker}
                      onChange={(e) => setNewAssetTicker(e.target.value)}
                      placeholder="e.g. BTC, AAPL"
                      required
                      className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                    />
                  </div>

                  {/* Logo URL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Logo URL</label>
                    <input
                      type="url"
                      value={newLogoUrl}
                      onChange={(e) => setNewLogoUrl(e.target.value)}
                      placeholder="https://cdn.example.com/asset-logo.png"
                      required
                      className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                    />
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Instrument Class</label>
                    <select
                      value={newAssetType}
                      onChange={(e) => setNewAssetType(e.target.value as 'stock' | 'crypto')}
                      className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                    >
                      <option value="crypto">Cryptocurrency</option>
                      <option value="stock">Equity / Stock</option>
                    </select>
                  </div>

                  {newAssetType === 'crypto' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">CoinGecko ID</label>
                      <input
                        type="text"
                        value={newCoingeckoId}
                        onChange={(e) => setNewCoingeckoId(e.target.value)}
                        placeholder="e.g. bitcoin, ethereum"
                        required
                        className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                      />
                    </div>
                  )}

                  {/* Limits */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Min Deposit</label>
                      <input
                        type="number"
                        step="any"
                        value={newMinDeposit}
                        onChange={(e) => setNewMinDeposit(e.target.value)}
                        placeholder="e.g. 50"
                        required
                        className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Max Deposit</label>
                      <input
                        type="number"
                        step="any"
                        value={newMaxDeposit}
                        onChange={(e) => setNewMaxDeposit(e.target.value)}
                        placeholder="e.g. 100000"
                        required
                        className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                      />
                    </div>
                  </div>

                  {addError && (
                    <div className="p-3 rounded-[8px] bg-danger/10 border border-danger/25 text-[10px] font-bold text-danger leading-relaxed">
                      {addError}
                    </div>
                  )}

                  {addSuccess && (
                    <div className="p-3 rounded-[8px] bg-success/10 border border-success/25 text-[10px] font-bold text-success leading-relaxed">
                      {addSuccess}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-borderCustom/60 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  className="text-[9px] font-extrabold uppercase tracking-widest px-4.5 min-h-[36px] h-9"
                  disabled={submittingAdd}
                >
                  {submittingAdd ? 'Fetching Live Price...' : 'Create Asset Node'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Assets Catalog Table (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <h2 className="text-xs font-extrabold text-textPrimary uppercase tracking-widest flex items-center gap-2">
            <Coins className="w-4 h-4 text-goldAccent" /> Active Assets Catalog
          </h2>

          <Table
            data={assets}
            columns={[
              {
                header: 'Asset Identity',
                key: 'name',
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <AssetLogo name={row.name} ticker={row.ticker} logoUrl={row.logoUrl} className="h-8 w-8" />
                    <div>
                      <span className="font-bold text-xs text-textPrimary block">{row.name}</span>
                      <span className="text-[9px] text-textSecondary font-mono block mt-0.5">{row.ticker} ({row.id})</span>
                    </div>
                  </div>
                ),
              },
              {
                header: 'Class',
                key: 'type',
                render: (row) => (
                  <Badge variant="neutral" className="text-[8px] font-extrabold tracking-widest uppercase">
                    {row.type}
                  </Badge>
                ),
              },
              {
                header: 'Deposit Limits',
                key: 'limits',
                render: (row) => (
                  <span className="text-[10px] font-mono text-textPrimary">
                    ${row.minDeposit.toLocaleString()} - ${row.maxDeposit.toLocaleString()}
                  </span>
                ),
              },
              {
                header: 'Spot price',
                key: 'price',
                render: (row) => {
                  const currentPrice = prices[row.ticker] || 0;
                  return currentPrice > 0 ? (
                    <span className="text-xs font-mono font-bold text-goldAccent">
                      ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-danger">
                      Unavailable
                    </span>
                  );
                },
              },
              {
                header: 'Actions',
                key: 'actions',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      className="p-1 h-7.5 w-7.5 bg-borderCustom/40 border-borderCustom hover:border-goldAccent text-textSecondary hover:text-goldAccent flex items-center justify-center rounded-btn"
                      onClick={() => handleOpenEdit(row)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      className="p-1 h-7.5 w-7.5 bg-danger/10 border-danger/20 hover:bg-danger/25 text-danger flex items-center justify-center rounded-btn"
                      onClick={() => handleDeleteAsset(row.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyState={
              <div className="p-8 text-center text-textSecondary">
                No assets configured in library.
              </div>
            }
            mobileRender={(row) => {
              const currentPrice = prices[row.ticker] || 0;
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AssetLogo name={row.name} ticker={row.ticker} logoUrl={row.logoUrl} className="h-8 w-8" />
                      <div>
                        <span className="font-bold text-xs text-textPrimary block">{row.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-textSecondary font-mono">{row.ticker}</span>
                          <Badge variant="neutral" className="text-[8px] font-extrabold tracking-widest uppercase">{row.type}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {currentPrice > 0 ? (
                        <span className="text-sm font-mono font-bold text-goldAccent">
                          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-danger">No Price</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-borderCustom/20 pt-2">
                    <span className="text-[10px] font-mono text-textSecondary">
                      ${row.minDeposit.toLocaleString()} – ${row.maxDeposit.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="p-1 h-7 w-7 bg-borderCustom/40 border-borderCustom hover:border-goldAccent text-textSecondary hover:text-goldAccent flex items-center justify-center rounded-btn"
                        onClick={() => handleOpenEdit(row)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="secondary"
                        className="p-1 h-7 w-7 bg-danger/10 border-danger/20 hover:bg-danger/25 text-danger flex items-center justify-center rounded-btn"
                        onClick={() => handleDeleteAsset(row.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>

      </div>

      {/* Edit limits modal */}
      <Modal
        isOpen={editingAsset !== null}
        onClose={() => setEditingAsset(null)}
        title={`Edit Asset Node: ${editingAsset?.ticker}`}
      >
        {editingAsset && (
          <form onSubmit={handleUpdateAsset} className="flex flex-col gap-4">
            {/* Display Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Asset Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full min-h-[44px] h-11 px-4 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
              />
            </div>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Min Deposit (USD)</label>
                <input
                  type="number"
                  step="any"
                  value={editMinDeposit}
                  onChange={(e) => setEditMinDeposit(e.target.value)}
                  required
                  className="w-full min-h-[44px] h-11 px-4 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Max Deposit (USD)</label>
                <input
                  type="number"
                  step="any"
                  value={editMaxDeposit}
                  onChange={(e) => setEditMaxDeposit(e.target.value)}
                  required
                  className="w-full min-h-[44px] h-11 px-4 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-borderCustom">
              <Button
                type="button"
                variant="secondary"
                className="text-[9px] font-extrabold uppercase tracking-widest px-4 min-h-[38px] h-9 border-borderCustom"
                onClick={() => setEditingAsset(null)}
                disabled={submittingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="text-[9px] font-extrabold uppercase tracking-widest px-5.5 min-h-[38px] h-9"
                disabled={submittingEdit}
              >
                {submittingEdit ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Bulk Edit Limits Modal */}
      <Modal
        isOpen={bulkEditOpen}
        onClose={() => !submittingBulk && setBulkEditOpen(false)}
        title="Bulk Update Investment Limits"
      >
        <form onSubmit={handleApplyBulkLimits} className="flex flex-col gap-5 pt-1">
          <p className="text-xs text-textSecondary leading-relaxed">
            Apply universal minimum and maximum deposit parameters across multiple instruments simultaneously in one atomic transaction.
          </p>

          {bulkError && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-xs font-semibold">
              {bulkError}
            </div>
          )}

          {bulkSuccess && (
            <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-success text-xs font-semibold">
              {bulkSuccess}
            </div>
          )}

          {/* Scope Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Target Instrument Scope</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBulkFilterType('all')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                  bulkFilterType === 'all'
                    ? 'bg-goldAccent/15 border-goldAccent text-goldAccent'
                    : 'bg-bgMain border-borderCustom text-textSecondary hover:text-textPrimary'
                }`}
              >
                All Assets ({assets.length})
              </button>
              <button
                type="button"
                onClick={() => setBulkFilterType('crypto')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                  bulkFilterType === 'crypto'
                    ? 'bg-goldAccent/15 border-goldAccent text-goldAccent'
                    : 'bg-bgMain border-borderCustom text-textSecondary hover:text-textPrimary'
                }`}
              >
                Crypto Only ({assets.filter((a) => a.type === 'crypto').length})
              </button>
              <button
                type="button"
                onClick={() => setBulkFilterType('stock')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                  bulkFilterType === 'stock'
                    ? 'bg-goldAccent/15 border-goldAccent text-goldAccent'
                    : 'bg-bgMain border-borderCustom text-textSecondary hover:text-textPrimary'
                }`}
              >
                Stocks Only ({assets.filter((a) => a.type === 'stock').length})
              </button>
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">New Min Deposit (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary font-bold text-xs">$</span>
                <input
                  type="number"
                  step="any"
                  value={bulkMinDeposit}
                  onChange={(e) => setBulkMinDeposit(e.target.value)}
                  placeholder="e.g. 50"
                  required
                  className="w-full min-h-[44px] h-11 pl-7 pr-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">New Max Deposit (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary font-bold text-xs">$</span>
                <input
                  type="number"
                  step="any"
                  value={bulkMaxDeposit}
                  onChange={(e) => setBulkMaxDeposit(e.target.value)}
                  placeholder="e.g. 20000"
                  required
                  className="w-full min-h-[44px] h-11 pl-7 pr-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-borderCustom text-[11px] text-textSecondary flex items-center gap-2">
            <Layers className="w-4 h-4 text-goldAccent shrink-0" />
            <span>
              Will apply limits: <strong className="text-textPrimary">${bulkMinDeposit || 0}</strong> min / <strong className="text-textPrimary">${bulkMaxDeposit || 0}</strong> max across{' '}
              <strong className="text-goldAccent">
                {bulkFilterType === 'all'
                  ? assets.length
                  : bulkFilterType === 'crypto'
                  ? assets.filter((a) => a.type === 'crypto').length
                  : assets.filter((a) => a.type === 'stock').length}
              </strong>{' '}
              catalog assets.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-borderCustom">
            <Button
              type="button"
              variant="secondary"
              className="text-[9px] font-extrabold uppercase tracking-widest px-4 min-h-[38px] h-9 border-borderCustom"
              onClick={() => setBulkEditOpen(false)}
              disabled={submittingBulk}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="text-[9px] font-extrabold uppercase tracking-widest px-5.5 min-h-[38px] h-9"
              disabled={submittingBulk}
            >
              {submittingBulk ? 'Applying Limits...' : 'Apply Bulk Limits'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminInvestmentsPage;
