import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

const RiskSection: React.FC<{ title: string; children: React.ReactNode; variant?: 'normal' | 'warning' }> = ({
  title, children, variant = 'normal',
}) => (
  <div className={`rounded-[10px] border p-5 flex flex-col gap-3 ${
    variant === 'warning'
      ? 'border-goldAccent/30 bg-goldAccent/5'
      : 'border-borderCustom/50 bg-bgMain/40'
  }`}>
    <h2 className={`text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 ${
      variant === 'warning' ? 'text-goldAccent' : 'text-textPrimary'
    }`}>
      {variant === 'warning' && <AlertTriangle className="w-3.5 h-3.5" />}
      {title}
    </h2>
    <div className="text-xs text-textSecondary leading-relaxed space-y-2">
      {children}
    </div>
  </div>
);

export const RiskDisclosurePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bgMain text-textPrimary">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-bgMain/95 backdrop-blur border-b border-borderCustom/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-textSecondary hover:text-goldAccent transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-4 w-[1px] bg-borderCustom/60" />
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-goldAccent" />
            <span className="text-xs font-bold uppercase tracking-wider text-textPrimary">Risk Disclosure</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-20">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-[10px] bg-danger/10 border border-danger/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-textPrimary">Vantage Risk Disclosure</h1>
              <p className="text-[10px] text-textSecondary font-semibold uppercase tracking-widest mt-0.5">
                Last Updated: June 2026
              </p>
            </div>
          </div>

          {/* General Warning Banner */}
          <div className="mt-5 p-4 rounded-[10px] border border-danger/30 bg-danger/5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-danger uppercase tracking-wider">General Risk Warning</p>
              <p className="text-xs text-textSecondary leading-relaxed mt-1">
                Trading and investing in financial assets carries significant risk. The value of your investments may rise or fall, and you may receive back less than you initially invested.{' '}
                <span className="font-semibold text-textPrimary">Past performance is not indicative of future results.</span>{' '}
                You should not invest funds you cannot afford to lose.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4">

          <RiskSection title="Market Risk">
            <p>
              All assets available on the Vantage Markets platform — including stocks, equities, and digital currencies — are subject to market risk. Asset values may rise or fall rapidly in response to:
            </p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Global economic events and macroeconomic indicators',
                'Company-specific news, earnings reports, or regulatory changes',
                'Shifts in investor sentiment or market speculation',
                'Supply and demand imbalances across trading markets',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </RiskSection>

          <RiskSection title="Liquidity Risk">
            <p>
              Some assets may experience periods of reduced liquidity, meaning it may not always be possible to execute transactions at desired price levels or within expected timeframes.
            </p>
            <p>
              In low-liquidity conditions, asset prices may be more susceptible to volatility, and withdrawal or deposit processing times may be extended beyond standard operating periods.
            </p>
          </RiskSection>

          <RiskSection title="Technology Risk">
            <p>
              The Vantage Markets platform operates through digital infrastructure including cloud services, blockchain networks, and third-party data providers. As a result, you may be exposed to:
            </p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Platform downtime due to server maintenance or infrastructure issues',
                'Price data delays caused by third-party API disruptions',
                'Internet connectivity failures affecting account access',
                'Cybersecurity threats including attempted unauthorized access or phishing attacks',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1">
              Vantage Markets implements robust security measures to minimize technology risk but cannot guarantee uninterrupted service availability.
            </p>
          </RiskSection>

          <RiskSection title="Digital Asset Risk" variant="warning">
            <p>
              Cryptocurrency and digital asset markets carry additional and elevated risks compared to traditional financial markets:
            </p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Extreme price volatility — assets may lose significant value within hours',
                'Rapid and unpredictable price movements driven by sentiment or news events',
                'Evolving regulatory environments that may restrict or prohibit asset trading in certain jurisdictions',
                'Irreversibility of blockchain transactions — erroneous transfers cannot be recalled',
                'Smart contract risks and protocol-level vulnerabilities in underlying blockchain networks',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 font-semibold text-textPrimary">
              Digital assets are speculative instruments. Only allocate capital you are fully prepared to lose.
            </p>
          </RiskSection>

          <RiskSection title="Funding & Network Risk" variant="warning">
            <p>
              When funding your Vantage Markets account, you assume full personal responsibility for:
            </p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Using the exact wallet address displayed on the deposit screen',
                'Selecting the correct blockchain network that matches the deposit address',
                'Sending the correct currency and payment amount as specified',
                'Verifying all transaction details before confirming payment',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 font-semibold text-danger">
              ⚠ Sending funds to an incorrect address or via the wrong network may result in permanent, unrecoverable loss of funds. Vantage Markets cannot retrieve misdirected payments under any circumstances.
            </p>
          </RiskSection>

          <RiskSection title="No Guaranteed Returns">
            <p>
              Vantage Markets does not guarantee, represent, or warrant any of the following:
            </p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Profits or positive returns on any investment or holding',
                'Specific performance outcomes for any asset class',
                'Protection against partial or total loss of invested capital',
                'Accuracy or completeness of live price data sourced from third-party providers',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Portfolio valuations displayed on the platform are calculated using live market prices and are indicative only. They may not reflect actual realizable value at the time of withdrawal.
            </p>
          </RiskSection>

          {/* Final Acknowledgement */}
          <div className="rounded-[10px] border border-goldAccent/40 bg-goldAccent/5 p-5 mt-2">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-goldAccent mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> User Acknowledgement
            </h2>
            <p className="text-xs text-textSecondary leading-relaxed">
              By accessing and using the Vantage Markets platform, you confirm that you have read, understood, and voluntarily accepted all risks outlined in this Risk Disclosure document. You acknowledge that:
            </p>
            <ul className="list-none space-y-1.5 mt-3">
              {[
                'You are participating in asset markets of your own free will',
                'You understand that past performance is not a reliable indicator of future results',
                'You have assessed and accepted the risks appropriate to your financial situation',
                'You will not hold Vantage Markets liable for investment losses arising from market conditions',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-textSecondary">
                  <span className="text-goldAccent mt-0.5 shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <p className="text-center text-[10px] text-textSecondary/60 font-mono uppercase tracking-widest mt-8">
          © 2026 Vantage Markets — Trade with the advantage.
        </p>
      </div>
    </div>
  );
};

export default RiskDisclosurePage;
