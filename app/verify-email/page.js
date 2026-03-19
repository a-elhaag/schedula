import { Suspense } from 'react';
import VerifyEmailContent from './content';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="page-container"><div style={{ textAlign: 'center' }}>Loading...</div></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
