<div align="center">

# PASSWORD // FORGE

### Randomness, not guesswork.

**A privacy-first password & passphrase generator with a dash of cyberpunk.**

[**Live app**](https://tools.mandrock.me/password/) · [**Report an issue**](https://github.com/0mandrock1/password-forge/issues) · [**EFF Diceware**](https://www.eff.org/dice)

</div>

---

## What it does

| Feature | Details |
|:--|:--|
| **Random characters** | Length 8–128, lower/uppercase, digits, symbols. Guarantees at least one character from every enabled set. |
| **Memorable passphrases** | 4–12 independent words from a locally bundled list based on the EFF long wordlist. Choose a separator. |
| **Strength meter** | Model-based entropy in bits, qualitative strength and a transparent time-to-guess estimate. |
| **Thoughtful controls** | Exclude similar characters, reveal/mask, copy with one click, keyboard shortcut. |
| **Accessibility** | Labelled controls, keyboard navigation, readable contrast, responsive layout and reduced-motion support. |
| **Privacy by default** | Entirely browser-side. No backend, accounts, cookies, analytics, password history or localStorage. |

## Screenshot-friendly design

Built around **design-mandrock0**: arterial-black reds, ultraviolet accents, terminal typography, soft glitches and crisp layouts. No CSS/JS build chain required.

## Security design

- All random choices use <code>crypto.getRandomValues()</code>, with **rejection sampling** to avoid modulo bias.
- Character-based passwords are sampled **uniformly from strings satisfying the enabled-set constraints**. The implementation rejects any candidate missing a selected set.
- Passphrases sample each word independently. The dictionary has **7,772 unique alphabetic words** drawn from the [EFF long wordlist](https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt). Four hyphenated entries are omitted to keep the hyphen as an unambiguous separator.
- Entropy is derived from the number of possible outputs, not arbitrary rules about capitalization or punctuation. In character mode, exact probability correction for required sets uses inclusion-exclusion. In passphrase mode, entropy is <code>word_count × log₂(7772)</code>.
- Time to guess assumes an **offline attacker trying 10 billion guesses per second**, knowing the generator and its parameters, and averages over half the possibilities. It is a *model*, **not a prediction** of how long any specific real-world attack will take.
- Changing passphrase separators changes readability, **not entropy**; known punctuation contributes no additional security.
- No generated secret is transmitted, persisted or logged. Copying uses the system clipboard, which may retain the value outside this app.
- The deployed Content Security Policy restricts JS to self, requests to self (dictionary), no frames or forms. Two shared CSS-only resources load from the owner's domains.

**Threat-model boundary:** do not mistake an entropy estimate of a cryptographically generated secret for a generic estimator of a human-created password. This tool intentionally does not evaluate manually typed passwords.

## Development

Requirements: current Node.js for tests; modern browser with Web Crypto for app.

~~~sh
git clone https://github.com/0mandrock1/password-forge.git
cd password-forge
python3 -m http.server 8000
# open http://localhost:8000
~~~

~~~sh
npm test
~~~

No runtime npm dependencies. A local web server is needed because the wordlist is fetched from a relative URL.

## Deploy

Serve index.html, style.css, app.js, logic.js and wordlist.txt from a static HTTPS directory. On mandrock.me:

~~~sh
install -d -m 755 /var/www/html/_apps/password
install -m 644 index.html style.css app.js logic.js wordlist.txt /var/www/html/_apps/password/
nginx -t && systemctl reload nginx
~~~

Nginx route: /etc/nginx/snippets/mandrock-tools-apps.conf.

## Credits & licence

Code and original UI: **MIT**, © 2026 [Mandrock](https://mandrock.me).

Wordlist: [Electronic Frontier Foundation long wordlist](https://www.eff.org/dice), published for Diceware-style passphrases. This repository bundles a minimally filtered copy with attribution.

---
<div align="center"><sub>OPEN SOURCE // CLIENT SIDE // ZERO PASSWORD TELEMETRY</sub></div>
