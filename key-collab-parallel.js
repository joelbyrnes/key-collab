var version = 6;

var best = {score: -1};
var overall = {score: -1};
var name = localStorage.name || "anonymous";
var id = Math.floor(Math.random() * 0xffffff).toString(16);

/* Report KEY to the server. */
function report(key) {
    $.post('report', JSON.stringify({
        key: key,
        name: name
    }));
}

var start = null;
var lastCpuReport = 0;

/* Load data */
function getWords() {
    console.log("getting words");
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'words', false);
    xhr.send();
    if (xhr.status === 200) {
        return JSON.parse(xhr.responseText);
    } else {
        return [];
    }
}

Array.prototype.getUnique = function(){
    var u = {}, a = [];
    for(var i = 0, l = this.length; i < l; ++i){
        if(u.hasOwnProperty(this[i])) {
            continue;
        }
        a.push(this[i]);
        u[this[i]] = 1;
    }
    return a;
};

function uniqueChars(words) {
    return words.join('').split('').getUnique();
}

function parallelCallback(keys) {
    console.log("handling result of parallel map");
    console.log(keys);

    // handle all jobs
    // create new jobs with key from last job
    // produce these values:
//        key: key.key,
//        score: key.score,
//        count: key.count,
//        counter: Key.counter,
//        matches: key.matches

    var key = {
        key: null,
        score: -1,
        count: 0,
        counter: 0,
        matches: []
    };

    var bestkey = keys[0];
    keys.forEach(function(curkey) {
        console.log("key " + curkey.key + " has score " + curkey.score + ", count " + curkey.count + ", counter " + curkey.counter);
        // TODO find best
        key['count'] = key['count'] + curkey.count;
        key['counter'] = key['counter'] + curkey.counter;

        if (curkey.score > bestkey.score) bestkey = curkey;
    });

    key['key'] = bestkey.key;
    key['score'] = bestkey.score;
    key['matches'] = bestkey.matches;

    workerCallback(key);
}

function workerCallback(data) {
    console.log("handling response from worker");
    console.log(data);

    var key = data;
    if (key.score > Math.max(overall.score, best.score)) {
        report(key.key);
    }
    if (key.score > best.score) {
        best = key;
        $('#personal-best-key').text(key.key);
        $('#personal-best-score').text(key.score);
    }
    var counter = key.counter;
    key.rate = (counter / ((Date.now() - start) / 1000)).toFixed(1);
    var msg = counter + ' keys tried (' + key.rate + ' / sec)';
    $('#personal-best-count').text(msg);
    $('#current-key').text(key.key);
    $('#current-score').text(key.score);
    $('#current-count').text('key #' + key.count);

    $('#matches').html(key.matches.join("<br/>"));

    var uniqueWordsChars = uniqueChars(key.matches);
    console.log("matches unique chars len = " + uniqueWordsChars.length + ", " + uniqueWordsChars.sort().join(''));

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

function worker(words) {    // should be keys
    // how to get words? env?
    Key.words = words;

    console.log("running worker main");
    var key = Key.generate();
    var counter = 0;

    // TODO loop limit
    while (true) {
        console.log("worker iterating");
        counter++;

        var mutate = Math.ceil(Math.pow(counter / 325, 3));
        var next = key.derive(mutate);
        if (next.score > key.score) {
            key = next;
            counter = 0;
        } else if (mutate >= key.key.length) {
            key = Key.generate();
            counter = 0;
        }

        // report at arbitrary count of 157 - approx 1 second, prime
        if (Key.counter % 157 === 0) break;
    }

    return {
        key: key.key,
        score: key.score,
        count: key.count,
        counter: Key.counter,
        matches: key.matches
    };
}

function parallelWorker(counter) {
    Key.words = global.env.words;
    var key = global.env.key;

    console.log("running parallelWorker");

    // generate if null ie first run
    if (key == null) key = Key.generate();

    var mutate = Math.ceil(Math.pow(counter / 325, 3));
    //console.log("mutate = " + mutate + ", key length = " + key.key.length);

    var next = key.derive(mutate);
    var nextKey = null;

    if (next.score > key.score) {
        console.log("next key better, resetting at counter = " + counter);
        nextKey = next.key;
        counter = 0;
    } else if (mutate >= key.key.length) {
        console.log("mutate too long (" + mutate + "), resetting at counter = " + counter);
        nextKey = null;
        counter = 0;
    } else {
        // keep same key for next mutation
        console.log("continuing with key");
        nextKey = key.key
    }

    // return key results, plus key to use next
    return {
        key: key.key,
        score: key.score,
        count: key.count,
        counter: Key.counter,
        matches: key.matches,
        nextKey: nextKey
    };
}

function reducefn(d) {
//    return d[0] + d[1];
    return {
        key: key.key,
        score: key.score,
        count: key.count,
        counter: Key.counter,
        matches: key.matches,
        nextKey: nextKey
    };
}

function doWork() {
    // TODO wtf?
    console.log($('#debugdiv').text());
    $('#debugdiv').html("debug");

    start = new Date();

    var words = getWords();

    var uniqueWordsChars = uniqueChars(words);
    console.log("all words unique chars len = " + uniqueWordsChars.length + ", " + uniqueWordsChars.sort().join(''));

    // generate 157 jobs
    // run parallel map
    // get results to callback
    // run again... ?

    console.log("generating jobs");

    var jobs = new Array(4);
    for (var i=0; i % 4 !== 0; i++) {
        jobs[i] = 0;
    }

    console.log("creating parallel with "+ jobs.length + " jobs");

    var p = new Parallel(jobs, {
        evalPath: 'eval.js', // needed to require a js file
        env: { key: null, words: words }
    });
    p.require('key.js');

    console.log("running parallel map");

    p.map(parallelWorker).then(parallelCallback);

//    console.log("creating worker");
//    var worker = new Worker("worker.js");

//    /* Get updates from the worker. */
//    worker.addEventListener('message', workerCallback);

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

doWork();

