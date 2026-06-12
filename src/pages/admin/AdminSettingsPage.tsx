import React from 'react';
import { Card } from '../../components/Card';
import { Settings, ShieldCheck } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => (
  <div className="flex flex-col gap-6">
    <div>
      <h1 className="text-xl font-extrabold text-textPrimary uppercase tracking-wider flex items-center gap-2">
        <Settings className="h-5 w-5 text-goldAccent" /> Platform Settings
      </h1>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-textSecondary">
        Runtime configuration and security posture
      </p>
    </div>

    <Card className="flex items-start gap-4">
      <ShieldCheck className="h-6 w-6 shrink-0 text-success" />
      <div>
        <h2 className="text-sm font-bold text-textPrimary">Managed configuration</h2>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-textSecondary">
          Firebase project credentials, cron secrets, and market-data provider keys are managed through deployment
          environment variables. User roles remain controlled through protected Firestore profile updates.
        </p>
      </div>
    </Card>
  </div>
);

export default AdminSettingsPage;
