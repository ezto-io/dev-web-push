function eztoverify() { }

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

const appendModal = (url, opts, callback) => {
  let lurl = new URL(opts.api);
  // Create a div element
  let div = document.createElement("div");

  div.setAttribute('id', 'ezto')

  // Set the inner HTML of the div to your HTML snippet
  div.innerHTML =
    `
    <div id="ez-modal" class="modal">
    <div class="ez-modal-content">
        <span class="ez-close">&times;</span>
        <div id="frameLoader" class="loaderContainer">
          <div class="loader">

          </div>
        </div>
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
  let modal = document.getElementById("ez-modal");
  let ezIframe = document.getElementById('ez-iframe');
  // Get the <span> element that closes the modal
  let span = document.getElementsByClassName("ez-close")[0];
  span.onclick = function () {
    modal.style.display = "none";
    document.getElementById('ezto').style.display = "none";
    document.getElementById("ez-overlay").style.display = "none";
    ezIframe.src = "";
    callback({
      type: "register",
      success: false,
      reason: `Transaction Failed: User aborted the process`,
    });
  };
};

const showStatus = () => {
  if (!document.getElementById("ez-overlay")) {
    // Create a new <div> element
    let newDiv = document.createElement("div");

    // Set some attributes for the div (optional)
    newDiv.id = "ez-overlay";

    // Append the new <div> element to the <body> tag
    document.body.appendChild(newDiv);
  }

  if (!document.getElementById("ez-popup")) {
    // Create a new <div> element
    let newDiv = document.createElement("div");

    // Set some attributes for the div (optional)
    newDiv.id = "ez-popup";

    // Creating loader div
    const loaderContainer = document.createElement('div');
    const loader = document.createElement('div');

    loaderContainer.classList.add('loaderContainer')
    loader.classList.add('loader');

    loaderContainer.appendChild(loader);
    newDiv.appendChild(loaderContainer);

    const overlay = document.getElementById('ez-overlay');
    // Append the new <div> element to the <body> tag
    overlay.appendChild(newDiv);
  }

  const overlay = document.getElementById("ez-overlay");
  const popup = document.getElementById("ez-popup");
  overlay.style.display = "flex";
  popup.style.display = "block";
};

const hideStatus = () => {
  const popup = document.getElementById("ez-popup");
  popup.style.display = "none";
};

const showModal = (url, opts, callback) => {
  if (!document.getElementById("ez-modal")) {
    appendModal(url, opts, callback);
  } else {
    document.getElementById("ez-modal").style.display = "flex";
    document.getElementById('ezto').style.display = "flex";
    document.getElementById("ez-iframe").src = url; // Set the URL here
    document.getElementById('frameLoader').style.display = "flex";
  }
  const ezIframe = document.getElementById('ez-iframe');
  ezIframe.onload = function(){
    hideStatus();
    document.getElementById('frameLoader').style.display = "none";
    document.getElementById('ez-iframe').style.display = "block";
    document.getElementById('ez-modal').style.display = "flex";
  }

};

const registerListener = (url) => {
  let lurl = new URL(url);
  window.addEventListener(
    "message",
    function (event) {
      let modal = document.getElementById("ez-iframe");
      if (event.origin === lurl.origin) {
        switch (event.data.action) {
          case "fido":
            fido(modal, event);
            break;
          default:
            break;
        }
      }
    },
    false
  );

  function fido(modal, event) {
    if (!window.PublicKeyCredential) {
      let message = {
        success: false,
        err: "webauthn-unsupported-browser-text",
      };
      modal.contentWindow.postMessage(message, lurl.origin);
    } else {
      let pubKey = { publicKey: event.data.publicKey };
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
            let message = {
              success: true,
              result: serializeable,
            };
            modal.contentWindow.postMessage(message, lurl.origin);
          })
          .catch((err) => {
            let message = {
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
                authenticatorData: bufferToBase64url(
                  result.response.authenticatorData
                ),
                clientDataJSON: bufferToBase64url(
                  result.response.clientDataJSON
                ),
                signature: bufferToBase64url(
                  result.response.signature
                )
              },
              type: result.type,
            };
            let message = {
              success: true,
              result: serializeable,
            };
            modal.contentWindow.postMessage(message, lurl.origin);
          })
          .catch((err) => {
            let message = {
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
      showModal(res.url, opts, callback);
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
    let modal = document.getElementById("ez-modal");
    let eztoDiv = document.getElementById('ezto');
    modal.style.display = "none";
    eztoDiv.style.display = "none";
    document.getElementById('ez-overlay').style.display = "none";
    hideStatus();
    document.getElementById('ez-iframe').src = "";
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
  let trxRequest = {
    metadata: metadata,
  };
  request(trxRequest, cnfg, callback);
};