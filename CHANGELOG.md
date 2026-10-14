# Changelog

All notable changes to this project are documented in this file. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A `/status` page says plainly whether the database and the PayPal sandbox keys work (missing, rejected or unreachable), and which build is live.
- Rose links their PayPal once from their own link, then asks for one of three items without sharing a password.
- Sam approves or declines Rose's ask from their own phone. An OK pays from Rose's saved PayPal, and both see the same receipt.
- Rose types what they need in plain words and sees up to three real listings, each explained: what it is, why it fits, and one thing to watch for.
- Sam sets a price limit for what Rose is shown, and sees why a pick fits and a link to the real listing before paying.
- Sam gets a notification when Rose asks for something, even with the page closed, once they turn notifications on from their link.
- Rose gets a notification when Sam says OK or no, or when the payment doesn't go through.
- On iPhone, Rose's or Sam's link can be added to the Home Screen as KinCart, and opens their own page.
- Rose can ask for up to five things at once and pick a listing for each, and Sam answers them all with one OK and one payment.
- Sam can untick anything Rose asked for before paying, and what Sam leaves out goes back in Rose's box for the next ask.
- Sam can set a total limit for everything Rose asks for at once, or leave it empty for none.
- When Rose's picks come to more than Sam's total limit, Rose sees the total and leaves something out before anything reaches Sam.
- Anyone who opens the site can tap Try KinCart and get their own Rose and Sam, with a sandbox PayPal already linked, and never sees anyone else's asks, limits or phones.
- The same browser comes back to its own Rose and Sam, and Start a new one gives a fresh pair while the old links keep working.
- On a laptop, after Try KinCart, your Rose and Sam run side by side on the home page, so you see Sam's page change within seconds of Rose's ask.

### Changed

- The site's front page now says what KinCart is and starts your own Rose and Sam, with the status page one link away.
- The home page now speaks to the helper who would use KinCart: how it works in three steps, how they stay in charge, and on a laptop two sample phones before they try it.
- The status page is now KinCart status, in the home page's violet look.

### Fixed

- After tapping Ask Sam with nothing picked, Rose sees "Pick at least one first." at the top of the page without scrolling.
