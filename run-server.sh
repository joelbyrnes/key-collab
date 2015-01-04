# byte-compile files
emacs -batch -Q -f batch-byte-compile lib/skewer-mode/cache-table.el
emacs -batch -Q -f batch-byte-compile lib/simple-httpd/simple-httpd.el
emacs -batch -Q -L lib/skewer-mode/ -L lib/simple-httpd/ -f batch-byte-compile key-collab.el
# run server
emacs -batch -Q -L lib/skewer-mode/ -L lib/simple-httpd/ -l key-collab.el -f key-collab-batch
