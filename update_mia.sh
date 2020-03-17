#!/bin/sh

export FILELIST='
    lib/js/annot/annotorious.css
    lib/js/annot/annotorious.min.js
    lib/js/my/annotext.js
    lib/js/my/avannot.js
    lib/js/my/imgannot.css
    lib/js/my/imgannot.js
    lib/js/mt/webannotorious.js
    parts/kan01.css
    parts/loading-c.gif
    parts/loading.gif
    parts/netref.gif
    parts/simpleg.woff
    parts/std.js
    parts/tri-r.png
    parts/www.png
    works/2016/annot/mushierami.json'

for f in $FILELIST
do
    curl -sRL https://www.kanzaki.com/$f -o $f
done

