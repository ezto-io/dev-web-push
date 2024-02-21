function eztoverify() {}

function bufferToBase64url(buffer) {
  const byteView = new Uint8Array(buffer);
  let str = "";
  for (const charCode of byteView) {
    str += String.fromCharCode(charCode);
  }

  // Binary string to base64
  const base64String = btoa(str);

  // Base64 to base64url
  // We assume that the base64url string is well-formed.
  const base64urlString = base64String
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return base64urlString;
}

const appendModal = (url, opts) => {
  let lurl = new URL(opts.api);
  // Create a div element
  var div = document.createElement("div");

  // Set the inner HTML of the div to your HTML snippet
  div.innerHTML =
    `
    <div id="ez-modal" class="modal">
    <div class="ez-modal-content">
        <span class="ez-close">&times;</span>
        <iframe id="ez-iframe" allow="camera 'src' ` +
    lurl.origin +
    `; microphone 'src' ` +
    lurl.origin +
    `" src="` +
    url +
    `" frameborder="0"></iframe>
    </div>
    </div>`;

  // Append the div to the body
  document.body.appendChild(div);
  var modal = document.getElementById("ez-modal");

  // Get the <span> element that closes the modal
  var span = document.getElementsByClassName("ez-close")[0];
  span.onclick = function () {
    modal.style.display = "none";
  };

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
};

const showStatus = () => {
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
    newDiv.innerHTML = "<p>Complete the authentication triggered in next<p>";

    // Append the new <div> element to the <body> tag
    document.body.appendChild(newDiv);
  }

  const overlay = document.getElementById("ez-overlay");
  const popup = document.getElementById("ez-popup");
  overlay.style.display = "block";
  popup.style.display = "block";
};

const hideStatus = () => {
  const overlay = document.getElementById("ez-overlay");
  const popup = document.getElementById("ez-popup");
  overlay.style.display = "none";
  popup.style.display = "none";
};

const showModal = (url, opts) => {
  if (!document.getElementById("ez-modal")) {
    appendModal(url, opts);
  } else {
    document.getElementById("ez-iframe").src = url; // Set the URL here
  }
  var modal = document.getElementById("ez-modal");
  modal.style.display = "block";
};

const registerListener = (url) => {
  let lurl = new URL(url);
  window.addEventListener(
    "message",
    function (event) {
      var modal = document.getElementById("ez-iframe");
      if (event.origin === lurl.origin) {
        switch (event.data.action) {
          case "fido":
            fido(modal, event);
            break;
        }
      }
    },
    false
  );

  function fido(modal, event) {
    if (!window.PublicKeyCredential) {
      var message = {
        success: false,
        err: "webauthn-unsupported-browser-text",
      };
      modal.contentWindow.postMessage(message, lurl.origin);
    } else {
      var pubKey = { publicKey: event.data.publicKey };
      if (event.data.type === "create") {
        navigator.credentials
          .create(pubKey)
          .then((result) => {
            const serializeable = {
              authenticatorAttachment: result.authenticatorAttachment,
              id: result.id,
              rawId: bufferToBase64url(result.rawId),
              response: {
                attestationObject: bufferToBase64url(
                  result.response.attestationObject
                ),
                clientDataJSON: bufferToBase64url(
                  result.response.clientDataJSON
                ),
              },
              type: result.type,
            };
            var message = {
              success: true,
              result: serializeable,
            };
            modal.contentWindow.postMessage(message, lurl.origin);
          })
          .catch((err) => {
            var message = {
              success: false,
              err: err,
            };
            modal.contentWindow.postMessage(message, lurl.origin);
          });
      } else {
        navigator.credentials
          .get(pubKey)
          .then((result) => {
            const serializeable = {
              authenticatorAttachment: result.authenticatorAttachment,
              id: result.id,
              rawId: bufferToBase64url(result.rawId),
              response: {
                attestationObject: bufferToBase64url(
                  result.response.attestationObject
                ),
                clientDataJSON: bufferToBase64url(
                  result.response.clientDataJSON
                ),
              },
              type: result.type,
            };
            var message = {
              success: true,
              result: serializeable,
            };
            modal.contentWindow.postMessage(message, lurl.origin);
          })
          .catch((err) => {
            var message = {
              success: false,
              err: err,
            };
            modal.contentWindow.postMessage(message, lurl.origin);
          });
      }
    }
  }
};

const request = async (data, opts, callback) => {
  registerListener(opts.api);
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data), // Convert the data to JSON format
  };
  try {
    // Make the fetch request and wait for the response
    const response = await fetch(opts.api, requestOptions);
    hideStatus();
    // Check if the request was successful (status code 2xx)
    if (!response.ok) {
      callback({
        type: "register",
        success: false,
        reason: `Register Failed: ${response.status}`,
      });
    } else {
      let res = await response.json();
      if (opts.debug) {
        console.log(res);
      }
      showModal(res.url, opts);
      listen(res.trxId, res.pollUrl, opts, callback);
    }
  } catch (error) {
    callback({ type: "register", success: false, reason: `Error: ${error}` });
  }
};

const listen = (chatcode, pollUrl, opts, callback) => {
  let socket = io(pollUrl, { transports: ["websocket"] });
  socket.auth = { chatcode };
  socket.connect();
  socket.on(chatcode, function (event) {
    var modal = document.getElementById("ez-modal");
    modal.style.display = "none";
    callback(event);
  });
  socket.on("connect", function () {
    if (opts.debug) {
      console.log("Connection established, waiting for messages");
    }
  });
};

eztoverify.prototype.request = function (metadata, cnfg, callback) {
  showStatus();
  var trxRequest = {
    metadata: metadata,
  };
  request(trxRequest, cnfg, callback);
};
