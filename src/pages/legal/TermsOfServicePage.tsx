import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';

const Section: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({
  number, title, children,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-start gap-3">
      <span className="text-goldAccent font-black font-mono text-sm mt-0.5 shrink-0">{number}.</span>
      <h2 className="text-sm font-bold uppercase tracking-wider text-goldAccent">{title}</h2>
    </div>
    <div className="pl-6 text-xs text-textSecondary leading-relaxed space-y-2">
      {children}
    </div>
    <div className="h-[1px] bg-borderCustom/40 mt-2" />
  </div>
);

export const TermsOfServicePage: React.FC = () => {
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
            <FileText className="w-4 h-4 text-goldAccent" />
            <span className="text-xs font-bold uppercase tracking-wider text-textPrimary">Terms of Service</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-20">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-[10px] bg-goldAccent/10 border border-goldAccent/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-goldAccent" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-textPrimary">Terms of Service</h1>
              <p className="text-[10px] text-textSecondary font-semibold uppercase tracking-widest mt-0.5">
                
              </p>
            </div>
          </div>
          <p className="text-xs text-textSecondary leading-relaxed mt-4">
            Please read these Terms of Service carefully before using the Vantage Markets platform. By accessing or using our services, you confirm that you have read, understood, and agreed to be bound by these terms.
          </p>
        </div>

        {/* Content */}
        <div className="bg-surface border border-borderCustom/60 rounded-[12px] p-6 sm:p-8 flex flex-col gap-8">

          <Section number="1" title="Acceptance of Terms">
            <p>
              By accessing or using the Vantage Markets platform, website, or any associated services, you acknowledge that you have read and understood these Terms of Service and agree to be legally bound by them.
            </p>
            <p>
              If you do not agree to these terms in their entirety, you must immediately discontinue use of the platform. These terms constitute a legally binding agreement between you and Vantage Markets.
            </p>
          </Section>

          <Section number="2" title="Platform Services">
            <p>Vantage Markets provides the following core services to registered users:</p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Portfolio tracking and valuation based on live market data',
                'Asset funding via supported payment networks',
                'Digital account management including holdings and balance overview',
                'Real-time encrypted customer support services',
                'Withdrawal request processing subject to compliance review',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Services are subject to change, suspension, or termination at any time. Vantage Markets reserves the right to modify or discontinue any service without prior notice.
            </p>
          </Section>

          <Section number="3" title="Account Responsibilities">
            <p>As a registered account holder, you are solely responsible for:</p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Providing accurate, truthful, and current registration information',

                'Promptly notifying Vantage Markets of any suspected unauthorized use',
                'Maintaining the accuracy and completeness of your account profile',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

          </Section>

          <Section number="4" title="Funding & Deposits">
            <p>
              When initiating a deposit or funding transaction, you accept full responsibility for the accuracy of:
            </p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'The payment amount specified in your deposit request',
                'The correct network selection matching the displayed wallet address',
                'The destination wallet address provided by Vantage Markets',
                'The payment asset used and its compatibility with the stated network',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-semibold text-textPrimary">
              ⚠ Important: Sending funds to an incorrect wallet address or via the wrong network may result in permanent, irreversible loss of funds. Vantage Markets cannot recover misdirected payments.
            </p>
          </Section>

          <Section number="5" title="Withdrawals">
            <p>
              All withdrawal requests are subject to our security review and compliance procedures. Withdrawals may be:
            </p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Reviewed by our compliance team prior to processing',
                'Delayed for additional security verification checks',
                'Temporarily restricted where compliance or fraud concerns arise',
                'Suspended in accordance with applicable regulatory obligations',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              In the event your withdrawal access is restricted, you will be notified and may contact our support desk for further guidance.
            </p>
          </Section>

          <Section number="6" title="Prohibited Activities">
            <p>The following activities are strictly prohibited on the Vantage Markets platform:</p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Fraud, misrepresentation, or submission of false information',
                'Identity abuse or impersonation of any individual or entity',
                'Money laundering or structuring of transactions to conceal the origin of funds',
                'Manipulation of platform systems, exploiting vulnerabilities, or automated abuse',
                'Unauthorized access to other user accounts or administrative systems',
                'Any activity that violates applicable laws or financial regulations',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Violations may result in immediate account suspension and reporting to relevant regulatory authorities.
            </p>
          </Section>

          

          <Section number="7" title="Modifications to These Terms">
            <p>
              Vantage Markets reserves the right to update or modify these Terms of Service at any time. Material changes will be communicated through platform notifications or email.
            </p>
            <p>
              Your continued use of the platform following any modifications constitutes your acceptance of the revised terms. We recommend reviewing these terms periodically to remain informed of any updates.
            </p>
            <p>
              For questions about these terms, please contact our support desk through the platform's support section.
            </p>
          </Section>

        </div>

        <p className="text-center text-[10px] text-textSecondary/60 font-mono uppercase tracking-widest mt-8">
          © 2026 Vantage Markets — Trade with the advantage.
        </p>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
