SHELL=/bin/bash

env=prod
.DEFAULT_GOAL := build

clean:
	find . -name "node_modules" -type d -prune -print | xargs du -chs && find . -name 'node_modules' -type d -prune -print -exec rm -rf '{}' \;

build:
	echo "lol"

dev:
	pm2 start process.json --watch && pm2 logs

test:
	echo $(env)

push:
	cd services/ccbot && npm i && npm run docker:push:all && cd ../..
	cd services/discord-bridge && npm i && npm run docker:push:all && cd ../..

up:
	cd deploy && npm i && node lib/index