/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { adminService } from '../../services/adminService';
import type { DepositAddress } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Loader } from '../../components/Loader';
import { Modal } from '../../components/Modal';
import { Plus, Edit2, Trash2, MapPin, Check } from 'lucide-react';

export const AdminDepositAddressesPage: React.FC = () => {
  const [addresses, setAddresses] = useState<DepositAddress[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Address Form States
  const [newLabel, setNewLabel] = useState('');
  const [newNetwork, setNewNetwork] = useState('BTC');
  const [newAddress, setNewAddress] = useState('');
  const [newActive, setNewActive] = useState(false);
  const [newPaymentAssetSymbol, setNewPaymentAssetSymbol] = useState('BTC');
  const [newPaymentAssetName, setNewPaymentAssetName] = useState('Bitcoin');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Address Modal States
  const [editingAddr, setEditingAddr] = useState<DepositAddress | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editNetwork, setEditNetwork] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPaymentAssetSymbol, setEditPaymentAssetSymbol] = useState('');
  const [editPaymentAssetName, setEditPaymentAssetName] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'depositAddresses'));
      const addrList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as DepositAddress[];
      setAddresses(addrList);
    } catch (error) {
      console.error('Error fetching deposit addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingAdd) return;

    const labelStr = newLabel.trim();
    const networkStr = newNetwork.trim().toUpperCase();
    const addressStr = newAddress.trim();
    const assetSymbolStr = newPaymentAssetSymbol.trim().toUpperCase();
    const assetNameStr = newPaymentAssetName.trim();

    if (!labelStr || !networkStr || !addressStr || !assetSymbolStr || !assetNameStr) {
      alert('Please fill out all address fields.');
      return;
    }

    setSubmittingAdd(true);
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(addressStr)}`;
      
      await adminService.addDepositAddress({
        label: labelStr,
        network: networkStr,
        address: addressStr,
        qrCodeUrl,
        active: newActive,
        paymentAssetSymbol: assetSymbolStr,
        paymentAssetName: assetNameStr,
      });

      alert('Deposit address added successfully.');
      setNewLabel('');
      setNewAddress('');
      setNewActive(false);
      setNewPaymentAssetSymbol('BTC');
      setNewPaymentAssetName('Bitcoin');
      await fetchAddresses();
    } catch (err: any) {
      alert(err.message || 'Failed to add deposit address.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleSetActive = async (addrId: string, network: string) => {
    setTogglingActiveId(addrId);
    try {
      await adminService.setActiveAddress(addrId, network);
      await fetchAddresses();
    } catch (err: any) {
      alert(err.message || 'Failed to update active state.');
    } finally {
      setTogglingActiveId(null);
    }
  };

  const handleOpenEdit = (addr: DepositAddress) => {
    setEditingAddr(addr);
    setEditLabel(addr.label);
    setEditNetwork(addr.network);
    setEditAddress(addr.address);
    setEditPaymentAssetSymbol(addr.paymentAssetSymbol || '');
    setEditPaymentAssetName(addr.paymentAssetName || '');
  };

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddr || submittingEdit) return;

    const labelStr = editLabel.trim();
    const networkStr = editNetwork.trim().toUpperCase();
    const addressStr = editAddress.trim();
    const assetSymbolStr = editPaymentAssetSymbol.trim().toUpperCase();
    const assetNameStr = editPaymentAssetName.trim();

    if (!labelStr || !networkStr || !addressStr || !assetSymbolStr || !assetNameStr) {
      alert('Fields cannot be empty.');
      return;
    }

    setSubmittingEdit(true);
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(addressStr)}`;
      await adminService.updateDepositAddress(editingAddr.id, {
        label: labelStr,
        network: networkStr,
        address: addressStr,
        qrCodeUrl,
        paymentAssetSymbol: assetSymbolStr,
        paymentAssetName: assetNameStr,
      });
      alert('Deposit address updated successfully.');
      setEditingAddr(null);
      await fetchAddresses();
    } catch (err: any) {
      alert(err.message || 'Failed to update address.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (window.confirm('Are you sure you want to delete this deposit address?')) {
      try {
        await adminService.deleteDepositAddress(addrId);
        alert('Address deleted.');
        await fetchAddresses();
      } catch (err: any) {
        alert(err.message || 'Failed to delete address.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <Loader variant="inline" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-textPrimary uppercase tracking-wider">Deposit Wallet Manager</h1>
        <p className="text-[10px] text-textSecondary font-semibold uppercase tracking-widest block mt-1">Configure company hot wallets, deposit networks, and toggle active payment paths</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Add Address Form (4 cols) */}
        <div className="lg:col-span-4 flex">
          <Card className="flex-1 bg-surface border border-borderCustom p-6 flex flex-col justify-between">
            <form onSubmit={handleAddAddress} className="flex flex-col h-full justify-between gap-5">
              <div>
                <h3 className="text-xs font-extrabold text-textPrimary uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Plus className="w-4 h-4 text-goldAccent" /> Add Wallet Address
                </h3>

                <div className="flex flex-col gap-4">
                  {/* Label */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Wallet Label / Descriptor</label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. BTC Primary Wallet"
                      required
                      className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                    />
                  </div>

                  {/* Network */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Network / Blockchain Protocol</label>
                    <input
                      type="text"
                      list="networks"
                      value={newNetwork}
                      onChange={(e) => setNewNetwork(e.target.value)}
                      placeholder="e.g. TRC20"
                      required
                      className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                    />
                    <datalist id="networks">
                      <option value="BTC" />
                      <option value="ERC20" />
                      <option value="TRC20" />
                      <option value="BEP20" />
                      <option value="SOL" />
                      <option value="Polygon" />
                      <option value="Arbitrum" />
                      <option value="Optimism" />
                      <option value="Avalanche C-Chain" />
                    </datalist>
                  </div>

                  {/* Payment Asset Symbol */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Payment Asset Symbol</label>
                    <input
                      type="text"
                      value={newPaymentAssetSymbol}
                      onChange={(e) => setNewPaymentAssetSymbol(e.target.value)}
                      placeholder="e.g. USDT"
                      required
                      className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                    />
                  </div>

                  {/* Payment Asset Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Payment Asset Name</label>
                    <input
                      type="text"
                      value={newPaymentAssetName}
                      onChange={(e) => setNewPaymentAssetName(e.target.value)}
                      placeholder="e.g. Tether"
                      required
                      className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                    />
                  </div>

                  {/* Address */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Wallet Public Address</label>
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="e.g. 1A1zP1eP5QGefi2D..."
                      required
                      className="w-full min-h-[38px] h-9 px-3 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
                    />
                  </div>

                  {/* Active Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newActive}
                      onChange={(e) => setNewActive(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-borderCustom text-goldAccent bg-bgMain focus:ring-goldAccent focus:ring-offset-bgMain"
                    />
                    <span className="text-xs font-bold text-textPrimary uppercase tracking-wider">Set Active Immediately</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-borderCustom/60 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  className="text-[9px] font-extrabold uppercase tracking-widest px-4.5 min-h-[36px] h-9"
                  disabled={submittingAdd}
                >
                  Register Address
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Addresses Catalog Table (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <h2 className="text-xs font-extrabold text-textPrimary uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-4 h-4 text-goldAccent" /> Active Address Registry
          </h2>

          <Table
            data={addresses}
            columns={[
              {
                header: 'Wallet Label / Info',
                key: 'label',
                render: (row) => (
                  <div>
                    <span className="font-bold text-xs text-textPrimary block">{row.label}</span>
                    <span className="text-[10px] text-goldAccent font-bold block mt-0.5">
                      Asset: {row.paymentAssetName || (row.network === 'BTC' ? 'Bitcoin' : 'Tether')} ({row.paymentAssetSymbol || (row.network === 'BTC' ? 'BTC' : 'USDT')})
                    </span>
                    <span className="text-[10px] text-textSecondary font-mono block mt-0.5 max-w-[240px] truncate select-all">{row.address}</span>
                  </div>
                ),
              },
              {
                header: 'Network',
                key: 'network',
                render: (row) => (
                  <Badge variant="neutral" className="text-[8px] font-extrabold tracking-widest uppercase">
                    {row.network}
                  </Badge>
                ),
              },
              {
                header: 'Status',
                key: 'active',
                render: (row) => (
                  <div className="flex items-center select-none">
                    {row.active ? (
                      <Badge variant="success" className="text-[8px] font-extrabold tracking-widest uppercase flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> ACTIVE
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[8px] font-extrabold tracking-widest uppercase">
                        INACTIVE
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                header: 'Actions',
                key: 'actions',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    {!row.active && (
                      <Button
                        variant="secondary"
                        className="text-[9px] font-extrabold uppercase tracking-widest px-2.5 min-h-[28px] h-7 bg-goldAccent/10 border-goldAccent/30 hover:bg-goldAccent/20 text-goldAccent flex items-center gap-1"
                        disabled={togglingActiveId !== null}
                        onClick={() => handleSetActive(row.id, row.network)}
                      >
                        Activate
                      </Button>
                    )}
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
                      onClick={() => handleDeleteAddress(row.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyState={
              <div className="p-8 text-center text-textSecondary">
                No deposit addresses registered.
              </div>
            }
          />
        </div>

      </div>

      {/* Edit Address Modal */}
      <Modal
        isOpen={editingAddr !== null}
        onClose={() => setEditingAddr(null)}
        title="Edit Deposit Address Details"
      >
        {editingAddr && (
          <form onSubmit={handleUpdateAddress} className="flex flex-col gap-4">
            {/* Label */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Wallet Label / Descriptor</label>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                required
                className="w-full min-h-[44px] h-11 px-4 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
              />
            </div>

            {/* Network */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Network / Blockchain Protocol</label>
              <input
                type="text"
                list="edit-networks"
                value={editNetwork}
                onChange={(e) => setEditNetwork(e.target.value)}
                required
                className="w-full min-h-[44px] h-11 px-4 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
              />
              <datalist id="edit-networks">
                <option value="BTC" />
                <option value="ERC20" />
                <option value="TRC20" />
                <option value="BEP20" />
                <option value="SOL" />
                <option value="Polygon" />
                <option value="Arbitrum" />
                <option value="Optimism" />
                <option value="Avalanche C-Chain" />
              </datalist>
            </div>

            {/* Payment Asset Symbol */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Payment Asset Symbol</label>
              <input
                type="text"
                value={editPaymentAssetSymbol}
                onChange={(e) => setEditPaymentAssetSymbol(e.target.value)}
                required
                className="w-full min-h-[44px] h-11 px-4 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
              />
            </div>

            {/* Payment Asset Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Payment Asset Name</label>
              <input
                type="text"
                value={editPaymentAssetName}
                onChange={(e) => setEditPaymentAssetName(e.target.value)}
                required
                className="w-full min-h-[44px] h-11 px-4 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
              />
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-textSecondary uppercase tracking-widest font-bold">Wallet Address</label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                required
                className="w-full min-h-[44px] h-11 px-4 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-borderCustom">
              <Button
                type="button"
                variant="secondary"
                className="text-[9px] font-extrabold uppercase tracking-widest px-4 min-h-[38px] h-9 border-borderCustom"
                onClick={() => setEditingAddr(null)}
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
                {submittingEdit ? 'Saving...' : 'Save Wallet'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdminDepositAddressesPage;
