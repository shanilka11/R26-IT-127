import React from 'react';
import VerificationHistory from './VerificationHistory';
import './PassengerVerification.css';
export default function VerificationAdmin() {
  return <main className="pv-page"><header className="pv-heading"><a href="/Admin">← Administration</a><h1>Verification History Administration</h1>
    <p>Local demo attribution only. This screen does not enforce authenticated administrator permissions.</p>
    <p>Only the latest active decision on a ticket can be voided. Corrections retain the original record and restore its preceding state.</p></header>
    <VerificationHistory administration /></main>;
}
