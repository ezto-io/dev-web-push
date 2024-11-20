const version = "3.0.0";
console.log("ezto.js version ", version);

const messageChannel = new MessageChannel();

var isFlutterInAppWebViewReady = false;
window.addEventListener("flutterInAppWebViewPlatformReady", function (event) {
    console.log("setting flutterInAppWebViewPlatformReady to true");
    isFlutterInAppWebViewReady = true;
});
console.log("platform", getPlatform());

async function waitForWebviewToBeReady() {
    let platform = getPlatform();
    console.log("platform", platform);
    if (platform == "flutter") {
        console.log("waitForFlutterInAppWebViewPlatformReady called");
        return new Promise(resolve => {
            const checkCondition = () => {
                if (isFlutterInAppWebViewReady) {
                    console.log("Webview is ready");
                    resolve(true);
                } else {
                    setTimeout(checkCondition, 100); // Check again after 100 milliseconds
                }
            };

            checkCondition();
        });
    } else {
        return true;
    }

}

// setTimeout(() => {
//     console.log("dispatching custom event");
//     var event = new CustomEvent("flutterInAppWebViewPlatformReady");
//     var result = window.dispatchEvent(event);
//     console.log("result is ",result);
// }, 5000);


function getPlatform() {
    var platform;
    if ((typeof window.flutter_inappwebview) != "undefined") {
        platform = "flutter";
    } else if ((typeof window.ReactNativeWebView) != 'undefined') {
        platform = "react_native"
    } else if ((typeof window.webkit) != "undefined") {
        platform = "ios_native"
    } else if (((typeof AndroidInterface) != "undefined") && (typeof AndroidInterface.messageHandlers) != "undefined") {
        platform = "android_native"
    } else if (typeof window != "undefined" && typeof window.chrome != "undefined" && typeof window.chrome.webview != "undefined") {
        platform = "flutter_windows"
    } else {
        platform = "other"
    }
    return platform;
}

function callHandler(handlerName, params) {
    let platform = getPlatform();
    console.log(platform)
    if (platform == "flutter") {
        window.flutter_inappwebview.callHandler(handlerName, params);
    } else if (platform == "ios_native") {
        window.webkit.messageHandlers[handlerName].postMessage(params);
    } else if (platform == "android_native") {
        AndroidInterface.messageHandlers(handlerName, params);
    } else if (platform == 'react_native') {
        window.ReactNativeWebView.postMessage(JSON.stringify({ "name": handlerName, "params": params }));
    } else if (platform == "flutter_windows") {
        window.chrome.webview.postMessage(JSON.stringify({ "name": handlerName, "params": params }));
    } else {
        //Using default javascript message channel
        messageChannel.port1.postMessage(JSON.stringify({ "name": handlerName, "params": params }));
    }
}

//iOS doesn't support awaitable post message, so we use callbacks and resultHandlers to track the promises
var resultHandlers = {};

function iosCallback(handlerName, data) {
    console.log("iosCallback called", handlerName);
    console.log(JSON.stringify(data));
    resultHandlers[handlerName].resolve(data);
}

function asyncCallback(handlerName, data) {
    console.log("asyncCallback called", handlerName);
    console.log(JSON.stringify(data));
    resultHandlers[handlerName].resolve(data);
}

messageChannel.port1.onmessage = function (e) {
    console.log("messageChannel called", e);
    handlerName = JSON.parse(e.data).name
    params = JSON.parse(e.data).params
    resultHandlers[handlerName].resolve(params);
}

async function callHandlerWithResult(handlerName, params) {
    let platform = getPlatform();
    console.log(platform);
    if (platform == "flutter") {
        let result = await window.flutter_inappwebview.callHandler(handlerName, params);
        console.log(JSON.stringify(result));
        return result;
    } else if (platform == "ios_native") {
        return new Promise((resolve, reject) => {
            resultHandlers[handlerName] = { resolve, reject };
            window.webkit.messageHandlers[handlerName].postMessage(params);
        });
    } else if (platform == "android_native") {
        if ((typeof AndroidInterface.messageHandlersAsync) != "undefined") {
            return new Promise((resolve, reject) => {
                resultHandlers[handlerName] = { resolve, reject };
                AndroidInterface.messageHandlersAsync(handlerName, JSON.stringify(params));
            });
        } else {
            //For backward compatability
            //@deprecated
            let result = await AndroidInterface.messageHandlersWithResult(handlerName, JSON.stringify(params));
            return JSON.parse(result);
        }

    } else if (platform == 'react_native') {
        return new Promise((resolve, reject) => {
            resultHandlers[handlerName] = { resolve, reject };
            window.ReactNativeWebView.postMessage(JSON.stringify({ "name": handlerName, "params": params }));
        });
    } else if (platform == 'flutter_windows') {
        return new Promise((resolve, reject) => {
            window.chrome.webview.postMessage(JSON.stringify({ "name": handlerName, "params": params }));
            const messageListener = function (e) {
                window.chrome.webview.removeEventListener('message', messageListener);
                console.log(e);
                resolve(e.data);
            }
            window.chrome.webview.addEventListener('message', messageListener);
        });
    } else {
        return new Promise((resolve, reject) => {
            resultHandlers[handlerName] = { resolve, reject };
            messageChannel.port1.postMessage(JSON.stringify({ "name": handlerName, "params": params }));
        });
    }
}

async function isEventSupported(eventName) {
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('isEventSupported');
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

/**
 * @function registerIproov
 * @returns {registerIproovResponse} - An object containing the result of the operation.
 * 
 * @typedef {registerIproovResponse}
 * @property {boolean} success 
 * @property {string} message - "Message if any"
 * @param {DeviceInfo} device
 * @param {string} error - "Error message if any"
 * 
 * @typedef {Object} DeviceInfo
 * @property {string} model - eg: "oneplus 8t"
 * @property {boolean} isPhysicalDevice - returns whether the device is real
 * @property {string} osVersion - eg: "android 8"
 * @property {string} id - device id
 * @property {string} platform - platform
 */
async function registerIproov(streamingUrl, token) {
    console.log("registerIproov");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('registerIproov', { 'streamingUrl': streamingUrl, 'token': token });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}


/**
 * @function verifyIproov
 * @returns {verifyIproovResponse} - An object containing the result of the operation.
 * 
 * @typedef {verifyIproovResponse}
 * @property {boolean} success 
 * @property {string} message - "Message if any"
 * @param {DeviceInfo} device
 * @param {string} error - "Error message if any"
 * 
 * @typedef {Object} DeviceInfo
 * @property {string} model - eg: "oneplus 8t"
 * @property {boolean} isPhysicalDevice - returns whether the device is real
 * @property {string} osVersion - eg: "android 8"
 * @property {string} id - device id
 * @property {string} platform - platform
 */
async function verifyIproov(streamingUrl, token) {
    console.log("verifyIproov");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('verifyIproov', { 'streamingUrl': streamingUrl, 'token': token });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}


/**
 * @function registerSilentBinding
 * @param {string} remotePublicKey - RSA key
 * @returns {SilentBindingResponse} - An object containing the result of the operation.
 * 
 * @typedef {Object} SilentBindingResponse
 * @property {boolean} success - Indicates whether the operation was successful.
 * @property {string} message - A descriptive message, typically used to convey an error message if success is false.
 * @property {string} encryptedDeviceId - Base64 encoded
 */

async function registerSilentBinding(remotePublicKey) {
    console.log("registerSilentBinding called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('registerSilentBinding', { 'remotePublicKey': remotePublicKey });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

/**
 * @function verifySilentBinding
 * @param {string} challenge - random 32 bytes converted to base64
 * @returns {SilentBindingResponse} - An object containing the result of the operation.
 * 
 * @typedef {Object} VerifySilentBindingResponse
 * @property {boolean} success - Indicates whether the operation was successful.
 * @property {string} message - A descriptive message, typically used to convey an error message if success is false.
 * @property {string} challengeHash - Hashed challenge base64
 * @property {string} keyHashFirst6 - First 6 characters of hashed key sha256 base64
 */
async function verifySilentBinding(challenge) {
    console.log("verifySilentBinding called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('verifySilentBinding', { 'challenge': challenge });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

/**
 * Checks whether to use native fido implementation or javascript webview implementation
 * @returns bool
 */
async function isJsFidoSupported() {
    console.log("isJsFidoSupported called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('isJsFidoSupported');
        if (result == null) {
            //For backward comptability, return default value
            //Added on v1.0.7
            return {
                "success": false,
                "message": "The App may be using an older version of SDK. Please update",
                "isSupported": false,
                "device": {},
            }
        }
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

/**
 * @returns {object} returns the fcm token of device or empty if not available
 * @example
 * await getFcmToken()
 * result = {"pushToken":"crp0P9SbSxC0TSXXE92QMa:APA91bFKGYEepvvBtoKDWkcusZE7OvWQ4GUbaJT9T8bt7kNtHeIvDv9B1KDE2g5ThK1OLK8fEnaPE6MiFumDTCSLB5HHwglm3dGcMcj6bUbclEaOD-8DTfXBQlkgypK-b_Fe617EXewc","device":{"model":"OnePlus KB2001","isPhysicalDevice":true,"osVersion":"33","id":"5b497423-0279-4f7f-b2f6-bf665ddbcfc5","platform":"Android"}}
 */
async function getFcmToken() {
    console.log("getFcmToken called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('getFcmToken');
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

async function success() {
    console.log("success called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        callHandler("success");
    } else {
        throw new Error('Webview not ready');
    }
}

async function failure(message) {
    console.log("failure called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        callHandler("failure", { 'message': message });
    } else {
        throw new Error('Webview not ready');
    }
}


/*
returns
{
    "registered": bool,
    "credentialIds": [credentials_ids],
}
*/
async function checkBiometric() {
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('checkBiometric');
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

//Public key as base64 string
/* 
returns
{
    "success": bool,
    "message": string error message if any,
}
*/
async function registerBiometric(publicKey, credentialId) {
    console.log("registerBiometric");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('registerBiometric', { 'publicKey': publicKey, 'credentialId': credentialId });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

//challenge as base64
/* 
returns
{
    "success": bool,
    "message": string error message if any,
    "encryptedChallenge": string base64 encoded encrypted challenge,
    "credentialId": string
}
*/
async function verifyBiometric(challenge) {
    console.log("verifyBiometric");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('verifyBiometric', { 'challenge': challenge });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}


/*
returns
{
    "success": bool,
    "message": string error message if any,
    "msisdn": string phone number,
    "regTransactionId": string,
    "authTransactionId": string,
}
*/
async function registerAshield(mid, regNum, regTransactionId, regSignature, authTransactionId, authSignature) {
    console.log("registerAshield");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('registerAshield', { 'mid': mid, 'regNum': regNum, 'regTransactionId': regTransactionId, 'regSignature': regSignature, 'authTransactionId': authTransactionId, 'authSignature': authSignature });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}


/*
returns
{
    "success": bool,
    "message": string error message if any,
    "msisdn": string phone number,
    "authTransactionId": string,
}
*/
async function authenticateAshield(mid, authTransactionId, authSignature) {
    console.log("authenticateAshield");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('authenticateAshield', { 'mid': mid, 'authTransactionId': authTransactionId, 'authSignature': authSignature });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}


/*
returns
{
  "success": bool,
  "message": string error message if any,
  "data": {
    "response": {
      "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiQjgxODI0N2EiLCJvcmlnaW4iOiJhbmRyb2lkOmFway1rZXktaGFzaDpYM3VXbHl6T2JKc0xlRGo4WWxULTUyYld1TS1kdS0yQTQwcThVSWVLZ1dBIiwiYW5kcm9pZFBhY2thZ2VOYW1lIjoiY29tLmV4YW1wbGUucWxpa2F1dGgifQ",
      "attestationObject": "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YViUKzydSrzddaADTDFFr8EQ0fpZ4DHr2nHK93vE4HwwhRBdAAAAAOqbjWZNAR0hPOS2tIy1ddQAEGEc352LYUzH9jhJ1_kiuQ2lAQIDJiABIVggifvtE7W_55I79-4TWOM_AMHqu9foUJL6KXj2IW12n3MiWCBlEW9I_laPbD6JwZkcsAcGF7Vh7GWQK6VIZdQ0asl1XQ",
      "transports": [
        "internal",
        "hybrid"
      ]
    },
    "authenticatorAttachment": "platform",
    "clientExtensionResults": {
      "credProps": {
        "rk": true
      }
    },
    "id": "YRzfnYthTMf2OEnX-SK5DQ",
    "rawId": "YRzfnYthTMf2OEnX-SK5DQ",
    "type": "public-key"
  }
}
*/
async function registerFido(params) {
    console.log("registerFido");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('registerFido', { 'params': params });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

/*
{
  "success": bool,
  "message": string error message if any,
  "data": {
    "id": "KEDetxZcUfinhVi6Za5nZQ",
    "type": "public-key",
    "rawId": "KEDetxZcUfinhVi6Za5nZQ",
    "response": {
      "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiVDF4Q3NueE0yRE5MMktkSzVDTGE2Zk1oRDdPQnFobzZzeXpJbmtfbi1VbyIsIm9yaWdpbiI6ImFuZHJvaWQ6YXBrLWtleS1oYXNoOk1MTHpEdll4UTRFS1R3QzZVNlpWVnJGUXRIOEdjVi0xZDQ0NEZLOUh2YUkiLCJhbmRyb2lkUGFja2FnZU5hbWUiOiJjb20uZ29vZ2xlLmNyZWRlbnRpYWxtYW5hZ2VyLnNhbXBsZSJ9",
      "authenticatorData": "j5r_fLFhV-qdmGEwiukwD5E_5ama9g0hzXgN8thcFGQdAAAAAA",
      "signature": "MEUCIQCO1Cm4SA2xiG5FdKDHCJorueiS04wCsqHhiRDbbgITYAIgMKMFirgC2SSFmxrh7z9PzUqr0bK1HZ6Zn8vZVhETnyQ",
      "userHandle": "2HzoHm_hY0CjuEESY9tY6-3SdjmNHOoNqaPDcZGzsr0"
    }
  }
}
*/
async function signFido(params) {
    console.log("signFido");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('signFido', { 'params': params });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

/*
returns
{
    "success": bool,
    "message": string error message if any,
    "isUserAvailable":bool,
    "projectId": "projectId",
    "revoked": "revoked",
    "userId": "userId"
}
*/
async function getMiraclUser(projectId, clientId, redirectUri, userId) {
    console.log("getMiraclUser");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('getMiraclUser', { 'projectId': projectId, 'clientId': clientId, 'redirectUri': redirectUri, 'userId': userId });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

/*
returns
{
    "success": bool,
    "message": string error message if any,
    "projectId": "projectId",
    "revoked": "revoked",
    "userId":"userId"
}
*/
async function registerMiraclUser(projectId, clientId, redirectUri, deeplinkUrl) {
    console.log("registerMiraclUser");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('registerMiraclUser', { 'projectId': projectId, 'clientId': clientId, 'redirectUri': redirectUri, 'deeplinkUrl': deeplinkUrl });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

/*
returns
{
    "success": bool,
    "message": string error message if any,
    "authCode": "string"
}
*/
async function loginMiraclUser(projectId, clientId, redirectUri, userId) {
    console.log("loginMiraclUser");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('loginMiraclUser', { 'projectId': projectId, 'clientId': clientId, 'redirectUri': redirectUri, 'userId': userId });
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

/**
 * @function readDeviceDetails
 * @returns {DeviceDetailsResponse} - An object containing the result of the operation.
 * 
 * @typedef {DeviceDetailsResponse}
 * @property {boolean} success 
 * @property {string} message - "Error message if any"
 * @param {DeviceLocation} location
 * @param {DeviceTime} time
 * @param {DeviceInfo} device
 * 
 * @typedef {Object} DeviceLocation
 * @property {Number} lat - 90.1234
 * @property {Number} long - 1.1234
 * 
 * @typedef {Object} DeviceTime
 * @property {string} time - UTC time eg: 2024-01-29T12:30:45Z
 * @property {Number} offset - UTC Offset in minutes eg: +120
 * @property {Number} epoch - epoch time
 * 
 * @typedef {Object} DeviceInfo
 * @property {string} model - eg: "oneplus 8t"
 * @property {boolean} isPhysicalDevice - returns whether the device is real
 * @property {string} osVersion - eg: "android 8"
 * @property {string} id - device id
 * @property {string} platform - platform
 */
async function readDeviceDetails() {
    console.log("readDeviceDetails called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('readDeviceDetails');
        if (result == null) {
            return {
                "success": false,
                "message": "The App may be using an older version of SDK. Please update",
                "device": {},
                "location": {},
                "time": {}
            }
        }
        return result;
    } else {
        throw new Error('Webview not ready');
    }
}

/**
 * @function registerEztoPass
 * 
 * @property {string} currentKey - Base64 - 16 Byte
 * @property {string} newKey - Base64 - 16 Byte
 */
async function registerEztoPass(currentKey, newKey) {
    console.log("registerEztoPass called");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('registerEztoPass', { "currentKey": currentKey, "newKey": newKey });
        if (result == null) {
            return {
                "success": false,
                "message": "The App may be using an older version of SDK. Please update",
            }
        }
        return result;
    } else {
        throw new Error("Webview not ready");
    }
}

/**
 * @function createSdm
 * 
 * @property {string} privateKey - Base64 - 16 Byte
 * @property {string} baseUrl - Url "eg: ezto://sdk"
 */
async function createSdm(privateKey, baseUrl) {
    console.log("createSdm called");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('createSdm', { "privateKey": privateKey, "baseUrl": baseUrl });
        if (result == null) {
            return {
                "success": false,
                "message": "The App may be using an older version of SDK. Please update",
            }
        }
        return result;
    } else {
        throw new Error("Webview not ready");
    }
}

/**
 * @function getSdmNdef
 * 
 */
async function getSdmNdef() {
    console.log("getSdmNdef called");
    let isReady = await waitForWebviewToBeReady();

    if (isReady) {
        let result = await callHandlerWithResult('getSdmNdef');
        if (result == null) {
            return {
                "success": false,
                "message": "The App may be using an older version of SDK. Please update",
            }
        }
        return result;
    } else {
        throw new Error("Webview not ready");
    }
}

/**
 * @function copyToClipboard
 * @returns {CopyStatus}
 * 
 * @typedef {CopyStatus}
 * @property {boolean} success
 * @property {string} message
 */

async function copyToClipboard(text) {
    console.log("copyToClipboard called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('copyToClipboard', { "text": text });
        if (result == null) {
            return {
                "success": false,
                "message": "The App may be using an older version of SDK. Please update",
            }
        }
        return result;
    } else {
        throw new Error("Webview not ready");
    }
}

/**
 * @function isCustomSchemeRegisteredOnApp
 * @returns {SchemeStatus}
 * 
 * @typedef {SchemeStatus}
 * @property {boolean} isRegistered
 * @property {boolean} success
 * @property {string} message
 */
async function isCustomSchemeRegisteredOnApp(scheme, host) {
    console.log("isCustomSchemeRegisteredOnApp called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('isCustomSchemeRegisteredOnApp', { "scheme": scheme, 'host': host });
        if (result == null) {
            return {
                "success": false,
                "message": "The App may be using an older version of SDK. Please update",
            }
        }
        return result;
    } else {
        throw new Error("Webview not ready");
    }
}

async function closeOpenedTab() {
    console.log("closeOpenedTab called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('closeOpenedTab');
        if (result == null) {
            return {
                "success": false,
                "message": "The App may be using an older version of SDK. Please update",
            }
        }
        return result;
    } else {
        throw new Error("Webview not ready");
    }
}


async function isWebSdkSupported() {
    console.log("isWebSdkSupported called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('isWebSdkSupported');
        if (result == null) {
            return {
                "success": false,
                "message": "The App may be using an older version of SDK. Please update",
            }
        }
        return result;
    } else {
        throw new Error("Webview not ready");
    }
}

async function openLinkInTab(url) {
    console.log("openLinkInTab called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('openLinkInTab', { "url": url });
        if (result == null) {
            return {
                "success": false,
                "message": "The App may be using an older version of SDK. Please update",
            }
        }
        return result;
    } else {
        throw new Error("Webview not ready");
    }
}

async function loadUrl(url) {
    console.log("loadUrl called");
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('loadUrl', { "url": url });
        if (result == null) {
            return {
                "success": false,
                "message": "The App may be using an older version of SDK. Please update",
            }
        }
        return result;
    } else {
        throw new Error("Webview not ready");
    }
}

async function getCurrentNetwork() {
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('getCurrentNetwork');
        return result;
    } else {
        throw new Error("Webview not ready");
    }
}

async function loadSekuraSessionUrl(url) {
    let isReady = await waitForWebviewToBeReady();
    if (isReady) {
        let result = await callHandlerWithResult('loadSekuraSessionUrl', { "url": url });
        return result;
    } else {
        throw new Error("Webview not ready");
    }
}

function getBrowserOs() {
    const userAgent = window.navigator.userAgent;
    const platform =
        (window.navigator?.userAgentData?.platform || window.navigator.platform).toLowerCase();
    console.log("navigator.platform", platform, platform.includes("mac"));

    if (platform.includes("mac")) {
        return "macosx";
    }
    if (platform.includes("win")) {
        return "windows";
    }
    if (platform.includes("iphone") || platform.includes("ipad")) {
        return "ios";
    }
    if (platform.includes("android")) {
        return "android";
    }

    if (/Android/.test(userAgent)) {
        return "android";
    }
    if (platform.includes("linux")) {
        return "linux";
    }

}

function isCustomSchemeRegistered(scheme) {
    return new Promise(async function (resolve, reject) {
        await delay(1000)
        var iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = scheme;

        document.body.appendChild(iframe);

        var timeout = setTimeout(function () {
            console.log("timeout");
            document.body.removeChild(iframe);
            resolve(false); // Timeout occurred, assuming the scheme is not registered
        }, 5000); // Timeout in milliseconds

        function checkHandler() {
            console.log("checkHandler");
            clearTimeout(timeout);
            document.body.removeChild(iframe);
            resolve(true); // Scheme is registered
        }

        function errorHandler() {
            console.log("errorHandler");
            clearTimeout(timeout);
            document.body.removeChild(iframe);
            resolve(false); // Scheme is not registered
        }

        // Add event listeners
        window.addEventListener("blur", checkHandler); // iOS Safari
        iframe.onload = checkHandler; // Other browsers
        iframe.onerror = errorHandler; // Other browsers
    });
}

function delay(millisec) {
    return new Promise(resolve => {
        setTimeout(() => { resolve('') }, millisec);
    })
}
