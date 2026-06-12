import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Eye } from 'lucide-react';

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

export const PrivacyPolicyPage: React.FC = () => {
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
            <Eye className="w-4 h-4 text-goldAccent" />
            <span className="text-xs font-bold uppercase tracking-wider text-textPrimary">Privacy & Cookies Policy</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-20">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-[10px] bg-goldAccent/10 border border-goldAccent/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-goldAccent" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-textPrimary">Privacy & Cookies Policy</h1>
              <p className="text-[10px] text-textSecondary font-semibold uppercase tracking-widest mt-0.5">
                
              </p>
            </div>
          </div>
          <p className="text-xs text-textSecondary leading-relaxed mt-4">
            At Vantage Markets, your privacy is a fundamental priority. This policy explains how we collect, use, protect, and manage your personal data when you use our platform and services.
          </p>
        </div>

        {/* Content */}
        <div className="bg-surface border border-borderCustom/60 rounded-[12px] p-6 sm:p-8 flex flex-col gap-8">

          <Section number="1" title="Information We Collect">
            <p>When you register and use Vantage Markets, we may collect the following categories of information:</p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Full name and email address provided at registration',
                'Account activity including deposit and withdrawal transactions',
                'Support communications and chat message history',
                'Platform usage data including session activity and feature engagement',
                'Technical data such as browser type, device information, and IP address for security purposes',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              We collect only the minimum information necessary to provide a secure and functional platform experience.
            </p>
          </Section>

          <Section number="2" title="How We Use Your Information">
            <p>Your personal information is used exclusively for the following operational purposes:</p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Account creation, management, and authentication',
                'Processing your deposit and withdrawal transactions',
                'Security monitoring to detect and prevent unauthorized access',
                'Fraud prevention and compliance with applicable financial regulations',
                'Delivering customer support through our encrypted support desk',
                'Sending critical platform notifications where required',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              We do not use your personal information for unsolicited marketing purposes without your explicit consent.
            </p>
          </Section>

          <Section number="3" title="Data Security">
            <p>
              Vantage Markets employs industry-standard security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction:
            </p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'End-to-end encryption for all data transmitted between your device and our servers',
                'Firebase Authentication with secure token-based session management',
                'Strict Firestore security rules restricting data access to authorized users only',
                'Administrative access controls limiting sensitive data visibility to authorized personnel',
                'Automated session expiration and token invalidation for idle accounts',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              While we implement robust security measures, no system can guarantee absolute security. We encourage you to use strong, unique passwords and to log out of your account when using shared devices.
            </p>
          </Section>

          <Section number="4" title="Cookies & Session Management">
            <p>
              Vantage Markets uses cookies and similar local storage technologies for the following purposes:
            </p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Session management: maintaining your authenticated login state across page visits',
                'Preferences: remembering your selected market mode (Stocks or Crypto)',
                'Security: storing session tokens to validate authorized requests',
                'Performance: caching non-sensitive data to improve page load times',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Essential cookies are required for the platform to function correctly. You may clear cookies at any time through your browser settings, but doing so will end your active session.
            </p>
          </Section>

          <Section number="5" title="Data Sharing & Third Parties">
            <p className="font-semibold text-textPrimary">
              Vantage Markets does not sell, rent, or trade your personal information to any third party.
            </p>
            <p className="mt-2">
              Your data may be shared only in the following limited and lawful circumstances:
            </p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Where required by applicable law, court order, or regulatory authority',
                'With Firebase (Google) as our infrastructure provider, subject to their privacy policies',
                'Where you have provided explicit, informed consent for a specific disclosure',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Any third-party services we use are carefully vetted for compliance with applicable data protection standards.
            </p>
          </Section>

          <Section number="6" title="Your Rights & Data Control">
            <p>As a Vantage Markets user, you have the following rights regarding your personal data:</p>
            <ul className="list-none space-y-1.5 mt-1">
              {[
                'Request a copy of the personal information we hold about your account',
                'Update or correct your profile details through your account settings',
                'Request deletion of your account and associated personal data',
                'Withdraw consent for optional data processing activities at any time',
                'Contact our support desk with any privacy-related concerns or complaints',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-goldAccent mt-0.5">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              To exercise any of your data rights, please contact us through the Support Hub available within your account settings. We aim to respond to all data requests within 30 business days.
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

export default PrivacyPolicyPage;
