function eztoverify() {
}

const appendTags = (url,opts) => {
    if (opts.showStatus) {
        if (!document.getElementById("ez-overlay")) {
            // Create a new <div> element
            var newDiv = document.createElement("div");

            // Set some attributes for the div (optional)
            newDiv.id = "ez-overlay";

            // Append the new <div> element to the <body> tag
            document.body.appendChild(newDiv);
        }

        if (!document.getElementById("ez-popup")) {
            // Create a new <div> element
            var newDiv = document.createElement("div");

            // Set some attributes for the div (optional)
            newDiv.id = "ez-popup";
            newDiv.innerHTML = '<p>Complete the authentication triggered in next<p>';

            // Append the new <div> element to the <body> tag
            document.body.appendChild(newDiv);
        }

        const overlay = document.getElementById("ez-overlay");
        const popup = document.getElementById("ez-popup");
        overlay.style.display = "block";
        popup.style.display = "block";
        overlay.addEventListener("click", function () {
            overlay.style.display = "none";
            popup.style.display = "none";
        });
    }

    newWin = window.open(url, '_blank');
    if (newWin) {
        newWin.focus();
    }

    return newWin;
}


const request = async (data, opts, callback) => {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data) // Convert the data to JSON format
    };
    try {
        // Make the fetch request and wait for the response
        const response = await fetch(opts.api, requestOptions);

        // Check if the request was successful (status code 2xx)
        if (!response.ok) {
            callback({ type: "register", "success": false, "reason": `Register Failed: ${response.status}` });
        }
        else {
            let res = await response.json();
            if (opts.debug) {
                console.log(res);
            }
            let newWin = appendTags(res.url, opts);
            listen(res.trxId, res.pollUrl, newWin, opts, callback);
        }

    } catch (error) {
        callback({ type: "register", "success": false, "reason": `Error: ${error}` });
    }
}

const listen = (chatcode, pollUrl, newWin, opts, callback) => {

    let socket = io(pollUrl, { transports: ['websocket'] });
    socket.auth = { chatcode };
    socket.connect();
    socket.on(chatcode, function (event) {
        const overlay = document.getElementById("ez-overlay");
        const popup = document.getElementById("ez-popup");
        if (overlay && popup) {
            overlay.remove();
            popup.remove();
        }
        newWin.close();
        callback(event);
    });
    socket.on('connect', function () {
        if (opts.debug) {
            console.log("Connection established, waiting for messages");
        }
    });
}

eztoverify.prototype.request = function (metadata, cnfg, callback) {
    var trxRequest = {
        "metadata": metadata
    }
    request(trxRequest, cnfg, callback);
}