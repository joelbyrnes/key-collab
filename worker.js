"use strict";

importScripts('key.js');

/* Load data */
Key.words = (function() {
    console.log("getting words");
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'words', false);
    xhr.send();
    if (xhr.status === 200) {
        return JSON.parse(xhr.responseText);
    } else {
        return [];
    }
}());

// calls event handler for 'message' on main thread worker
function report(key) {
    self.postMessage({
        key: key.key,
        score: key.score,
        count: key.count,
        counter: Key.counter,
        matches: key.matches
    });
}

function worker() {
    console.log("running worker");

    // generate key
    // mutate and derive next key based on count
    // see if derived key is better and if so use that and reset counter
    // else if mutate value greater than key length (26) generate a new key and reset counter
    // otherwise continue with key

    var key = Key.generate();
    var counter = 0;
    while (true) {
//        console.log("worker iterating");
        // report at arbitrary count of 157 - approx 1 second on author pc?
        if (Key.counter % 157 === 0) report(key);
        counter++;
        var mutate = Math.ceil(Math.pow(counter / 325, 3));
        //console.log("mutate = " + mutate + ", key length = " + key.key.length);
        var next = key.derive(mutate);
        if (next.score > key.score) {
            key = next;
            //console.log("next key better, resetting at counter = " + counter);
            counter = 0;
        } else if (mutate >= key.key.length) {
            key = Key.generate();
            //console.log("mutate too long (" + mutate + "), resetting at counter = " + counter);
            counter = 0;
        } else {
            //console.log("continuing with key");
        }
    }
}

worker();

