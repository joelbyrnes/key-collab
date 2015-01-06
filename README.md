# Distributed JavaScript computing

 * http://redd.it/178vsz

Each open page consumes one core.

This project is a fork of https://github.com/skeeto/key-collab as discussed in http://nullprogram.com/blog/2013/01/26/

I hope to improve performance and use multiple cores, and possibly explore more generic computation.

Parallel.js included from https://github.com/adambom/parallel.js

## Quick start

These instructions are for Linux. Requires emacs 24. Windows should not be far different.

* clone repo
* pull in dependencies: git submodule update
* ./run-server.sh

You might want to run it under screen: screen -S key-collab ./run-server.sh

## Original author's instructions

You'll need [simple-httpd][simple-httpd] and cache-table.el from
[skewer-mode][skewer-mode]. Then run Emacs in batch mode and visit
http://localhost:8080/ (determined by `httpd-port`).

    emacs -batch -Q -L skewer-mode/ -L simple-httpd/ -l key-collab.el \
          -f key-collab-batch

Notice: Emacs' batch mode is broken in Windows, so you'll need to drop
the first argument when running the server on that platform.


[simple-httpd]: https://github.com/skeeto/emacs-web-server
[skewer-mode]: (https://github.com/skeeto/skewer-mode

It's also worth byte-compiling since a validation check is done in Elisp by the server when a better solution is reported. Uncompiled, the check can take a couple of seconds!

## Basic benchmarks

One tab was opened at a time in each browser on each machine. Each machine has 2-4 cores. One core at a time was 100% utilized.

PC is 4-core i5 3570K at 3.50GHz running Linux Mint, mac is a laptop with Core 2 Duo at 2.4GHz.

initial testing:
* pc chrome = 81/sec
* pc firefox = 141/sec
* mac chrome = 24-25/sec
* mac safari = used CPU but did not produce a result (doesn't support web workers maybe?)
* mac firefox = 110.8/sec
* node.js?

Global rate appears to be accurate, applying only to the last 30 seconds.

Once initial parallelism was achieved, firefox was used to test as it had the best speed previously. Both have version 34. Console logging was commented out for speed improvements.

Serial processing was re-benchmarked as some output changes had been made.

* pc firefox = 82/sec
* mac firefox = 62.5/sec

With parallel processing, all cores are engaged, CPU close to 100% total.

* pc firefox = 82.5/sec; 100.6% of serial
* mac firefox = 92.7/sec; 148% of serial

Quite curious result. Very minor improvement on a 4-core machine while a dual core has significant improvement. In fact, given the cycles/watts for the same result, the pc result can be seen as a loss.
Of course there are a lot of other architectural, operating system and other differences at play here.
In any case, performance can probably be improved by making the algorithm more appropriate for parallel processing.



