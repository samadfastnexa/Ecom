#!/usr/bin/env bash
#
# Sync the monorepo's top-level folders with their isolated mirror repos.
# The monorepo is the source of truth; each folder is published to a mirror
# repo that one contractor works in (and only sees).
#
#   backend/    <-> m-backend  (github: ecom-backend)
#   web/        <-> m-web      (github: ecom-web)
#   mobile-app/ <-> m-mobile   (github: ecom-mobile)
#
# Usage:
#   bash scripts/mirror.sh pull mobile|web|backend|all   # bring contractor changes IN
#   bash scripts/mirror.sh push mobile|web|backend|all   # send monorepo changes OUT
#
# GOLDEN RULE: always PULL before PUSH for an area, to avoid divergence.
#
# One-time setup (after creating the three private GitHub repos):
#   git remote add m-backend https://github.com/samadfastnexa/ecom-backend.git
#   git remote add m-web     https://github.com/samadfastnexa/ecom-web.git
#   git remote add m-mobile  https://github.com/samadfastnexa/ecom-mobile.git
#   bash scripts/mirror.sh push all        # seed the mirrors

set -euo pipefail

# area -> folder prefix
prefix_for() { case "$1" in backend) echo backend;; web) echo web;; mobile) echo mobile-app;; *) return 1;; esac; }
# area -> git remote name
remote_for() { case "$1" in backend) echo m-backend;; web) echo m-web;; mobile) echo m-mobile;; *) return 1;; esac; }

BRANCH=main

usage() { echo "Usage: $0 {pull|push} {backend|web|mobile|all}" >&2; exit 1; }

[ $# -eq 2 ] || usage
ACTION=$1; AREA=$2
case "$ACTION" in pull|push) ;; *) usage ;; esac

if [ "$AREA" = "all" ]; then
  AREAS="backend web mobile"
elif prefix_for "$AREA" >/dev/null 2>&1; then
  AREAS="$AREA"
else
  usage
fi

for a in $AREAS; do
  prefix=$(prefix_for "$a")
  remote=$(remote_for "$a")
  echo "── ${ACTION} ${a}  (prefix=${prefix}  remote=${remote}) ──"
  if [ "$ACTION" = "pull" ]; then
    git subtree pull --prefix="$prefix" "$remote" "$BRANCH" -m "sync ${a} from mirror (${remote})"
  else
    git subtree push --prefix="$prefix" "$remote" "$BRANCH"
  fi
done

echo "✅ ${ACTION} ${AREA} complete."
