#!/bin/bash

docker run --rm -i -v $(pwd)/lib/js/osd:/osd node /bin/bash -s <<EOS
set -ex
git clone https://github.com/openseadragon/openseadragon.git
cd openseadragon
git checkout v2.4.0
rm -rf node_modules package-lock.json
npm install
npm run-script prepare
cp -pr build/openseadragon/* /osd/
EOS

