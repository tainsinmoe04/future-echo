# Release notes — 2026-11-11

## Scope

Owner-authorized Home refresh and release of the existing account-isolation,
authentication presentation and journal attachment corrections. No provider,
credentials, database migration, retention window or payment changes.

## Visual behavior

Home supports English and Myanmar. Keep the existing text composition, black
canvas and white standalone Across mark. The opening mark fades into Home.
The sky contains 280 non-repeating gradient stars plus sparse bright points;
size, location and opacity vary. Separate layers softly change brightness and
the field rotates slowly rather than translating as a repeated wallpaper tile.
Reduced-motion preferences stop decorative animation. These are decorative stars,
not saved-memory counts, progress or a scientific astronomy simulation.

The hero reserves the first viewport (header excluded), including 425x800.
Desktop below-fold conversation and memory introduction use separate columns.
No journal artwork, user record or AI consent is changed by these styles.

## Account and editor corrections

Verified-owner journal scoping and cross-tab account-change handling prevent
one signed-in account from inheriting another account's local book. Legacy
unowned records are preserved, not deleted or automatically claimed.
Confirmation-required signup is not presented as an invalid active session.
The chat paperclip selects a photo instead of opening journal template content.

## Verification and limitations

Earlier isolated browser checks covered account A/B switching, Home layouts and
the paperclip. The latest starfield has not yet undergone rendered performance
or physical-phone/Safari verification. Do not treat build success as that proof.
Hosted email delivery/password login and real two-account testing remain separate
from intercepted browser tests. Existing local-storage loss risks remain.

## Maintenance

Run npm test, npm run lint, npm run test:security and npm run build before release.
Never commit .env files, browser sessions, private attachments or generated test
reports. GitHub is the code backup, not a backup of users' browser journals.
Vercel production must use the existing future-echo project and configured secrets.
