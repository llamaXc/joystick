
var AXIS_X = 0;
var AXIS_Y = 1;
var DEVICE_NUM = 0;
var gamepadsAvaliable = []
var gamepad_list_html = $("#gamepad_list");
var simButton = $("#start_button");
var joystickStatusButton = $("#toggleJoystick")
var pitchInputBox = $("#pitch_input");
var rollInputBox = $("#roll_input");
var deviceInputBox = $("#device_num");
var showJoystickData = false;
var rollInvertBox = $("#roll_invert_box");
var pitchInvertBox = $("#pitch_invert_box");
var rollInvert = false;
var pitchInvert = false;
var targeted = false;
var distance = 0.0;

var targetsCaught = 0;


var gameMode = $("#game_mode");
gameMode.on("change", (event) => {
  console.log(event);
  mode = event.target.value;
})
var ownshipSpeedSlider = $("#ownship_speed_slider");
var ownshipSpeedLabel = $("#ownship_speed_label");

var targetSpeedSlider = $("#target_speed_slider");
var targetSpeedLabel = $("#target_speed_label");
ownshipSpeedSlider.val(50); //set to default 50

ownshipSpeedSlider.on('input',  (event) => {
  ownshipSpeedLabel.text("Ownship Max Speed: " + event.target.value);
  ownship.max_speed = event.target.value;
})

targetSpeedSlider.on('input',  (event) => {
  targetSpeedLabel.text("Ownship Max Speed: " + event.target.value);

//  ownship.max_speed = event.target.value;
})

var axesOptions = {};
axesOptions.pitch = {invert: false};
axesOptions.roll = {invert: false};

rollInvertBox.on("change",(event) => {
  axesOptions.roll.invert = event.target.checked;
});

pitchInvertBox.on("change",(event) => {
     axesOptions.pitch.invert = event.target.checked;
});

window.addEventListener("gamepadconnected", function(e) {
   updateJoysticksShown();
});

var poll_interval = 50;
var poll_gamepad = setInterval(pollGamePads, poll_interval);

function toggleJoystickData(){
  console.log(showJoystickData)
  showJoystickData =! showJoystickData;
  if(showJoystickData){
    joystickStatusButton.text("Hide Joystick Data")
  }else{
    joystickStatusButton.text("Show Joystick Data")
  }
}

function updateDevice(){
   console.log(deviceInputBox.val() + " selected");
   device_id = deviceInputBox.val();

   //populate the axis options
   pitchInputBox.empty();
   pitchInputBox.append("<option selected>Choose...</option>")

   rollInputBox.empty();
   rollInputBox.append("<option selected>Choose...</option>")

   var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    for (var x = 0; x < gamepads[device_id].axes.length; x++){
      pitchInputBox.append("<option value='" + x +  "'>" + x +  "</option>")
      rollInputBox.append("<option value='" + x +  "'>" + x +  "</option>")
    }
}

function updateJoysticksShown(){
  gamepad_list_html.empty();
  deviceInputBox.empty();
  deviceInputBox.append("<option selected>Choose...</option>")
  console.log("Adding");
  var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
  for(var i = 0; i < gamepads.length; i++){
     if(gamepads[i] != null){
        gamepadsAvaliable[i] = gamepads[i]
        deviceInputBox.append("<option value='" + i +  "'>" + gamepads[i].id +  "</option>")
        gamepad_list_html.append("<ul>" + gamepads[i].id +  "</ul>");
        for(var x = 0; x < gamepads[i].axes.length; x++){
          deviceInputBox.append("<select value='" +  x + "'>" + x +"</select>")
          gamepad_list_html.append("<ul>");
          gamepad_list_html.append("Axis " + x + ": <progress id='" + (i + "_" + x ) + "' value='50' max='100'></progress>");
          gamepad_list_html.append("</ul>");
        }
    }
  }
}

function pollGamePads(){
  var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
  for(var i = 0; i < gamepads.length; i++){
      if(gamepads[i] != null){
      gamepadsAvaliable[i] = gamepads[i]
      for(var x = 0; x < gamepads[i].axes.length; x++){
        var axisValue = gamepads[i].axes[x];
        axisValue = ((axisValue + 1.0) / 2.0) * 100;

        gamepadsAvaliable[i].axes[i] = {value:axisValue, axisMapping: -1};
        $("#" + (i + "_" + x)).val(axisValue)
      }
    }
  }
}

function launchSim(){
  if(sim_running == false){
    clearInterval(poll_gamepad);

    //TODO Fix this
    if(Number.isInteger(pitchInputBox.val())){
      AXIS_Y = 0;
    }else{
      AXIS_Y = pitchInputBox.val();
    }

    if(Number.isInteger(rollInputBox.val())){
      AXIS_X == 1;
    }else{
      AXIS_X = rollInputBox.val();
    }

    if(Number.isInteger(deviceInputBox.val())){
      DEVICE_NUM = 0;
    }else{
      DEVICE_NUM = deviceInputBox.val();
    }
    console.log("Device #: " + DEVICE_NUM + "\nX Axis: " + AXIS_X + "\nY Axis: " + AXIS_Y);
    //Change button to end.
    simButton.text("Stop")
    sim_running = true;
    updateStatus();
  }else{
    sim_running = false;
    simButton.text("Launch")
    poll_gamepad = setInterval(pollGamePads, poll_interval);
  }
}

/* Drawing Code */
var sim_running = false;
var cur_time = performance.now();
var prev_time = 0.0;
var delta_time = 0.0
var locked_target_start = 0.0;
var last_lock_time = 0.0;
var locked = false;
var last_ui_update = 0.0;

var DEADBAND = 0.01;
var joystick = {};
var invert_y_axis = true;
var invert_x_axis = false;
var percison = 100.0;

var canvas = document.getElementById("joystick_canvas");
var canvas_height = canvas.scrollHeight;
var canvas_width = canvas.scrollWidth
var ctx = canvas.getContext("2d");
var BACKGROUND_COLOR = "#143770"
var PLAYER_COLOR = "#ffffff"
var TARGET_COLOR = "#e80000"
var debug = false;
var ownship = {position : {x: canvas_width / 2, y: canvas_height / 2},
               velocity: {x: 0.0, y: 0.0},
               acceleration: {x: 0, y: 0},
               max_speed: 50,
               size: {width: 15, height:15}
            };

var target = {position: {x: 150, y: 150},
              size: {width: 15, height: 15},
              velocity: {x: 10.0, y: 7.0},
              acceleration: {x: 0, y: 0},
              timeToSwitch: 5.0,
              internalTime: 0.0,
              timeTargeted: 0.0
            };

var random_speed = (Math.random() * 8)  + 8;

var random_angle = (Math.random() * 90);
var xspeed = random_speed * Math.sin(30 * Math.PI/180)
var yspeed = random_speed * Math.cos(30 * Math.PI/180)
target.velocity.x = xspeed;
target.velocity.y = yspeed;

var TARGET_SWITCH_FREQ = 100.0; //Every 10 seconds, a random switch occurs

ctx.font = "20px Georgia";
ctx.fillText("Enter the Device Number, Pitch, Roll Axis", 80, 200, 500);
ctx.fillText("Then Hit Launch", 190, 250, 500);

function updateTime(){
  prev_time = cur_time;
  cur_time = performance.now();
  delta_time = (cur_time - prev_time) * 0.01;
}

function updateTargets(){

   if(mode == 0){
     if(determineLock()){
       spawnTarget();
       targetsCaught++;
     }
   }else{
     target.position.x += target.velocity.x * delta_time;
     target.position.y += target.velocity.y * delta_time;

     if(target.position.x - target.size.width < 0){
       target.velocity.x *= -1;
       target.position.x =  target.size.width;
     }else if(target.position.x + target.size.width  > canvas_width){
       target.velocity.x *= -1;
       target.position.x =  canvas_width - target.size.width - 1;
     }

     if(target.position.y - target.size.height < 0){
       target.velocity.y *= -1;
       target.position.y = target.size.width;
     }else if(target.position.y + target.size.height > canvas_height){
       target.velocity.y *= -1;
       target.position.y = canvas_height - target.size.width - 1;
     }

     if(targeted ){
       target.timeTargeted += delta_time;
       target.internalTime += delta_time;
       if(target.internalTime > target.timeToSwitch){
         target.timeToSwitch = Math.random() * TARGET_SWITCH_FREQ;
         target.velocity.x *= -1;
         target.internalTime = 0;
       }
     }
 }

}

function updateOwnship(){
   var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
   var current_x = gamepads[DEVICE_NUM].axes[AXIS_X];
   var current_y = gamepads[DEVICE_NUM].axes[AXIS_Y];

   //smooth and remove deadzone
  if(Math.abs(current_x) - DEADBAND < DEADBAND){
    current_x = 0.0;
  }
  if(Math.abs(current_y) - DEADBAND < DEADBAND){
    current_y = 0.0;
  }

  current_x = ((current_x + 1.0) / 2.0) * canvas_width;
  current_y = ((current_y + 1.0) / 2.0) * canvas_height;

  if(axesOptions.pitch.invert){
    current_y = canvas_height - current_y;
  }

  if(axesOptions.roll.invert){
    current_x = canvas_width - current_x;
  }


  var estimated_vel_x = ( (  (current_x  / canvas_width) )  * ownship.max_speed) - ownship.max_speed/2;
  var estimated_vel_y = ( (  (current_y  / canvas_height) )  * ownship.max_speed) - ownship.max_speed/2;

  ownship.velocity.x = estimated_vel_x;
  ownship.velocity.y = estimated_vel_y;
  ownship.position.x += estimated_vel_x * delta_time;
  ownship.position.y += estimated_vel_y * delta_time;
  if(ownship.position.x - (ownship.size.width ) < 0){
    ownship.position.x = ownship.size.width;
  }else if(ownship.position.x + ownship.size.width > canvas_width){
    ownship.position.x = canvas_width - ownship.size.width;
  }

  if(ownship.position.y - ownship.size.width < 0){
    ownship.position.y = ownship.size.width;
  }else if(ownship.position.y + ownship.size.width > canvas_height){
    ownship.position.y = canvas_height - ownship.size.width;
  }

}

function determineLock(){
  if(mode == 0){
    cur_target = goalTarget;
  }else{
    cur_target = target;
  }
  distance = Math.sqrt(Math.pow((ownship.position.x - cur_target.position.x), 2) + Math.pow((ownship.position.y - cur_target.position.y), 2))
  targeted = distance < ownship.size.width  + cur_target.size.width
  if(targeted){
      PLAYER_COLOR ="#87FB14";
      if(!locked){
        locked = true;
        locked_target_start = performance.now();
      }else{
        last_lock_time = locked_target_start;
      }
  }else{
       PLAYER_COLOR ="#ffffff";
  }
  return targeted;
}

function updateUI(){
  var elapsed_ui_time = performance.now() - last_ui_update;
  if(elapsed_ui_time > 1000){
    last_ui_update = performance.now();
  }

  ctx.fillStyle = "white";
  var time_shown = Math.trunc(target.timeTargeted) / 10;
  if(time_shown > 60){
    time_shown = Math.trunc(time_shown);
  }

  if(mode == 0){
    ctx.fillText(targetsCaught, 10, 20, 500);
  }else{
    ctx.fillText(time_shown, 10, 20, 500);
  }
}

function clear(){
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

var mode = 0; //practice mode

var goalTarget = {position: {x: 0, y: 0}, size: {width: 15, height: 15}}
spawnTarget();

function spawnTarget(){
  goalTarget.position.x = Math.random() * 400 + 50;
  goalTarget.position.y = Math.random() * 400 + 50;
}
function drawTargets(){

  if(mode == 0){
    ctx.strokeStyle = TARGET_COLOR;
    ctx.fillStyle = TARGET_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(goalTarget.position.x , goalTarget.position.y,  target.size.width, 0, 2 * Math.PI);
    ctx.fill();
  }else{
    ctx.strokeStyle = TARGET_COLOR;
    ctx.fillStyle = TARGET_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(target.position.x , target.position.y,  target.size.width, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function drawOwnship(){
  //Draw Player
  ctx.strokeStyle = PLAYER_COLOR;
  ctx.beginPath();
  ctx.arc(ownship.position.x, ownship.position.y  , ownship.size.width, 0, 2 * Math.PI);
  ctx.fillStyle = PLAYER_COLOR
  ctx.fillRect(ownship.position.x - 1, ownship.position.y - ownship.size.height, 2, ownship.size.height * 2);
  ctx.fillRect(ownship.position.x - ownship.size.width, ownship.position.y - 1, ownship.size.width * 2,  2);
  ctx.stroke();
}


function updateStatus(){
   updateTime();
   determineLock();
   updateOwnship();
   updateTargets();

   clear();
   drawTargets();
   drawOwnship();
   updateUI();

  if(sim_running){
    window.requestAnimationFrame(updateStatus);
  }
}
