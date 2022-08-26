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
const {
  getTask,
  handleError,
  urlBuilder,
  webhookPaths
} = require(helpersPath);
const optionsPath = Runtime.getFunctions().options.path;
const options = require(optionsPath);

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity, func-names
exports.handler = async function (context, event, callback) {
  const domain = context.DOMAIN_NAME
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

  // Variables initialization
  let message = '';
  let gather;
  const digitMap = isCallbackEnabled && isVoicemailEnabled
    ? { 
      callbackDigit: '2',
      voicemailDigit: '3'
    }
    : isCallbackEnabled
      ? {
        callbackDigit: '2'
      }
      : isVoicemailEnabled
        ? {
          voicemailDigit: '2'
        }
        : {}

  // Variables for EWT/PositionInQueue
  let waitMsg = '';
  let posQueueMsg = '';

  const generateQueryParams = (parameters = {}) => {
    return {
      ...(taskSid && { taskSid }),
      ...(isCallbackEnabled && { isCallbackEnabled }),
      ...(isVoicemailEnabled && { isVoicemailEnabled }),
      ...parameters
    };
  }

  /*
   *  ==========================
   *  BEGIN:  Main logic
   */
  switch (mode) {
    case 'main': {
      if (getEwt) {
        //  logic for retrieval of Estimated Wait Time
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
          case 0: {
            waitTts = 'less than a minute...';
            break;
          }
          case 4: {
            waitTts = 'more than 4 minutes...';
            break;
          }
          default: {
            waitTts = `less than ${ewt + 1}  minutes...`;
          }
        }

        waitMsg += `The estimated wait time is ${waitTts} ....`;
      }

      if (getQueuePosition) {
        //  Logic for Position in Queue
        const taskPositionInfo = undefined /* TODO: Implement scalable logic to retrieve
          the task's position in queue since polling all pending Tasks for each inbound
          queue call will add significant load to API concurrency
        */

        /* TODO: Modify the switch statement to play the desired messaging
          based on the fetched position in queue value
        */
        switch (taskPositionInfo.position) {
          case 0: {
            posQueueMsg = 'Your call is next in queue.... ';
            break;
          }
          case 1: {
            posQueueMsg = 'There is one caller ahead of you...';
            break;
          }
          case -1: {
            posQueueMsg = 'There are more than 20 callers ahead of you...';
            break;
          }
          default: {
            posQueueMsg = `There are ${taskPositionInfo.position} callers ahead of you...`;
            break;
          }
        }
      }

      if (event.skipGreeting !== 'true') {
        let initGreeting = waitMsg + posQueueMsg;
        initGreeting += '...Please wait while we direct your call to the next available specialist...';
        twiml.say(sayOptions, initGreeting);
      }
      if (isCallbackEnabled || isVoicemailEnabled) {
        message = 'To listen to a menu of options while on hold, press 1 at anytime.';
        const actionQueryParams = generateQueryParams({
          mode: 'mainProcess'
        });
        gather = twiml.gather({
          input: 'dtmf',
          numDigits: 1,
          timeout: '2',
          action: urlBuilder(domain, webhookPaths.queueMenu, actionQueryParams),
        });
        gather.say(sayOptions, message);
        gather.play(urlBuilder(domain, holdMusicUrl));
        const redirectQueryParams = generateQueryParams({
          mode: 'main'
        });
        twiml.redirect(urlBuilder(domain, webhookPaths.queueMenu, redirectQueryParams));
      } else {
        twiml.play(urlBuilder(domain, holdMusicUrl))
        const redirectQueryParams = generateQueryParams({
          mode: 'main',
          skipGreeting: 'true'
        });
        twiml.redirect(urlBuilder(domain, webhookPaths.queueMenu, redirectQueryParams));
      }
      return callback(null, twiml);
    }
    case 'mainProcess': {
      if (event.Digits === '1') {
        message = 'The following options are available...';
        message += 'Press 1 to remain on hold...';
        message += isCallbackEnabled ? `Press ${digitMap.callbackDigit} to request a callback...` : '';
        message += isVoicemailEnabled ? `Press ${digitMap.voicemailDigit} to request a voicemail...` : '';
        message += 'Press the star key to listen to these options again...';

        const actionQueryParams = generateQueryParams({
          mode: 'menuProcess'
        });
        gather = twiml.gather({
          input: 'dtmf',
          numDigits: 1,
          timeout: '1',
          action: urlBuilder(domain, webhookPaths.queueMenu, actionQueryParams),
        });
        gather.say(sayOptions, message);
        gather.play(urlBuilder(domain, holdMusicUrl));
        const redirectQueryParams = generateQueryParams({
          mode: 'main'
        });
        twiml.redirect(urlBuilder(domain, webhookPaths.queueMenu, redirectQueryParams));
        return callback(null, twiml);
      } else {
        twiml.say(sayOptions, 'I did not understand your selection.');
        const redirectQueryParams = generateQueryParams({
          mode: 'main',
          skipGreeting: 'true'
        });
        twiml.redirect(urlBuilder(domain, webhookPaths.queueMenu, redirectQueryParams));
        return callback(null, twiml);
      }
    }
    case 'menuProcess': {
      switch (event.Digits) {
        case '1': {
          //  stay in queue
          /*
           *   stay in queue
           * twiml.say(sayOptions, 'Please wait for the next available agent');
           */
          const redirectQueryParams = generateQueryParams({
            mode: 'main',
            skipGreeting: 'true'
          });
          twiml.redirect(urlBuilder(domain, webhookPaths.queueMenu, redirectQueryParams));
          return callback(null, twiml);
        }
        case digitMap.callbackDigit: {
          //  request a callback
          const redirectQueryParams = generateQueryParams({
            mode: 'main'
          });
          twiml.redirect(urlBuilder(domain, webhookPaths.callbackMenu, redirectQueryParams));
          return callback(null, twiml);
        }
        case digitMap.voicemailDigit: {
          //  leave a voicemail
          const redirectQueryParams = generateQueryParams({
            mode: 'pre-process'
          });
          twiml.redirect(urlBuilder(domain, webhookPaths.voicemailMenu, redirectQueryParams));
          return callback(null, twiml);
        }
        case '*': {
          // listen options menu again
          const redirectQueryParams = generateQueryParams({
            mode: 'mainProcess',
            Digits: '1'
          });
          twiml.redirect(urlBuilder(domain, webhookPaths.queueMenu, redirectQueryParams));
          return callback(null, twiml);
        }
        default: {
          //  listen to menu again
          twiml.say(sayOptions, 'I did not understand your selection.');
          const redirectQueryParams = generateQueryParams({
            mode: 'mainProcess',
            Digits: '1'
          });
          twiml.redirect(urlBuilder(domain, webhookPaths.queueMenu, redirectQueryParams));
          return callback(null, twiml);
        }
      }
    }
    default: {
      return callback(500, null);
    }
  }
};
