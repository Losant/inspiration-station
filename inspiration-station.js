// Load the SDK
const AWS = require('aws-sdk')
const Stream = require('stream')
const Speaker = require('speaker')

var five = require('johnny-five'),
  board, button

var Raspi = require('raspi-io')
var board = new five.Board({
  io: new Raspi()
})

// Create an Polly client
const Polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'us-east-1'
})

// Create the Speaker instance
let Player = new Speaker({
  channels: 1,
  bitDepth: 16,
  sampleRate: 16000
})

var AudioStream = new Stream.Readable()
AudioStream._read = function () {}
AudioStream.pipe(Player)

var Device = require('losant-mqtt').Device

// Construct device.
var device = new Device({
  id: 'device-id',
  key: 'access-key',
  secret: 'access-secret'
})

// Connect to Losant.
device.connect()

// Listen for commands.
device.on('command', function(command) {
  console.log('Command received.')
  console.log(command.name)
  console.log(command.payload)

  speak(command.payload.text, command.payload.voiceId ? command.payload.voiceId : null )
})

board.on('ready', function() {

  // Create a new `button` hardware instance.
  // This example allows the button module to
  // create a completely default instance
  button = new five.Button({
   pin: 'GPIO4',
   isPullup: true
  })

  // Inject the `button` hardware into
  // the Repl instance's context
  // allows direct command line access
  board.repl.inject({
    button: button
  })

  // 'down' the button is pressed
  button.on('down', function() {
    console.log('down')
    device.sendState({ button: true })
  })

})

/**
 * Use Amazon Polly
 * @param  {string} text    Text to speek
 * @param  {string} VoiceId (optional) Amazon Polly Voice
 */
let speak = function(text, VoiceId){
  let params = {
      'Text': text,
      'OutputFormat': 'pcm',
      'VoiceId': (VoiceId || 'Kimberly')
  }

  Polly.synthesizeSpeech(params, (err, data) => {
      if (err) {
          console.log(err.code)
      } else if (data) {
          if (data.AudioStream instanceof Buffer) {
              AudioStream.push(data.AudioStream)
          }
      }
  })
}
