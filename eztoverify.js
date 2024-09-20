function eztoverify() {}

var newTab = undefined;

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

const appendIframeModal = (url, opts, callback) => {
  let lurl = new URL(opts.api);
  // Create a div element
  let div = document.createElement("div");

  div.setAttribute("id", "ezto");

  // Set the inner HTML of the div to your HTML snippet
  div.innerHTML =
    `
    <div id="ez-modal" class="modal">
    <div class="ez-modal-content">
        <span id="ez-close" class="ez-close">&times;</span>
        <div id="frameLoader" class="loaderContainer">
          <div id="customMessage" style="display:none;"></div>
          <div class="ez-loader">
          </div>
        </div>
        <iframe id="ez-iframe"  allow="camera 'src'  ` +
    lurl.origin +
    `; geolocation 'src' ` +
    lurl.origin +
    `; microphone 'src' ` +
    lurl.origin +
    `" src="` +
    url +
    `" frameborder="0" style="display:none;"></iframe>
    </div>
    </div>`;

  // Append the div to the body
  document.getElementById("ez-overlay").appendChild(div);
  if (isWebview()) {
    document.getElementById("ez-close").style.display = "none";
  }
  let modal = document.getElementById("ez-modal");
  let ezIframe = document.getElementById("ez-iframe");
  // Get the <span> element that closes the modal
  let span = document.getElementsByClassName("ez-close")[0];
  span.onclick = function () {
    modal.style.display = "none";
    document.getElementById("ezto").style.display = "none";
    document.getElementById("ez-overlay").style.display = "none";
    ezIframe.src = "";
    callback({
      type: "register",
      success: false,
      reason: `Transaction Failed: User aborted the process`,
    });
  };
};

const showStatus = (opts) => {
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
    const loaderContainer = document.createElement("div");
    const loader = document.createElement("div");

    loaderContainer.classList.add("loaderContainer");
    loader.classList.add("ez-loader");

    const customPromptContainer = document.createElement("div");
    customPromptContainer.id = "customMessage";
    customPromptContainer.style.display = "none";
    customPromptContainer.style.wordBreak = "break-word";

    loaderContainer.appendChild(customPromptContainer);
    loaderContainer.appendChild(loader);

    newDiv.appendChild(loaderContainer);

    const overlay = document.getElementById("ez-overlay");
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

const hideLoader = () => {
  setTimeout(() => {
    const overlay = document.getElementById("ez-overlay");
    const popup = document.getElementById("ez-popup");
    if (overlay) overlay.style.display = "none";
    if (popup) popup.style.display = "none";
  }, 500);
};

const showLoader = (opts) => {
  const overlay = document.getElementById("ez-overlay");
  const popup = document.getElementById("ez-popup");
  const customMessage = document.getElementById("customMessage");
  if (customMessage) {
    customMessage.innerText =
      opts.promptMessage !== undefined
        ? ""
        : "A new tab will opened for verification!. It will close automatically once the process is completed. Please check your popup settings if not opened.";
    customMessage.style.wordBreak = "break-word";
    customMessage.style.display = "flex";
  }
  if (overlay) overlay.style.display = "flex";
  if (popup) popup.style.display = "flex";
};

const showModal = (url, opts, callback) => {
  hideStatus();
  if (!document.getElementById("ez-modal")) {
    appendIframeModal(url, opts, callback);
  } else {
    document.getElementById("ez-iframe").style.display = "none";
    document.getElementById("ez-modal").style.display = "flex";
    document.getElementById("ezto").style.display = "flex";
    document.getElementById("ez-iframe").src = url; // Set the URL here
    document.getElementById("frameLoader").style.display = "flex";
  }
  const ezIframe = document.getElementById("ez-iframe");
  ezIframe.onload = function () {
    document.getElementById("frameLoader").style.display = "none";
    document.getElementById("ez-iframe").style.display = "block";
    document.getElementById("ez-modal").style.display = "flex";
  };
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
            registerListener(url);
            break;
          default:
            break;
        }
      }
    },
    { once: true }
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
                signature: bufferToBase64url(result.response.signature),
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

/**
 * Sends a POST request to the specified ezto verify endpoint.
 *
 * @param {Object} data - The data to be sent in the request body.
 * @param {Object} opts - Options for the request.
 * @param {string} opts.api - The API endpoint URL.
 * @param {string} [opts.apiVersion="0"] - The version of the API to use (default is "0").
 * @param {boolean} [opts.debug=false] - If true, logs the response for debugging purposes.
 * @param {Function} callback - A callback function that handles the response.
 *
 * @callback callback
 * @param {Object} result - The result of the request.
 * @param {boolean} result.success - Indicates if the request was successful.
 * @param {string} [result.reason] - The reason for failure, if applicable.
 *
 * @example
 * const userData = { username: "exampleUser", password: "securePassword" };
 * const options = {
 *   api: "https://api.example.com/register",
 *   apiVersion: "1",
 *   debug: true,
 * };
 *
 * const handleResponse = (result) => {
 *   if (result.success) {
 *     console.log("Registration successful!");
 *   } else {
 *     console.error(result.reason);
 *   }
 * };
 *
 * request(userData, options, handleResponse);
 */
const request = async (data, opts, callback) => {
  let supportedVersions = ["0", "1"];
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Version":
        opts.apiVersion != undefined &&
        supportedVersions.includes(opts.apiVersion)
          ? opts.apiVersion
          : 0,
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
      hideLoader();
    } else {
      let res = await response.json();
      if (opts.debug) {
        console.log(res);
      }

      if (res && res.openInNewTab && res.openInNewTab === "false") {
        registerListener(opts.api);
        showModal(res.url, opts, callback);
      } else {
        showLoader(opts);
        setTimeout(() => {
          opts.openInNewTab = true;
          newTab = window.open(res.url, "_blank");
        }, 500);
      }

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
    setTimeout(() => {
      if (opts.openInNewTab !== undefined && opts.openInNewTab) {
        newTab.close();
        document.getElementById("ez-overlay").style.display = "none";
        hideStatus();
        callback(event);
      } else {
        let modal = document.getElementById("ez-modal");
        let eztoDiv = document.getElementById("ezto");
        let iframe = document.getElementById("ez-iframe");
        hideStatus();
        if (iframe) {
          iframe.src = "";
        }
        if (modal) {
          modal.style.display = "none";
        }
        if (eztoDiv) {
          eztoDiv.style.display = "none";
        }
        document.getElementById("ez-overlay").style.display = "none";
        callback(event);
      }
    }, 3500);
  });
  socket.on("connect", function () {
    if (opts.debug) {
      console.log("Connection established, waiting for messages");
    }
  });
};

eztoverify.prototype.request = function (metadata, cnfg, callback) {
  showStatus(cnfg);
  let trxRequest = {
    metadata: metadata,
  };
  request(trxRequest, cnfg, callback);
};

const isWebview = () => {
  if (
    typeof window.flutter_inappwebview != "undefined" ||
    typeof window.ReactNativeWebView != "undefined" ||
    typeof window.webkit != "undefined" ||
    (typeof AndroidInterface != "undefined" &&
      typeof AndroidInterface.messageHandlers != "undefined") ||
    (typeof window != "undefined" &&
      typeof window.chrome != "undefined" &&
      typeof window.chrome.webview != "undefined")
  ) {
    return true;
  }
  return false;
};
