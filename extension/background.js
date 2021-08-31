/*
 */

 'use strict';
  
 var stored_id    = 'default'
 var stored_name  = 'System Default Device';
 var extension_id = chrome.runtime.id;
 
 const constraints = {
	audio: true
  };

 // Haha, it seems we no longer need getUserMedia() ...
chrome.contentSettings['microphone'].set({'primaryPattern':'*://' + extension_id + '/*','setting':'allow'});

chrome.runtime.onMessage.addListener(
	function (message, sender, sendResponse) {
		if (message.method == "AP_get_default_name") {
			log('Received message: ' + message.method + ' from frame ' + sender.frameId + ' on tab ' + sender.tab.id);
			if (sender.frameId != 0 ) {
				log('Asking top frame: report_sink_name');
				chrome.tabs.sendMessage(sender.tab.id,
					{"message": "report_sink_name"},
					{'frameId': 0},  // request from top frame
					function(response) {
						if (response) {
							var default_name = document.getElementById("default_name");
							log("Received Response from top frame: " + response.sink_name);
							if (response.sink_name != '') {
								log('Reply to sub frame ' + sender.frameId + ' with: top sink_name: ' + response.sink_name);
								sendResponse({'default_name': response.sink_name});
							} else {
								log('Reply to sub frame ' + sender.frameId + ' with: default_name: ' + default_name.value);
								sendResponse({'default_name': default_name.value});
							}
						}
					}
				);
			} else {
				var default_name = document.getElementById("default_name");
				log('Reply with: default_name: ' + default_name.value);
				sendResponse({'default_name': default_name.value});
			}
		} else if (message.method == "AP_help_with_GUM") {
			log('Received message: ' + message.method + ', primaryPattern: ' + message.primaryPattern);
			chrome.contentSettings['microphone'].set({'primaryPattern': message.primaryPattern,'setting':'allow'});
			log('Reply with: result: ' + 'Have fun!');
			sendResponse({'result': 'Have fun!'});
		}
		return true;
    }
 )
 
// -- Initialize device_cache (list of available devices)
function init() {
	var default_name = document.getElementById("default_name");
	default_name.value = stored_name;
//	navigator.mediaDevices.getUserMedia(constraints);
	navigator.mediaDevices.enumerateDevices()
		.then(update_device_cache)
		.catch(errorCallback);
}

function errorCallback(error) {
	log('error: '+ error);
}

function log(message) {
	console.log('background: ' +  message);
}
                                                                                                                                                                                                                                                                                                           
function update_device_cache(deviceInfos) {
console.log(deviceInfos);
	var default_name = document.getElementById("default_name");
	var select = document.getElementById('device_cache');
	log('update_device_cache: ' + deviceInfos.length + ' device(s) total (audio/video input/output)');
	for (var i = 0; i !== deviceInfos.length; ++i) {
		var kind = deviceInfos[i].kind;
		var id = deviceInfos[i].deviceId;
		var text = deviceInfos[i].label;
		//log('device: ' + id + ' - ' + text);
		if (kind === 'audiooutput') {
			if (id == "default") {
				text = "System Default Device";
				if (stored_name == '') {
					stored_name = text;
					default_name.value = stored_name;
				}
			} else if (id == "communications") {
				text = "System Default Communications Device";
			}
			//log('audiooutput: ' + id + ' - ' + text);
			if (text) { // only update/write cache, when we have a device label
				var option = document.getElementById(id)
				if (option) {
					option.value = text;
				} else {
					option = document.createElement("option");
					option.id = id;
					option.value = text;
					select.appendChild(option);				
				}
			}
		}
	}
}

// -- main ---------------------------------------------------------------
chrome.storage.local.get("AP_default_name",
	function(result) {
		stored_name = result["AP_default_name"];
		if (!stored_name) { stored_name = ''; }
		log('stored_name: '+ stored_name);
		init();
	}
);
