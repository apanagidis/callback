module.exports = {
  sayOptions: { voice: 'Polly.Joanna' },
  holdMusicUrl: 'assets/guitar_music.mp3',
  // Enable Estimated Waiting Time in voice prompt
  getEwt: false,
  //  Time interval (minutes) for Estimated Waiting Time stats
  statPeriod: 5,
  // Enable Queue Position in voice prompt
  getQueuePosition: false,
  // Agent audible alert sound file for voice mail
  VoiceMailAlertTone: '/assets/alertTone.mp3',
  // Agent audible alert sound file for callback call
  CallbackAlertTone: '/assets/alertTone.mp3',
  // Timezone configuration
  TimeZone: 'America/Los_Angeles',
};
