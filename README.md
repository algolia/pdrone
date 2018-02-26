# pdrone

Control Parrot drones with JavaScript

Compatible with Node.js and Parrot mambo for now.

## API

```js
const pdrone = require('pdrone');
const drone = pdrone({id: 'dronename', debug: false});
drone.on('connected', function() {
  drone.flatTrim(); // use flatTrim() everytime you want the drone to calm down
  drone.takeOff();
  drone.land();  
  drone.flatTrim();
  drone.emergency(); // immediately stops the drone, that's what is inside stop.js
  drone.fly({
    roll: 0, // -100/100
    pitch: 0, // -100/100
    yaw: 0, // -100/100
    gaz: 0, // -100/100, = throttle
  });
  drone.autoTakeOff(); // will start propellers in low mode and wait for you to throw it in the air (gently)
  drone.flip({direction: 'right'}); // front/back/right/left
  drone.cap({offset: 0}); // -180/180, I have no idea what this does
  drone.openClaw();
  drone.closeClaw();
  drone.fire();

  // events
  drone.on('connected', function() {});
  // flight status, accessories, ... you'll have to dig that
  drone.on('sensor', function(event) {
    // event.name =>
    //   flatTrimDone, status, alert, claw, gun, position, speed, altitude, quaternion
    // event.value
  });
});
```

## Lower level API

Any command from the [arsdk-xml](https://github.com/Parrot-Developers/arsdk-xml/blob/master/xml/minidrone.xml) can be ran:

```js
drone.runCommand('minidrone', 'Piloting', 'TakeOff')
drone.connection.on('sensor:minidrone-PilotingState-FlyingStateChanged', e => console.log(e))
```
