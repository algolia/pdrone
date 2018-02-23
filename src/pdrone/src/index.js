const camelcase = require('camelcase');
const { DroneConnection, CommandParser } = require('pdrone-low-level');
const EventEmitter = require('events');

const formatArguments = args =>
  args.reduce(
    (acc, cur) => ({
      ...acc,
      [cur._name]: cur._value,
    }),
    {}
  );

module.exports = function pdrone({ id, debug = false }) {
  const commandParser = new CommandParser();
  const droneConnection = new DroneConnection(id);
  const drone = new EventEmitter();
  drone.connection = droneConnection;
  drone.isConnected = false;

  let flyParams = {
    roll: 0,
    pitch: 0,
    yaw: 0,
    gaz: 0,
  };
  let interval = null;

  if (debug === true) {
    require('winston').level = 'debug';
  }

  // force drone to stay connected
  drone.connection.on('connected', () => {
    drone.isConnected = true;
    // do not remove, safety measure
    drone.runCommand('minidrone', 'PilotingSettings', 'MaxAltitude', {
      current: 2,
    });
    // protocol says it will disconnect after 5 seconds of inactivity
    setInterval(() => {
      drone.runCommand('minidrone', 'NavigationDataState', 'DronePosition');
    }, 2000);
  });

  // low level direct access
  drone.runCommand = (...args) => {
    const command = commandParser.getCommand(...args);
    return droneConnection.runCommand(command);
  };

  drone.wait = delay => new Promise(resolve => setTimeout(resolve, delay));

  // easy to use commands
  drone.flatTrim = () => drone.runCommand('minidrone', 'Piloting', 'FlatTrim');
  drone.takeOff = () => {
    drone.runCommand('minidrone', 'Piloting', 'TakeOff');
    drone.closeClaw();
    interval = setInterval(() => {
      drone.runCommand('minidrone', 'Piloting', 'PCMD', {
        timestamp: 0,
        flag: true,
        ...flyParams,
      });
    }, 100);
  };
  drone.fly = (opts = {}) => {
    flyParams = {
      roll: 0,
      pitch: 0,
      yaw: 0,
      gaz: 0,
      ...opts,
    };
  };
  drone.land = () => {
    clearInterval(interval);
    drone.runCommand('minidrone', 'Piloting', 'Landing');
  };
  drone.emergency = () => {
    clearInterval(interval);
    drone.runCommand('minidrone', 'Piloting', 'Emergency');
  };
  drone.safeLandingAndExit = () => {
    if (!drone.isConnected) {
      // eslint-disable-next-line no-process-exit
      process.exit();
    }
    drone.land();
    setTimeout(() => {
      drone.emergency();
      // eslint-disable-next-line no-process-exit
      process.exit();
    }, 5000);
  };
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
  drone.connection.on('sensor:minidrone-PilotingState-FlatTrimChanged', () =>
    drone.emit('sensor', { name: 'flatTrimDone' })
  );

  drone.connection.on('sensor:minidrone-PilotingState-FlyingStateChanged', e =>
    drone.emit('sensor', {
      name: 'status',
      value: camelcase(e.state._enum.findForValue(e.state._value)),
    })
  );

  drone.connection.on('sensor:minidrone-PilotingState-AlertStateChanged', e =>
    drone.emit('sensor', {
      name: 'alert',
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

  drone.connection.on('sensor:minidrone-NavigationDataState-DronePosition', e =>
    drone.emit('sensor', {
      name: 'position',
      value: formatArguments(e._arguments),
    })
  );

  drone.connection.on('sensor:minidrone-NavigationDataState-DroneSpeed', e =>
    drone.emit('sensor', {
      name: 'speed',
      value: formatArguments(e._arguments),
    })
  );

  drone.connection.on('sensor:minidrone-NavigationDataState-DroneAltitude', e =>
    drone.emit('sensor', {
      name: 'altitude',
      value: formatArguments(e._arguments),
    })
  );

  drone.connection.on(
    'sensor:minidrone-NavigationDataState-DroneQuaternion',
    e =>
      drone.emit('sensor', {
        name: 'quaternion',
        value: formatArguments(e._arguments),
      })
  );

  return drone;
};
