# 사이 — Our Conversation

A self-contained, password-protected Korean reading experience for GitHub Pages.

## Publication

Publish the root of the `main` branch with GitHub Pages. `.nojekyll` is included. All runtime assets are hosted with the page; no analytics or third-party scripts are used.

## Privacy

The report payload is encrypted before publication with AES-256-GCM and PBKDF2-SHA-256 (600,000 iterations, random salt and nonce). Decryption happens in the visitor's browser. The password is delivered separately and is never stored in this repository, browser storage, or a URL. Reloading the page removes the unlocked content from the page session.

The original chat archive, attachments, and authoring sources are not part of this repository. The published content contains selected quotations and interpretive analysis, not a full chat export. Scores are subjective editorial assessments.

As with any password-protected document, someone who knows the password can save or share its contents. Keep the password private. Search-engine exclusion is requested via robots directives; those directives are not an access-control mechanism.

## Interface

Seven reports, dated quotations, section navigation, personality comparison, next/previous chapters, link copying, locking, and print-to-PDF styling. Responsive layouts and reduced-motion preferences are supported.

## Font

Noto Serif KR is bundled as a local subset under the SIL Open Font License. See `fonts/OFL.txt`.

Design inspiration: the editorial reading layout of What Brandon Thinks. This is an independent report, with no affiliation or copied report text.
