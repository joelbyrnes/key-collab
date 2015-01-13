"use strict";

var version = 6;

var words = null;
var workers = null;
var start = null;
var totalKeysTried = 0;

var best = {score: -1, key: "jbexuatfndshgoicwvzqklmpyr"};
var overall = {score: -1};
var name = localStorage.name || "anonymous";
var id = Math.floor(Math.random() * 0xffffff).toString(16);
var lastCpuReport = 0;

/* Report KEY to the server. */
function report(key) {
    $.post('report', JSON.stringify({
        key: key,
        name: name
    }));
}

function getWords() {
    console.log("getting words");
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/6-letter_words_with_no_repeats.txt', false);
    xhr.send();
    if (xhr.status === 200) {
        return xhr.responseText.toString().split('\n');
    } else {
        return [];
    }
}

function getWorkers() {
    return parseInt($('#workers').val());
}

function createParallel(keys, words) {
    workers = getWorkers();

    console.log("creating " + workers + " parallel workers dividing "+ keys.length + " jobs");

    var keylists = [];

    var i,j,temparray,chunk = Math.ceil(keys.length/workers);
    for (i=0,j=keys.length; i<j; i+=chunk) {
        temparray = keys.slice(i,i+chunk);
        keylists.push(temparray);
    }

    var p = new Parallel(keylists, {
        evalPath: '/paralleljs/lib/eval.js', // needed to require a js file
        env: { words: words },
        maxWorkers: workers
    });
    p.require('/key.js');

    if (!start) start = new Date();
    p.map(worker).then(parallelCallback);
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

// TODO very inefficient, find a better way to do 26 choose 2 swap.
function mutatedKeys(keystring) {
    var keys = [];
    for (var i=0; i < 676; i++) {
        keys.push(Key.mutate(keystring, i));
    }
    // should result in 326 unique keys
    return keys.filter(onlyUnique);
}

// this might be better as a reduce function, if we can validly report all keys and counts
function parallelCallback(keylists) {
    //console.log("handling result of parallel map " + keys.length);
    //console.log(keys);

    // flatten
    var keys = Array.prototype.concat.apply([], keylists);
    console.log(keys.length + " keys returned");
    var latestBest = Key.findBestKey(keys);

    console.log("latest best is " + latestBest.key + " with score " + latestBest.score);

    totalKeysTried += keys.length;

    var seconds = (Date.now() - start) / 1000;
    var rate = (totalKeysTried / seconds).toFixed(1);
    var msg = totalKeysTried + ' keys tried (' + rate + ' / sec) over ' + seconds.toFixed(1) + " secs" ;
    console.log(msg);

    // todo spawn parallel?
    var nextkeys = mutatedKeys(latestBest.key);

    runIfNotPaused(nextkeys, words);

    update(latestBest);
}

function update(key) {
    if (key.score > Math.max(overall.score, best.score)) {
        report(key.key);
    }
    if (key.score > best.score) {
        best = key;
        $('#personal-best-key').text(key.key);
        $('#personal-best-score').text(key.score);
    }
    var counter = totalKeysTried;
    var seconds = (Date.now() - start) / 1000;
    key.rate = (counter / seconds).toFixed(1);
    var msg = counter + ' keys tried (' + key.rate + ' / sec) over ' + seconds.toFixed(1) + " secs" ;
    $('#personal-best-count').text(msg);
    $('#current-key').text(key.key);
    $('#current-score').text(key.score);
    $('#current-count').text('key #' + key.count);

    /* Report CPU information to the server. */
    if (lastCpuReport < Date.now() - 10000) {
        var output = {
            id: id,
            rate: key.rate,
            counter: key.counter
        };
        $.post('cpu', JSON.stringify(output), function(global) {
            $('#global-rate').text(global.rate.toFixed(1) + ' keys / sec');
            $('#global-clients').text(global.clients + ' clients');
            if (global.version > version) {
                location.reload(true);
            }
            if (global.message) {
                if ($('#message').html() !== global.message) {
                    $('#message').html(global.message);
                    $('#message').show();
                }
            } else {
                $('#message').hide();
            }
        }, 'json');
        lastCpuReport = Date.now();
    }
}

function runIfNotPaused(nextkeys, words) {
    if (!pause) {
        createParallel(nextkeys, words);
    } else {
        console.log("paused");
        // todo resume fails because keys isn't global
        setTimeout(runIfNotPaused, 500);
    }
}

function worker(keystrings) {
    Key.words = global.env.words;
    var keys = new Array(keystrings.length);
    for (var i=0; i < keystrings.length; i++) {
        var key = new Key(keystrings[i]);
        //console.log("key " + key.key + " has score " + key.score);
        keys[i] = key;
    }
    return keys;
}

function compute() {
    // read words
    words = getWords();
    console.log(words.length + " words");
    Key.words = words;

    // TODO get current best from server

    workers = getWorkers();

    var keys;
    if (best.key) {
        console.log("starting with best key " + best.key);
        keys = mutatedKeys(best.key);
    } else {
        console.log("no existing best key, generating some random ones to start.");
        keys = [Key.random(), Key.random(), Key.random(), Key.random()];
    }
    createParallel(keys, words);

    /* Manage the form. */
    $('form').bind('submit', function() {
        $('#name').blur();
        return false;
    });
    $('#name').bind('change', function() {
        name = $('#name').val();
        localStorage.name = name;
    });
    $('#name').val(name);

    /* Get solution updates from the server. */
    function getUpdate() {
        $.getJSON('/best?score=' + overall.score, function(result) {
            overall.score = result[0];
            overall.key = result[1];
            overall.name = result[2] || "anonymous";
            $('#overall-best-score').text(overall.score);
            $('#overall-best-key').text(overall.key);
            $('#overall-best-name').text(overall.name);
            // TODO recursive?? should use getTimeout
            getUpdate();
        });
    }
    getUpdate();
}

$(document).ready(function() {
    compute();
});