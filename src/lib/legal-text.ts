// Static legal documents shipped in the app bundle so they're readable offline.
export const TERMS_OF_SERVICE = `Witness R.E.P — Terms of Service

Last updated: May 2026

1. Acceptance of Terms
By using Witness R.E.P ("the App") you agree to these Terms of Service. If you do
not agree, do not use the App.

2. What Witness R.E.P Is
Witness R.E.P is a camera-first civil rights and personal safety tool. It records
video, optionally encrypts and signs that video, and may broadcast a live
stream or your location to people you trust. You are solely responsible for
how you use it and for complying with the laws of your jurisdiction
(including consent-to-record and wiretap laws).

3. Your Account
If you create an account you must provide accurate information. You are
responsible for safeguarding your phone, PIN and any backup keys. We will
never ask you for your PIN.

4. Your Content
Recordings you create remain yours. By uploading a recording to our cloud
backup you grant Witness R.E.P a non-exclusive licence to store and transmit that
recording strictly so we can deliver the service to you. We do not sell your
content. We do not train AI models on your content.

5. Public Broadcasts
If you choose to "Go Live" or publish a recording publicly, that content
becomes viewable by anyone with the link. You are responsible for the people
depicted and for any consent required.

6. Trusted Contacts and Location Sharing
You can share your live location with mutually-accepted contacts. You can
revoke a share at any time. Contacts only see what you have explicitly
enabled.

7. Prohibited Use
You may not use Witness R.E.P to harass, stalk, defame, or unlawfully surveil any
person, or to record where you have no legal right to do so.

8. No Warranty
The App is provided "as is" without warranty of any kind. We do not
guarantee the App will be available, accurate, or suitable for any
particular purpose, including legal evidence.

9. Limitation of Liability
To the maximum extent permitted by law, Witness R.E.P and its operators are not
liable for any indirect, incidental, or consequential damages arising from
your use of the App.

10. Termination
You may stop using the App and delete your account at any time from
Settings → Account → Delete Account. We may suspend access for users who
violate these Terms.

11. Changes
We may update these Terms. Material changes will be surfaced inside the App.
Continued use after a change means you accept the updated Terms.

12. Contact
Questions: contactae2000@gmail.com
`;

export const PRIVACY_POLICY = `Witness R.E.P — Privacy Policy

Last updated: May 2026

Witness R.E.P is built privacy-first. This policy explains what we collect, why,
and what we never do.

1. What we collect
• Account: phone number (and optional email) used to sign in.
• Recordings: stored encrypted on your device. Optionally synced to our
  cloud as encrypted bundles if you enable backup.
• Location: only collected when you opt in (GPS metadata, "Share my
  location", or an active SOS / Live broadcast).
• Diagnostic logs: minimal, anonymous error reports. No content.

2. What we never do
• We do not sell your data.
• We do not run ads.
• We do not train AI models on your recordings, location, or messages.
• We cannot read your encrypted recordings — encryption keys live on your
  device.

3. How recordings are stored
Recordings are encrypted with AES-256-GCM on device using a key derived
from your PIN. Cloud backups upload only the already-encrypted bundle.

4. Location sharing
Your live location is only shared with contacts who have mutually accepted
a sharing invite. You can revoke any share at any time. The setting is off
by default.

5. Public content
Publishing a recording or going live makes that specific content viewable
by anyone with the link. Anonymous Mode strips your device identifier from
published certificates.

6. Trusted contacts
Trusted contacts you add for SOS are stored on your device only. They are
not uploaded to our servers.

7. Retention
• Local data lives on your device until you delete it (Settings → Storage
  → Clear local cache, or Danger Zone → Clear all data).
• Cloud-backed data is deleted when you delete your account.

8. Your rights
You can export, delete, or move your data at any time. Account deletion
wipes both local and cloud data within 30 days.

9. Children
Witness R.E.P is not directed at children under 13.

10. Contact
Privacy questions: contactae2000@gmail.com
`;
