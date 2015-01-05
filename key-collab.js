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

function workerCallback(event) {
//    console.log("handling response from worker");

    var key = event.data;
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

function doWork() {
    /* Fire off the web worker. */
    start = new Date();

    console.log("creating worker");
    var worker = new Worker("worker.js");

    /* Get updates from the worker. */
    worker.addEventListener('message', workerCallback);

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

