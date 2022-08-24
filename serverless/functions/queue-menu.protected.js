/*
 *Synopsis:  This function provides complete handling of Flex In-Queue Voicemail capabilities to include:
 *    1. request to leave a voicemail with callback to originating ANI
 *
 *Voicemail tasks are created and linked to the originating call (Flex Insights reporting). The flex plugin provides
 *a UI for management of the voicemail request including a re-queueing capability.
 *
 *name: util_inQueueMenuMain
 *path: /queue-menu
 *private: CHECKED
 *
 *Function Methods (mode)
 * - main                 => present menu for in-queue main menu options
 * - mainProcess          => present menu for main menu options (1=>Stay Queue; 2=>Callback; 3=>Voicemail)
 * - menuProcess          => process DTMF for redirect to supporting functions (Callback, voicemail)
 *
 *Customization:
 * - Set TTS voice option
 * - Set hold music path to ASSET resource (trimmed 30 seconds source)
 *
 *Install/Config: See documentation
 *
 *Last Updated: 03/27/2020
 */
const moment = require('moment');

const helpersPath = Runtime.getFunctions().helpers.path;
const { getTask, handleError, urlBuilder } = require(helpersPath);
const optionsPath = Runtime.getFunctions().options.path;
const options = require(optionsPath);

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity, func-names
exports.handler = async function (context, event, callback) {
  const domain = `https://${context.DOMAIN_NAME}`;
  const twiml = new Twilio.twiml.VoiceResponse();

  // Retrieve options
  const { sayOptions, holdMusicUrl, getEwt, getQueuePosition } = options;

  // Retrieve event arguments
  const {
    isCallbackEnabled,
    isVoicemailEnabled,
    mode,
    taskSid
  } = event;

  // String constants
  const webhookPaths = {
    callbackMenu: 'callback-menu',
    queueMenu: 'queue-menu',
    voicemailMenu: 'voicemail-menu'
  }

  // Variables initialization
  let message = '';
  let gather;

  // Variables for EWT/PositionInQueue
  let waitMsg = '';
  let posQueueMsg = '';

  const createWebhookUrl = (path, parameters = {}) => {
    let webhookUrl = `${domain}/${path}`;

    if (Object.keys(parameters).length > 0) {
      webhookUrl += '?';

      for (const key in parameters) {
        webhookUrl += `${key}=${parameters[key]}&`;
      }

      if (webhookUrl.endsWith('&')) {
        webhookUrl = webhookUrl.slice(0, -1);
      }
    }

    return webhookUrl;
  }

  /*
   *  ==========================
   *  BEGIN:  Main logic
   */
  switch (mode) {
    case 'main':
      //  logic for retrieval of Estimated Wait Time
      if (getEwt) {
        //  Get average task acceptance time for TaskQueue
        const ewt = undefined /* TODO: Retrieve EWT from custom service that
          caches average task acceptance time per queue. Developer will need
          to pass the target TaskQueue SID as a "waitUrl" query parameter
        */

        /* TODO: Modify the switch statement to play the desired messaging
          based on the fetched EWT value
        */
        let waitTts = '';
        switch (ewt) {
          case 0:
            waitTts = 'less than a minute...';
            break;
          case 4:
            waitTts = 'more than 4 minutes...';
            break;
          default:
            waitTts = `less than ${ewt + 1}  minutes...`;
        }

        waitMsg += `The estimated wait time is ${waitTts} ....`;
      }

      //  Logic for Position in Queue
      if (getQueuePosition) {
        const taskPositionInfo = undefined /* TODO: Implement scalable logic to retrieve
          the task's position in queue since polling all pending Tasks for each inbound
          queue call will add significant load to API concurrency
        */

        /* TODO: Modify the switch statement to play the desired messaging
          based on the fetched position in queue value
        */
        switch (taskPositionInfo.position) {
          case 0:
            posQueueMsg = 'Your call is next in queue.... ';
            break;
          case 1:
            posQueueMsg = 'There is one caller ahead of you...';
            break;
          case -1:
            posQueueMsg = 'There are more than 20 callers ahead of you...';
            break;
          default:
            posQueueMsg = `There are ${taskPositionInfo.position} callers ahead of you...`;
            break;
        }
      }

      if (event.skipGreeting !== 'true') {
        let initGreeting = waitMsg + posQueueMsg;
        initGreeting += '...Please wait while we direct your call to the next available specialist...';
        twiml.say(sayOptions, initGreeting);
      }
      if (isCallbackEnabled || isVoicemailEnabled) {
        message = 'To listen to a menu of options while on hold, press 1 at anytime.';
        gather = twiml.gather({
          input: 'dtmf',
          timeout: '2',
          action: ``,
        });
        gather.say(sayOptions, message);
        gather.play(domain + holdMusicUrl);
        twiml.redirect(createWebhookUrl());
        return callback(null, twiml);
      }
    case 'mainProcess':
      if (event.Digits === '1') {
        message = 'The following options are available...';
        message += 'Press 1 to remain on hold...';
        message += 'Press 2 to request a callback...';
        message += 'Press 3 to leave a voicemail message for the care team...';
        message += 'Press the star key to listen to these options again...';

        gather = twiml.gather({
          input: 'dtmf',
          timeout: '1',
          action: `${domain}/queue-menu?mode=menuProcess${taskSid ? `&taskSid=${taskSid}` : ''}`,
        });
        gather.say(sayOptions, message);
        gather.play(domain + holdMusicUrl);
        twiml.redirect(`${domain}/queue-menu?mode=main${taskSid ? `&taskSid=${taskSid}` : ''}`);
        return callback(null, twiml);
      }
      twiml.say(sayOptions, 'I did not understand your selection.');
      twiml.redirect(`${domain}/queue-menu?mode=main&skipGreeting=true${taskSid ? `&taskSid=${taskSid}` : ''}`);
      return callback(null, twiml);
      break;
    case 'menuProcess':
      switch (event.Digits) {
        //  stay in queue
        case '1':
          /*
           *   stay in queue
           * twiml.say(sayOptions, 'Please wait for the next available agent');
           */
          twiml.redirect(`${domain}/queue-menu?mode=main&skipGreeting=true${taskSid ? `&taskSid=${taskSid}` : ''}`);
          return callback(null, twiml);
          break;
        //  request a callback
        case '2':
          twiml.redirect(`${domain}/inqueue-callback?mode=main${taskSid ? `&taskSid=${taskSid}` : ''}`);
          return callback(null, twiml);
          break;
        //  leave a voicemail
        case '3':
          twiml.redirect(`${domain}/inqueue-voicemail?mode=pre-process${taskSid ? `&taskSid=${taskSid}` : ''}`);
          return callback(null, twiml);
          break;

        // listen options menu again
        case '*':
          twiml.redirect(`${domain}/queue-menu?mode=mainProcess&Digits=1${taskSid ? `&taskSid=${taskSid}` : ''}`);
          return callback(null, twiml);
          break;

        //  listen to menu again
        default:
          twiml.say(sayOptions, 'I did not understand your selection.');
          twiml.redirect(`${domain}/queue-menu?mode=mainProcess&Digits=1${taskSid ? `&taskSid=${taskSid}` : ''}`);
          return callback(null, twiml);
          break;
      }
      break;
    default:
      return callback(500, null);
      break;
  }
};
