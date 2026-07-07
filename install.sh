#!/usr/bin/env bash
#
# Kirigami installer.
#
# Verifies Node.js, installs dependencies, compiles the TypeScript, and
# registers the global `kirigami` command via `npm link`. On a link
# permission failure it prints guidance instead of dying silently.
#
# Created by Akram Almnajed — github.com/AkramAlmnajed

set -euo pipefail

MIN_NODE_MAJOR=18

# --- tiny color helpers (fall back to plain text if not a TTY) -------------
if [ -t 1 ]; then
  GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'
else
  GREEN=''; CYAN=''; RED=''; YELLOW=''; BOLD=''; RESET=''
fi
info()  { printf "${CYAN}▸ %s${RESET}\n" "$1"; }
ok()    { printf "${GREEN}✔ %s${RESET}\n" "$1"; }
warn()  { printf "${YELLOW}! %s${RESET}\n" "$1"; }
err()   { printf "${RED}✖ %s${RESET}\n" "$1" 1>&2; }

# Run from the script's own directory regardless of where it was invoked.
cd "$(dirname "$0")"

printf "${BOLD}${GREEN}Installing Kirigami…${RESET}\n\n"

# --- 1. Node present? ------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  err "Node.js is not installed."
  echo "  Install Node.js 18 or newer from https://nodejs.org (20 LTS recommended)."
  exit 1
fi

# --- 2. Node version sufficient? -------------------------------------------
NODE_VERSION="$(node -v)"                       # e.g. v20.11.1
NODE_MAJOR="$(echo "$NODE_VERSION" | sed 's/^v//' | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  err "Node.js $NODE_VERSION is too old (need >= v${MIN_NODE_MAJOR})."
  echo "  Upgrade Node, e.g. with nvm:  nvm install 20 && nvm use 20"
  exit 1
fi
ok "Node.js $NODE_VERSION detected."

# --- 3. npm present? -------------------------------------------------------
if ! command -v npm >/dev/null 2>&1; then
  err "npm is not installed (it normally ships with Node.js)."
  exit 1
fi

# --- 4. install dependencies ----------------------------------------------
info "Installing dependencies (npm install)…"
npm install
ok "Dependencies installed."

# --- 5. build --------------------------------------------------------------
info "Compiling TypeScript (npm run build)…"
npm run build
ok "Build complete."

# --- 6. link global command -----------------------------------------------
info "Registering the global 'kirigami' command (npm link)…"
if npm link; then
  ok "Global command registered."
else
  err "'npm link' failed — this is almost always a permissions issue with npm's global prefix."
  echo ""
  warn "Recommended fixes (in order of preference):"
  echo "  1. Use a Node version manager so the global prefix is owned by you (no sudo):"
  echo "        - nvm:  https://github.com/nvm-sh/nvm"
  echo "        - fnm:  https://github.com/Schniz/fnm"
  echo "     Then re-run ./install.sh."
  echo ""
  echo "  2. Point npm at a user-owned global prefix:"
  echo "        npm config set prefix \"\$HOME/.npm-global\""
  echo "        export PATH=\"\$HOME/.npm-global/bin:\$PATH\"   # add to your ~/.zshrc"
  echo "     Then re-run ./install.sh."
  echo ""
  echo "  3. Last resort (discouraged — sudo-installing global npm packages can cause"
  echo "     permission problems later):"
  echo "        sudo npm link"
  echo ""
  err "Installation did not complete. Fix the above and re-run ./install.sh."
  exit 1
fi

# --- done ------------------------------------------------------------------
echo ""
printf "${BOLD}${GREEN}✔ Kirigami is installed.${RESET}\n"
printf "  Run ${CYAN}kirigami${RESET} from anywhere to start.\n\n"
printf "  Created by Akram Almnajed — ${CYAN}github.com/AkramAlmnajed${RESET}\n"
