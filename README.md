# 사이 — Our Conversation

A self-contained, password-protected Korean reading experience for GitHub Pages.

## Publication

Publish the root of the `main` branch with GitHub Pages. `.nojekyll` is included. All runtime assets are hosted with the page; no analytics or third-party scripts are used.

## Privacy

The report payload is encrypted before publication with AES-256-GCM and PBKDF2-SHA-256 (600,000 iterations, random salt and nonce). Decryption happens in the visitor's browser. A dedicated reading link contains the access key in its URL fragment. Anyone holding that complete link can read the report without entering a password. The fragment is processed in the browser and is not sent in HTTP requests to GitHub Pages. The access key is not committed to this repository or stored in browser storage; it can appear in browser history and copied links. The lock button removes the key from the current URL.

The original chat archive, attachments, and authoring sources are not part of this repository. The published content contains selected quotations and interpretive analysis, not a full chat export. Relationship observations are contextual interpretations. Literal phrase counts are distinguished from semantic apology or gratitude acts. Marriage considerations describe concrete behaviors without numeric compatibility scores.

As with any password-protected document, someone who knows the password can save or share its contents. Share the complete reading link only with intended readers. Search-engine exclusion is requested via robots directives; those directives are not an access-control mechanism.

## Interface

Eight reports, dated quotations, section navigation, qualitative personality comparison, gratitude counts with a method disclosure, next/previous chapters, link copying, locking, and print-to-PDF styling. Responsive layouts and reduced-motion preferences are supported.

## Font

Noto Serif KR is bundled as a local subset under the SIL Open Font License. See `fonts/OFL.txt`.

Design inspiration: the editorial reading layout of What Brandon Thinks. This is an independent report, with no affiliation or copied report text.
