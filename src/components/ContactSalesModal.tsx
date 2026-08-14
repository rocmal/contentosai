import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { CompanySize, submitSalesInquiry } from '../lib/api';

interface ContactSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMPANY_SIZES: CompanySize[] = ['1-10', '11-50', '51-200', '201-500', '500+'];

const inputClass =
  'w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500';
const labelClass = 'block text-xs font-bold text-slate-900 dark:text-white mb-1';

export const ContactSalesModal: React.FC<ContactSalesModalProps> = ({ isOpen, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState<CompanySize>('1-10');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    // Reset for next open, after the close animation has a moment to run.
    setTimeout(() => {
      setStatus('idle');
      setError(null);
      setFullName('');
      setWorkEmail('');
      setCompanyName('');
      setCompanySize('1-10');
      setPhone('');
      setMessage('');
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      await submitSalesInquiry({
        fullName,
        workEmail,
        companyName,
        companySize,
        phone: phone || undefined,
        message,
      });
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not send your inquiry. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5">
          {status === 'sent' ? (
            <div className="py-8 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Thanks - we'll be in touch</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Our sales team will reach out to {workEmail} shortly to talk through Enterprise plans for{' '}
                {companyName}.
              </p>
              <button
                onClick={handleClose}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Contact Sales</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tell us about your team and we'll follow up with Enterprise pricing and options.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Full name</label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Work email</label>
                    <input
                      type="email"
                      required
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Company name</label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Company size</label>
                    <select
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value as CompanySize)}
                      className={inputClass}
                    >
                      {COMPANY_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size} employees
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Phone (optional)</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>What are you looking to achieve?</label>
                  <textarea
                    required
                    minLength={10}
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. team size, SSO/security requirements, usage volume..."
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {status === 'error' && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-[11px] text-red-700 dark:text-red-300">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white transition-colors"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send to sales'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
