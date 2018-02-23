const camelcase = require('camelcase');
const { DroneConnection, CommandParser } = require('pdrone-low-level');
const EventEmitter = require('events');

module.exports = function pdrone({ id, debug = false }) {
  const commandParser = new CommandParser();
  const droneConnection = new DroneConnection(id);
  const drone = new EventEmitter();
  drone.connection = droneConnection;

  if (debug === true) {
    require('winston').level = 'debug';
  }

  // force drone to stay connected
  drone.connection.on('connected', () => {
    // protocol says it will disconnect after 5 seconds of inactivity
    setInterval(() => {
      drone.runCommand('minidrone', 'NavigationDataState', 'DronePosition');
    }, 3000);
  });

  // low level direct access
  drone.runCommand = (...args) => {
    const command = commandParser.getCommand(...args);
    return droneConnection.runCommand(command);
  };

  // easy to use commands
  drone.flatTrim = () => drone.runCommand('minidrone', 'Piloting', 'FlatTrim');
  drone.takeOff = () => drone.runCommand('minidrone', 'Piloting', 'TakeOff');
  drone.fly = opts =>
    drone.runCommand('minidrone', 'Piloting', 'PCMD', {
      timestamp: 0,
      flag: true,
      ...opts,
    });
  drone.land = () => drone.runCommand('minidrone', 'Piloting', 'Landing');
  drone.emergency = () =>
    drone.runCommand('minidrone', 'Piloting', 'emergency');
  drone.autoTakeOff = () =>
    drone.runCommand('minidrone', 'Piloting', 'AutoTakeOffMode');
  drone.flip = ({ direction }) =>
    drone.runCommand('minidrone', 'Animations', 'Flip', { direction });
  drone.cap = ({ offset }) => drone.runCommand('minidrone', 'Cap', { offset });
  drone.openClaw = () =>
    drone.runCommand('minidrone', 'UsbAccessory', 'ClawControl', {
      id: 0,
      action: 'OPEN',
    });
  drone.closeClaw = () =>
    drone.runCommand('minidrone', 'UsbAccessory', 'ClawControl', {
      id: 0,
      action: 'CLOSE',
    });
  drone.fire = () =>
    drone.runCommand('minidrone', 'UsbAccessory', 'GunControl', {
      id: 0,
      action: 'FIRE',
    });
  drone.lights = ({ mode, intensity }) =>
    drone.runCommand('minidrone', 'UsbAccessory', 'LightControl', {
      id: 0,
      mode: mode.toUpperCase(),
      intensity,
    });

  drone.connection.on('connected', () => {
    drone.emit('connected');
  });

  // events forwarding
  drone.connection.on('sensor:minidrone-PilotingState-FlatTrimChanged', e =>
    drone.emit('sensor', { name: 'flatTrimDone' })
  );

  drone.connection.on('sensor:minidrone-PilotingState-FlyingStateChanged', e =>
    drone.emit('sensor', {
      name: 'flyingStateChange',
      value: camelcase(e.state._enum.findForValue(e.state._value)),
    })
  );

  drone.connection.on('sensor:minidrone-PilotingState-AlertStateChanged', e =>
    drone.emit('sensor', {
      name: 'alertStateChange',
      value: camelcase(e.state._enum.findForValue(e.state._value)),
    })
  );

  drone.connection.on('sensor:minidrone-UsbAccessoryState-ClawState', e =>
    drone.emit('sensor', {
      name: 'claw',
      value: camelcase(e.state._enum.findForValue(e.state._value)),
    })
  );

  drone.connection.on('sensor:minidrone-UsbAccessoryState-GunState', e =>
    drone.emit('sensor', {
      name: 'gun',
      value: camelcase(e.state._enum.findForValue(e.state._value)),
    })
  );

  return drone;
};
