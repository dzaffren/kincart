# Changelog

All notable changes to this project are documented in this file. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Each network address can run 20 Finds and start 5 new Roses and Sams in any 24 hours. Past that, nothing reaches Claude or Channel3, the page says how long to wait, and Rose's words stay in the box.
- `/status` shows how many Finds and Channel3 searches ran today and this month, and how many Finds and Try KinCarts the daily limits stopped. The month's searches read "N of 1,000", in red from 800.
- Rose's PayPal activity lists each thing Sam paid for, with its price, where it used to show one line such as "2 things".
- Rose's and Sam's receipts say the money went to KinCart's sandbox shop, and that no order reaches the shops in this demo.
- Find shows Rose only listings that are the thing asked for. The AI checks each listing's photo as well as its words, so a storage bin sold as "AA Batteries", a lone cable for a charger or a case for a tablet no longer shows.
- The home page backs "No more logging in as them" with a 2025 survey of 657 US adults, linked at its source: about 1 in 10 had signed in to someone else's money or medical account with that person's login.
- The home page's How it works says your parent can send a photo of the thing or of a written list.
- After a Find that comes back empty, a No from Sam, or a thing Sam left out, Rose taps Find another, and KinCart searches again with other words, without the listings Sam said no to. Each Find another counts as one of the day's 20 Finds.
- Rose's page lists the 3 newest things Sam paid for under Bought before. Ask again looks for the same things at today's prices, puts the one Rose bought last time first and picked, and says if its price or shop changed. Each Ask again counts as one of the day's 20 Finds.
- When nothing fits under Sam's price limit, Rose sees up to 3 listings that cost more, cheapest first and never above double the limit. Each says how far over the limit it is, and Sam's page says so too before Sam taps OK, for one thing or one thing in a basket.
- No other site can show a KinCart page inside a frame, so nobody can hide Sam's OK under a button of their own. Shops' image hosts no longer learn which KinCart page asked for a photo.
- After Sam says no, or leaves a thing out, Sam can tap Find another on Sam's own page. KinCart searches again with other words for Rose, Rose's page says Sam asked, and Rose's phone buzzes with the result. A Find Rose starts meanwhile is kept. Each tap counts as one of the day's 20 Finds, and Rose or Sam gets one between them.
- Sam can replace both of a household's secret links with Make new links, after a confirm screen. The old links stop working at once, Sam's page gives Rose's new link to share or copy, and the saved PayPal, limits and past buys stay. Saved phones are forgotten, so Rose and Sam turn notifications on again from the new links.
- Sam can turn on Confirm each OK on Sam's own page. Each OK, Make new links and Turn off then asks for Sam's face or fingerprint, so someone with only Sam's link can't pay or replace the links. It is off by default, and inside the home page's phones an OK opens Sam's page in a new tab.

### Fixed

- A Find no longer shows "Couldn't find that" when the AI takes more than 10 seconds to check the listings' photos. It now waits up to 15 seconds, so a slow check still shows Rose the listings.

## [1.2.0] - 2026-10-16

### Added

- Rose links a sandbox PayPal on PayPal's own page, with a demo login shown on Rose's first screen. On a laptop, PayPal opens in a new tab from Rose's phone.
- Rose can take or pick a photo of what they need, such as an old battery or a handwritten list, with or without words, and Find searches for what it shows. The photo itself is not kept.
- Rose can send up to 5 photos in one Find, such as an old battery and a handwritten list, and gets one basket with a group for each thing. If a photo shows nothing to buy, a note says so and the other things still show.

### Changed

- A new Rose starts with no PayPal linked. Skip pays from the demo PayPal, as every new Rose did before.
- PayPal's approval page names KinCart, not Shop-together.

## [1.1.0] - 2026-10-15

### Added

- Before Sam says OK, Sam sees each thing's photo and its "Good to know" note, such as batteries that aren't included.

### Changed

- Rose's and Sam's pages show the KinCart name and mark at the top, also inside the home page's phones.
- Listing photos are twice as big, on Rose's results and on Sam's page.

### Fixed

- On a phone, the home page's full stop after "what comes next" no longer wraps onto a line of its own.

## [1.0.0] - 2026-10-15

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

[unreleased]: https://github.com/dzaffren/kincart/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/dzaffren/kincart/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/dzaffren/kincart/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/dzaffren/kincart/releases/tag/v1.0.0
