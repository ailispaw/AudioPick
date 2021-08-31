/*
 */
 
'use strict';
 
var bg = chrome.extension.getBackgroundPage();
var default_name = bg.document.getElementById("default_name");
var sink_name = default_name.value;

const constraints = {
	audio: true
  };

// -- Update the temporary device selection page 
 function init() {
	log('init');
 	chrome.tabs.query({active: true, currentWindow: true},
		function(tabs) {
			var activeTab = tabs[0];
			log('Sending message: report_sink_name');
			chrome.tabs.sendMessage(activeTab.id,
				{"message": "report_sink_name"},
				{'frameId': 0}, // only request from main frame
				function(response) {
					if (response) {
						log("Received Response: " + response.sink_name);
						sink_name = response.sink_name;
					}
			//		navigator.mediaDevices.getUserMedia(constraints);
					navigator.mediaDevices.enumerateDevices()
						.then(update_device_popup)
						.catch(errorCallback);
				}
			);
		}
	)
}

function errorCallback(error) {
	log('error: ', error);
}

function log(message) {
	// logging to background console
	bg.console.log('popup: ' +  message);
}

function update_device_popup(deviceInfos) {
console.log(deviceInfos);
	log('update_device_popup: ' + deviceInfos.length + ' device(s) total (audio/video input/output)');
	var div = document.getElementById("device_options");
	var select = bg.document.getElementById("device_cache");
	while (div.firstChild) { div.removeChild(div.firstChild); }
	for (var i = 0; i !== deviceInfos.length; ++i) {
		var kind = deviceInfos[i].kind;
		var id = deviceInfos[i].deviceId;
		var text = deviceInfos[i].label;
		//log('device: ' + id + ' - ' + text);
		if (kind === 'audiooutput') {
			if (id == "default") {
				text = "System Default Device";
			} else if (id == "communications") {
				text = "System Default Communications Device";
			}
			var option = bg.document.getElementById(id);
			if (!text) {
				if (option && option.value) {
					text = option.value;
				} else {
					text = id;
				}
			}
			if (option) {
				option.value = text;
			} else {
				option = bg.document.createElement("option");
				option.id = id;
				option.value = text;
				select.appendChild(option);				
			}
			var input = document.createElement("input");
			input.type= "radio";
			input.name = "device";
			input.id = id;
			input.value = text;
			input.onchange = function(e){input_onchange(e);};
			var textNode = document.createTextNode(text);
			var label = document.createElement("label");
			if (text == sink_name) {
				log('current default_name: ' + text + ' - ' + id);
				input.checked = true;
			}			
			label.appendChild(textNode);
			label.appendChild(input);
			div.appendChild(label);
		}
	}
}

function input_onchange(e) {
	//log('browser_action Commit');
	var sink_name = e.target.value;
	chrome.tabs.query({active: true, currentWindow: true},
		function(tabs) {
			var activeTab = tabs[0];
			log('Sending message: browser_action_commit, sink_name: ' + sink_name);
			chrome.tabs.sendMessage(activeTab.id, { // send to all frames without using options = {'frameId': N} 
				"message": "browser_action_commit",
				"sink_name":  sink_name
			});
			window.close();
		}
	);
};

// -- main ---------------------------------------------------------------
init();

