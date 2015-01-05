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


function doWork() {
    // TODO wtf?
    console.log($('#debugdiv').text());
    $('#debugdiv').html("debug");

    /* Fire off the web worker. */
    start = new Date();

    var words = getWords();

    var uniqueWordsChars = uniqueChars(words);
    console.log("all words unique chars len = " + uniqueWordsChars.length + ", " + uniqueWordsChars.sort().join(''));

    // generate 157 keys
    // create parallel over keys
    // spawn worker over it
    // get results to callback

    console.log("spawning parallel worker");

    var keys = new Array(157);
    for (i=0; i< keys.length; i++) {

    }

    var p = new Parallel(words, { evalPath: 'eval.js' });
    p.require('key.js');

    p.spawn(worker).then(workerCallback);

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

