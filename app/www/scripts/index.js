let singleAppInterval;
let appStartTimer = (new Date().getTime()).toString();

let smsOutQueue = [];
let connected = false;
let connecting = false;
let scanning = false;
let address = null;
let token = null;
let ws = null;
let permissions;

document.addEventListener('deviceready', onDeviceReady.bind(this), false);

function onDeviceReady() {

	if (typeof (cordova) === "object") {
		permissions = cordova.plugins.permissions;
	} else {
		//mocking stuff to test 

		sendSMS();
		navigator.notification = {
			alert: (txt, callback) => {
				alert(txt);
				if (callback) {
					callback();
				}
			}
		};

		window.sms = {
			hasPermission: (successCallBack) => {
				successCallBack(true);
			},
			send: (phoneNumber, body, options, successCallBack, erroCallBack) => {
				writeToConsole("- Fake message sent!");
				successCallBack();
			}
		};

		permissions = {
			requestPermission: (type, callback) => {
				callback(true);
			},
			checkPermission: (type, callback) => {
				callback({ hasPermission: true });
			}
		};

		window.cordova = {
			plugins: {
				barcodeScanner: {
					scan: (successCallBack, erroCallBack, options) => {
						let code = prompt("Enter the JSON token as string", "");

						if (code) {
							successCallBack({
								cancelled: false,
								text: code
							});
						} else {
							erroCallBack("Cancelled");
						}
					}
				}
			}
		};
	}

	localStorage.setItem("timerSingleTon", appStartTimer);

	// Handle the Cordova pause and resume events
	document.addEventListener('backbutton', (event) => {
		event.preventDefault();
		return false;
	}, false);

	// TODO: Cordova has been loaded. Perform any initialization that requires Cordova here.

	$("#form_main").on("submit", (event) => {
		event.preventDefault();
	});

	$("#btn-disconnect").on("click", (event) => {
		event.preventDefault();
		ws.close(4001);
	});

	$('#txt_console').textareafullscreen({
		overlay: true, // Overlay
		maxWidth: '95%', // Max width
		maxHeight: '95%' // Max height
	});

	address = localStorage.getItem("address");
	token = localStorage.getItem("token");

	requestSMSAccess();

	clearInterval(singleAppInterval);

	singleAppInterval = window.setInterval(() => {
		let timerSingleTon = localStorage.getItem("timerSingleTon");

		if (appStartTimer !== timerSingleTon) {
			//there is a new window running our code. Close this old one
			navigator.app.exitApp();
		}
	}, 2000); // 2 sec

	sendSMS(); //start to try send SMS from queue
}

function requestSMSAccess() {

	try {

		window.sms.hasPermission((hasPermission) => {
			if (!hasPermission) {

				permissions.requestPermission(permissions.SEND_SMS,
					() => {
						connect();
					},
					() => {
						showAppPermissionError("Please, give SMS permission for this app in your settings.\nYou might need to restart the APP");
						window.setTimeout(requestSMSAccess, 15000);
					}
				);
			} else {
				connect();
			}
		}, (err) => {
			showAppPermissionError('Something went wrong: ' + err);
			window.setTimeout(requestSMSAccess, 15000);
		});


	} catch (err) {
		showAppPermissionError('Something went wrong: ' + err);
		window.setTimeout(requestSMSAccess, 15000);
	}
}

function showAppPermissionError(msg) {
	$("#divConfig").hide();
	$("#divConnected").hide();
	$('#appPermissionError').text(msg).show();
}

function setConnected() {
	$("#divConfig").hide();
	$("#divConnected").show();
	$("#server-address").html("Phone connected to: <strong>" + address.substring(address.indexOf(":")+3).replace('/', '') + "</strong>");

	//persist the current successful connection
	localStorage.setItem("address", address);
	localStorage.setItem("token", token);
}

function setNotConnected() {
	$("#divConfig").show();
	$("#divConnected").hide();
	$("#server-address").html("");
}

function setConfigurating() {
	$("#divConfig").hide();
	$("#divConnected").hide();
}

function connect() {

	if (connected || connecting || scanning) {
		return;
	}

	if (!address || !token) {
		setNotConnected();
		return;
	}

	connecting = true;
	ws = new WebSocket(address + "?token=" + token);

	ws.onmessage = (e) => {

		let data = {
			event: "",
			message: ""
		};

		try {

			let tmpData = JSON.parse(e.data);

			data.event = tmpData.event;
			data.message = tmpData.message;

		} catch (err) {
			writeToConsole("Error on ws.onmessage after JSON.stringify " + err.message);
			return;
		}

		if (data.event === "connection" && data.message === "OK") {
			connecting = false;
			connected = true;
			writeToConsole("Phone connected to: " + address.substring(address.indexOf(":")+3).replace('/', ''));
			return setConnected();
		}

		if (data.event === "newSMS") {
			smsOutQueue.push(data.message);
		}

	};

	ws.onclose = (event) => {
		connecting = false;
		connected = false;

		let canReconnect = true;

		if (event.code) {
			if (event.code === 4001) {
				writeToConsole("Phone disconnected");
				canReconnect = false;
			}
			if (event.code === 4400) {
				writeToConsole("this phone is not activated");
				canReconnect = false;
			}
			if (event.code === 4401) {
				writeToConsole("This phone is unauthorized");
				canReconnect = false;
			}
			if (event.code === 4409) {
				writeToConsole("This phone phone is already connected");
				canReconnect = false;
			}
		}

		if (canReconnect) {
			// Try to reconnect in 3 seconds
			writeToConsole("reconnecting...");
			setTimeout(connect, 3000);
		} else {
			setNotConnected();
		}

	};

	ws.onerror = (err) => {
		writeToConsole("Error on ws.onerror " + err.message);
		setNotConnected();
	}

}

function setupConnection(info) {

	try {

		let objJson = JSON.parse(info);

		if (objJson.hasOwnProperty('url') && objJson.hasOwnProperty('token')) {
			address = objJson.url;
			token = objJson.token;

			connect();

		} else {
			navigator.notification.alert(
				"Please try again...",
				() => { scanCode(); },
				'Ops!',
				'Done'
			);

			setNotConnected();
		}

	} catch (err) {
		navigator.notification.alert(
			"Please try again...",
			() => { scanCode(); },
			'Ops!',
			'Done'
		);

		setNotConnected();
	}

}

function checkCameraPermission() {

	permissions.checkPermission(permissions.CAMERA,
		(status) => {
			if (!status.hasPermission) {

				navigator.notification.alert(
					"Give this APP permission to the Camera in your phone settings. You might need to restart this App after.",
					() => { setNotConnected() },
					'Ops!',
					'Done'
				);
			}
			else {
				scanCode();
			}
		},
		(error) => {

			navigator.notification.alert(
				"Scanning failed: " + error,
				() => { setNotConnected() },
				'Ops!',
				'Done'
			);

		});
}

function scanCode() {

	scanning = true;

	setConfigurating();

	cordova.plugins.barcodeScanner.scan(
		(result) => {
			scanning = false;

			if (result.cancelled == 0) {
				setupConnection(result.text);
			} else {
				setNotConnected();
			}

		},
		(error) => {
			scanning = false;

			setNotConnected();

			navigator.notification.alert(
				"Scanning failed: " + error,
				() => { },
				'Ops!',
				'Done'
			);
		},
		{
			preferFrontCamera: false, // iOS and Android
			showFlipCameraButton: false, // iOS and Android
			showTorchButton: false, // iOS and Android
			torchOn: false, // Android, launch with the torch switched on (if available)
			prompt: "Place the QR Code inside the scan area", // Android
			resultDisplayDuration: 200, // Android, display scanned text for X ms. 0 suppresses it entirely, default 1500
			formats: "QR_CODE", // default: all but PDF_417 and RSS_EXPANDED
			orientation: "portrait", // Android only (portrait|landscape), default unset so it rotates with the device
			disableAnimations: false, // iOS
			disableSuccessBeep: false // iOS
		}
	);

}

function sendSMS() {

	if (smsOutQueue.length === 0) {
		setTimeout(sendSMS, 500);
		return;
	}

	let SMSJson = smsOutQueue[0];

	if (SMSJson.phone === undefined || SMSJson.body === undefined) {
		smsOutQueue.shift();
		setTimeout(sendSMS, 500);
		return;
	}

	let options = {
		replaceLineBreaks: true,
		android: { intent: '' }
	};

	let arrPhones = SMSJson.phone.split(',');
	let arrPromises = [];

	arrPromises.push(
		new Promise((resolve, reject) => {
			for (let index = 0; index < arrPhones.length; index++) {
				window.sms.send(arrPhones[index], SMSJson.body, options,
					() => {
						resolve();
					},
					(err) => {
						reject({ phone: arrPhones[index], error: err });
					});
			}
		})
	);

	Promise.all(arrPromises).then(() => {
		writeToConsole("- Message sent!");
		smsOutQueue.shift();
		setSent(SMSJson, 0);
		setTimeout(sendSMS, 500);
	}).catch(phoneErr => {
		smsOutQueue.shift();
		writeToConsole('Message to ' + phoneErr.phone + ' failed! - ' + phoneErr.error);
		setTimeout(sendSMS, 500);
	});

}

function setSent(SMSJson, attempts) {

	if (SMSJson.id === undefined) {
		return;
	}

	let message = {};
	message.event = "setSent";
	message.messageId = SMSJson.id;

	try {
		ws.send(JSON.stringify(message));
	} catch (err) {
		if (attempts < 10) {
			window.setTimeout(setSent, 1000, SMSJson, attempts + 1);
		} else {
			writeToConsole("setSent err: " + err.message);
		}
	}

}

function writeToConsole(msg) {
	let str_log = $("#txt_console").val();

	str_log = new Date().toLocaleString() + "\n" + msg + "\n---\n" + str_log;

	if (str_log.length > 10000) {
		str_log = str_log.substr(0, str_log.lastIndexOf("---"));
	}

	$("#txt_console").val(str_log);
}

if (!window.cordova) {
	let event = new CustomEvent("deviceready");
	document.dispatchEvent(event);
}