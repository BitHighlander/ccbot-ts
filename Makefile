SHELL=/bin/bash

env=prod
.DEFAULT_GOAL := build

clean::
	find . -name "node_modules" -type d -prune -print | xargs du -chs && find . -name 'node_modules' -type d -prune -print -exec rm -rf '{}' \; &&\

build::
	sh scripts/build.sh

dev::
	pm2 start process.json --watch && pm2 logs

test::
	echo $(env)

push::
	sh scripts/push-images-$(env).sh

up::
	cd deploy && npm i && node lib/index
