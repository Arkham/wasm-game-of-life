#! /usr/bin/env bash

set -euxo pipefail

git checkout deploy
git rebase main
cd www
npm run build
cd ..
git add .
git commit -m "Deploy"
git push -f
git reset --hard HEAD^
git checkout main
