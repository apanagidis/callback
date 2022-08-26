/*
 *Synopsis:  This function provide complete handling of Flex In-Queue Callback capabilities to include:
 *    1. Immediate call-back request to originating ANI ( Press 1), and
 *    2. Request a callback to separate number
 *
 *Callback task are created and linked to the originating call (Flex Insights reporting). The flex plugin provides
 *a UI for management of the callback request including a re-queueing capability.capability
 *
 *name: callback-menu
 *path: /callback-menu
 *private: CHECKED
 *
 *Function Methods (mode)
 * - main             => main entry point for callback flow
 * - mainProcess      => process main menu DTMF selection
 * - newNumber        => menu initiating new number capture
 * - submitCallback   => initiate callback creation ( getTask, cancelTask, createCallback)
 *
 *Customization:
 * - Set TTS voice option
 * - Set initial priority of callback task (default: 50)
 * - Set timezone configuration ( server_tz )
 *
 *Install/Config: See documentation
 *
 *Last Updated: 07/05/2021
 */

const helpersPath = Runtime.getFunctions().helpers.path;
const {
  cancelTask,
  getTask,
  getTime,
  handleError,
  urlBuilder,
  webhookPaths
} = require(helpersPath);
const optionsPath = Runtime.getFunctions().options.path;
const options = require(optionsPath);

// Create the callback task
async function createCallbackTask(client, phoneNumber, taskInfo, ringback) {
  const time = getTime(options.TimeZone);
  const taskAttributes = JSON.parse(taskInfo.data.attributes);

  const newTaskAttributes = {
    type: 'callback',
    ringback,
    to: phoneNumber || taskAttributes.caller,
    direction: 'inbound',
    name: `Callback: ${phoneNumber || taskAttributes.caller}`,
    from: taskAttributes.called,
    callTime: time,
    // eslint-disable-next-line camelcase
    ui_plugin: { cbCallButtonAccessibility: false },
    placeCallRetry: 1,
    conversations: {
      ...taskAttributes.conversations,
      conversation_id: taskInfo.taskSid,
      communication_channel: 'Callback'
    }
  };
  try {
    await client.taskrouter.workspaces(taskInfo.workspaceSid).tasks.create({
      attributes: JSON.stringify(newTaskAttributes),
      type: 'callback',
      taskChannel: 'voice',
      workflowSid: taskInfo.workflowSid,
    });
  } catch (error) {
    console.log('createCallBackTask error');
    handleError(error);
  }
}

function formatPhoneNumber(phoneNumber) {
  if (phoneNumber.startsWith('+')) {
    phoneNumber = phoneNumber.slice(1);
  }
  return phoneNumber.split('').join('..');
}

// eslint-disable-next-line sonarjs/cognitive-complexity
exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const twiml = new Twilio.twiml.VoiceResponse();

  const domain = context.DOMAIN_NAME;

  // Load options
  const { sayOptions, CallbackAlertTone } = options;

  const {
    mode,
    From: PhoneNumberFrom,
    CallSid,
    cbphone: CallbackNumber,
    taskSid,
    isCallbackEnabled,
    isVoicemailEnabled,
  } = event;

  let message = '';
  let queryParams;

  // main logic for callback methods
  switch (mode) {
    //  present main menu options
    case 'main': {
      // main menu
      message = `You have requested a callback at ${formatPhoneNumber(PhoneNumberFrom)}...`;
      message += 'If this is correct, press 1...';
      message += 'Press 2 to be called at a different number';

      queryParams = {
        mode: 'mainProcess',
        cbphone: encodeURI(PhoneNumberFrom),
        ...(taskSid && { taskSid })
      };
      const gatherConfirmation = twiml.gather({
        input: 'dtmf',
        numDigits: 1,
        timeout: '2',
        action: urlBuilder(domain, webhookPaths.callbackMenu, queryParams),
      });
      gatherConfirmation.say(sayOptions, message);
      queryParams = {
        mode: 'main',
        ...(taskSid && { taskSid }),
        ...(isCallbackEnabled && { isCallbackEnabled }),
        ...(isVoicemailEnabled && { isVoicemailEnabled }),
      };

      twiml.redirect(urlBuilder(domain, webhookPaths.queueMenu, queryParams));
      return callback(null, twiml);
    }
    case 'mainProcess': {
      //  process main menu selections
      switch (event.Digits) {
        //  existing number
        case '1': {
          // redirect to submitCallBack
          queryParams = {
            mode: 'submitCallback',
            cbphone: encodeURI(CallbackNumber),
            ...(taskSid && { taskSid })
          };
          twiml.redirect(urlBuilder(domain, webhookPaths.callbackMenu, queryParams));
          return callback(null, twiml);
        }
        case '2': {
          //  new number
          message = 'Using your keypad, enter in your phone number...';
          message += 'Press the pound sign when you are done...';

          queryParams = {
            mode: 'newNumber',
            cbphone: encodeURI(CallbackNumber),
            ...(taskSid && { taskSid })
          };
          const GatherNewNumber = twiml.gather({
            input: 'dtmf',
            timeout: '10',
            finishOnKey: '#',
            action: urlBuilder(domain, webhookPaths.callbackMenu, queryParams),
          });
          GatherNewNumber.say(sayOptions, message);

          queryParams.mode = 'main';
          twiml.redirect(urlBuilder(domain, webhookPaths.callbackMenu, queryParams));
          return callback(null, twiml);
        }
        case '*': {
          queryParams = {
            mode: 'main',
            skipGreeting: true,
            ...(taskSid && { taskSid })
          };
          twiml.redirect(urlBuilder(domain, webhookPaths.callbackMenu, queryParams));
          return callback(null, twiml);
        }
        default: {
          queryParams = {
            mode: 'main',
            ...(taskSid && { taskSid })
          };
          twiml.say(sayOptions, 'I did not understand your selection.');
          twiml.redirect(urlBuilder(domain, webhookPaths.callbackMenu, queryParams));
          return callback(null, twiml);
        }
      }
    }
    case 'newNumber': {
      //  present new number menu selections
      const NewPhoneNumber = event.Digits;
      // TODO: Handle country code in new number

      message = `You entered ${formatPhoneNumber(NewPhoneNumber)} ...`;
      message += 'Press 1 if this is correct...';
      message += 'Press 2 to re-enter your number';
      message += 'Press the star key to return to the main menu';

      queryParams = {
        mode: 'mainProcess',
        cbphone: encodeURI(NewPhoneNumber),
        ...(taskSid && { taskSid })
      };
      const GatherConfirmNewNumber = twiml.gather({
        input: 'dtmf',
        numDigits: 1,
        timeout: '5',
        action: urlBuilder(domain, webhookPaths.callbackMenu, queryParams),
      });
      GatherConfirmNewNumber.say(sayOptions, message);

      queryParams.mode = 'main';
      twiml.redirect(urlBuilder(domain, webhookPaths.callbackMenu, queryParams));
      return callback(null, twiml);
    }
    case 'submitCallback': {
      //  handler to submit the callback
      /*
       *  Steps
       *  1. Fetch TaskSid ( read task w/ attribute of call_sid);
       *  2. Update existing task (assignmentStatus==>'canceled'; reason==>'callback requested' )
       *  3. Create new task ( callback );
       *  4. Hangup callback
       *
       *  main callback logic
       *  get taskSid based on callSid
       *  taskInfo = { "sid" : <taskSid>, "queueTargetName" : <taskQueueName>, "queueTargetSid" : <taskQueueSid> };
       */
      console.log('callback-menu, event taskSid:', taskSid);
      console.log('callback-menu, event CallSid:', CallSid);
      const taskInfo = await getTask(context, taskSid || CallSid);

      // Cancel current Task
      await cancelTask(client, context.TWILIO_WORKSPACE_SID, taskInfo.taskSid, 'Callback Requested', taskInfo.data.attributes);
      // Create the callback task
      const ringBackUrl = CallbackAlertTone.startsWith('https://') ? CallbackAlertTone : domain + CallbackAlertTone;
      await createCallbackTask(client, CallbackNumber, taskInfo, ringBackUrl);

      //  hangup the call
      twiml.say(sayOptions, 'Your callback request has been delivered...');
      twiml.say(sayOptions, 'An available care specialist will reach out to contact you...');
      twiml.say(sayOptions, 'Thank you for your call.');
      twiml.hangup();
      return callback(null, twiml);
    }
    default: {
      return callback(500, 'Mode not specified');
    }
  }
};
