/*
 */

 'use strict';
 
 var sink_id   = 'default';
 var sink_name = 'System Default Device';
var frame_url = location.protocol + '//'+ location.host + location.pathname;
var frame_depth = get_depth(window.self);
var GUM_state = undefined;
var default_device_name = undefined;// ex : 'Analog out 03-04 (AudioFire 12)';
/*
 * undefined == wait with getUserMedia() until we know that we actually need to call setSinkId 
 *         0 == last call to setSinkId failed. Going to call getUserMedia() next time
 *         1 == getUserMedia() succeeded 
 *        -1 == getUserMedia() failed 
 */

const constraints = {
  audio: true
};
 
function get_depth(w) {
	if (w.parent == w) {
		return 0;
	} else {
		return 1 + get_depth(w.parent);
	}
}
function log(message) {
	console.log('  '.repeat(frame_depth) + 'AudioPick(' + frame_url + '): ' + message);
}

function errorCallback(error) {
	log('Error: '+ error);
}

// -- Register a listener for messages from the popup page
function register_message_listener() {
	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request.message === "browser_action_commit" ) {
				log('Received message: browser_action_commit, sink_name: ' + request.sink_name);
				if (request.sink_name != undefined) {
					sink_name = request.sink_name;
					get_devices(true, inspect_devices); // --> inspect_device_infos() --> update_all_sinks()
				}
			} else if (request.message == "report_sink_name") {
				log('Received message: report_sink_name');
				log('Reply with: sink_name: ' + sink_name);
				sendResponse({'sink_name': sink_name});
			}
		}
	)
}	

// -- Register a Mutation Observer to monitor changes and additions of <audio/> and <video/> elements
function register_observer() {
	var observer = new MutationObserver(
		function(mutations) {
			var needs_update = false;
			mutations.forEach(
				function(mutation) {
					//log('mutation.type: ' + mutation.type);
					if (mutation.type == 'attributes') {
						// This can cause a loop!
						//if (check_node(mutation.target)) needs_update = true;
					} else {
						for (var i = 0; i < mutation.addedNodes.length; i++) {
							if (check_node(mutation.addedNodes[i])) needs_update = true;
						}
					}
				}
			);
			if (needs_update) update_all_sinks();
		}
	);
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
		attributes: true,
		characterData: true
	});
}

function check_node(node) {
	var name = node.nodeName;
	var attributes = node.attributes
	if ((name == 'AUDIO') || (name == 'VIDEO')) {
		log('node added/changed: ' + name);
		return true;
	}
	return false;
}

// -- Request the default sink_name from the background
function request_default_name() {
	log('Requesting default_name ...');
	chrome.runtime.sendMessage({'method': 'AP_get_default_name'},
		function(response) {
			if (response) {
				log('Received default_name: ' + response.default_name);
				default_device_name = response.default_name;
			}
		}
	)
}

function request_help_with_GUM() {
	chrome.runtime.sendMessage({'method': 'AP_help_with_GUM', 'primaryPattern': location.protocol + '//'+ location.host + '/*'},
		function(response) {
			if (response) {
				log('Received result: ' + response.result);
				GUM_state = 1;
				update_all_sinks();
			}
		}
	);
}


function get_devices(getUserMedia, callback) {
	if(getUserMedia) {
    	navigator.mediaDevices.getUserMedia(constraints);
	}
	navigator.mediaDevices.enumerateDevices()
		.then(callback)
		.catch(errorCallback);
}

function inspect_devices(deviceInfos) {
console.log(deviceInfos);
		log('Inspecting Devices: ' + deviceInfos.length + ' device(s) total (audio/video input/output)');
	for (var i = 0; i != deviceInfos.length; i++) {
		var deviceInfo = deviceInfos[i];
		var text = deviceInfo.label;
		if (deviceInfo.deviceId == "default") {
			text = "System Default Device";
		}
		//log('  Devices[' + i + ']: ' + deviceInfo.kind + ': ' + deviceInfo.deviceId);
		if ((deviceInfo.kind == 'audiooutput') && (text == sink_name)) {
			log('Selecting Devices[' + deviceInfo.label + ']: ' + deviceInfo.deviceId);
			sink_id = deviceInfo.deviceId;
		}
	}
	with_or_without_GUM();
}

function with_or_without_GUM() {
	if (GUM_state == 0) {
		request_help_with_GUM();
	} else {
		update_all_sinks();		
	}	
}

function update_all_sinks() {
		var promises = [];
	var allMedia = document.querySelectorAll('audio,video');
	for (var j = 0; j < allMedia.length; j++) {
		var name = allMedia[j].nodeName;
		var src = allMedia[j].currentSrc;
		log('  Queuing SetSinkId: ' + j + ': ' + name + ': ' +  src + ': ' + sink_id);
		
		promises.push(allMedia[j].setSinkId(sink_id));
	}
	if (promises.length > 0) {
		log('Tyring to update all (' + promises.length + ') sinks (GUM_state == ' + GUM_state + '): ' + sink_id);
		Promise.all(promises)
			.then(function(results){log('All set.'); })
			.catch(function(error){
				if (GUM_state == undefined) {
					GUM_state = 0;
					log('SetSinkId failed: ' + error + '. Retrying with GUM ...');
					with_or_without_GUM();
				} else {
					log('SetSinkId failed: ' + error + '.  Giving up.');
				}
			});
	} else {
		log('No sinks found');
	}
	register_observer();
}

function setDefaultDevice()
{
	if(default_device_name !== undefined)
	{
		get_devices(false, function(deviceInfos)
		{
			for (var i = 0; i != deviceInfos.length; i++) {
				var deviceInfo = deviceInfos[i];
				var text = deviceInfo.label;
				if (deviceInfo.deviceId == "default") {
					text = "System Default Device";
				}
				if ((deviceInfo.kind == 'audiooutput') && (text == default_device_name)) {
					sink_id = deviceInfo.deviceId;
					sink_name = text;
					break;
				}
			}
			update_all_sinks();
		});
	}
}

// -- main ---------------------------------------------------------------
register_message_listener();
request_default_name();
setDefaultDevice();