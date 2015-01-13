"use strict";

Math.randomN = function(n) {
    return Math.floor(Math.random() * n);
};

Array.prototype.swap = function(i, j) {
    var temp = this[i];
    this[i] = this[j];
    this[j] = temp;
};

Array.prototype.shuffle = function() {
    for (var i = 0; i < this.length; i++) {
        this.swap(i, Math.randomN(i + 1));
    }
    return this;
};

String.prototype.isSorted = function() {
    for (var i = 1; i < this.length; i++) {
        if (this[i - 1].localeCompare(this[i]) > 0) return false;
    }
    return true;
};

function Key(keystring) {
    this.key = keystring;
    this.count = Key.counter++;
    for (var j = 0; j < this.key.length; j++) {
        this[Key.ALPHABET[j]] = this.key[j];
    }
    this.score = 0;
    this.matches = [];
    for (var i = 0; i < Key.words.length; i++) {
        if (this.encode(Key.words[i]).isSorted()) {
            this.score++;
            this.matches.push(Key.words[i]);
        }
    }
}

Key.ALPHABET = "abcdefghijklmnopqrstuvwxyz";
Key.counter = 0;
Key.words = [];

Key.generate = function() {
    return new Key(this.random());
};

Key.random = function() {
    return Key.ALPHABET.split('').shuffle().join('');
};

Key.prototype.deriveRandom = function(n) {
    var base = this.key.split('');
    for (var i = 0; i < n; i++) {
        base.swap(Math.randomN(base.length),
                  Math.randomN(base.length));
    }
    return new Key(base.join(''));
};

Key.mutate = function(str, n) {
    var start = Math.floor(n / 26);
    var idx = (n % 26);

    var base = str.split('');
    base.swap(start, idx);
    return base.join('');
};

Key.prototype.mutate = function(n) {
    return new Key(Key.mutate(this.key, n));
};

Key.prototype.toString = function() {
    return '[Key "' + this.key + '" ' + this.score + ']';
};

Key.prototype.encode = function(word) {
    var output = new Array(word.length);
    for (var i = 0; i < word.length; i++) {
        output[i] = this[word[i]];
    }
    return output.join('');
};

Key.findBestKey = function(keys) {
    var best = keys[0];

    keys.forEach(function(curkey) {
        //console.log("key " + curkey.key + " has score " + curkey.score);
        // the equals means it will select the lastmost best key, otherwise if no solution is better it gets stuck
        // we could also consider all of the keys with the same score
        if (curkey.score >= best.score) best = curkey;
    });

    return best;
};

