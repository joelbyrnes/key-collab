//"use strict";

var fs = require('fs');
//var Parallel = require('paralleljs');
var Parallel = require('paralleljs/lib/parallel.js');

// the npm version of paralleljs has some trouble with global
//eval(fs.readFileSync('paralleljs/lib/parallel.js').toString());
//var Parallel = module.exports;

// import Key functions
var keyjs = fs.readFileSync('key.js').toString();
eval(keyjs);

// read words
var words = fs.readFileSync('6-letter-words.txt').toString().split('\n');
Key.words = words;

//var k = Key.random();
//var kk = new Key(k);
//console.log(kk.key);
//console.log(kk.score);

var keys = [Key.random(), Key.random(), Key.random(), Key.random()];

var p = new Parallel(keys, {
    evalPath: 'paralleljs/lib/eval.js', // needed to require a js file
    env: { words: words }
});
//p.require('key.js');
p.require(keyjs);

console.log("maxWorkers: " + p.options.maxWorkers);

console.log("starting map fn");

p.map(function(keystring) {
    console.log(global.env.words.length + " words");
    Key.words = global.env.words;
    console.log("env: " + global.env);
    console.log("env: " + env);
    var words = global.env.words;
    return new Key(keystring)
}, { env: { words: words } }).then(function(key) {
    console.log("key " + key.key + " has score " + key.score);
});


