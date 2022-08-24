/*
 *Synopsis:  This function provides complete handling of Flex In-Queue Voicemail capabilities to include:
 *    1. request to leave a voicemail with callback to originating ANI
 *
 *Voicemail tasks are created and linked to the originating call (Flex Insights reporting). The flex plugin provides
 *a UI for management of the voicemail request including a re-queueing capability.
 *
 *name: voicemail-menu
 *path: /voicemail-menu
 *private: CHECKED
 *
 *Function Methods (mode)
 * - pre-process          => main entry point for queue-back voicemail flow (redirect call, getTask, cancel Task)
 * - main                 => process main menu DTMF selection
 * - success              => menu initiating new number capture
 * - submitVoicemail      => create voicemail task
 *
 *Customization:
 * - Set TTS voice option
 * - Set initial priority of callback task (default: 50)
 * - Set timezone configuration ( server_tz )
 *
 *Install/Config: See documentation
 *
 *Last Updated: 03/27/2020
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

// create the voicemail task
async function createVoicemailTask(event, client, taskInfo, ringback) {
  const time = getTime(options.TimeZone);

  const taskAttributes = {
    taskType: 'voicemail',
    ringback,
    to: event.Caller, // Inbound caller
    direction: 'inbound',
    name: `Voicemail: ${event.Caller}`,
    from: event.Called, // Twilio Number
    recordingUrl: event.RecordingUrl,
    recordingSid: event.RecordingSid,
    transcriptionSid: event.TranscriptionSid,
    transcriptionText: event.TranscriptionStatus === 'completed' ? event.TranscriptionText : 'Transcription failed',
    callTime: time,
    queueTargetName: taskInfo.taskQueueName,
    queueTargetSid: taskInfo.taskQueueSid,
    workflowTargetSid: taskInfo.workflowSid,
    // eslint-disable-next-line camelcase
    ui_plugin: {
      vmCallButtonAccessibility: false,
      vmRecordButtonAccessibility: true,
    },
    placeCallRetry: 1,
  };

  try {
    await client.taskrouter.workspaces(taskInfo.workspaceSid).tasks.create({
      attributes: JSON.stringify(taskAttributes),
      type: 'voicemail',
      taskChannel: 'voicemail',
      priority: options.VoiceMailTaskPriority,
      workflowSid: taskInfo.workflowSid,
    });
  } catch (error) {
    console.log('createVoicemailTask Error');
    handleError(error);
  }
}

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const twiml = new Twilio.twiml.VoiceResponse();
  const domain = context.DOMAIN_NAME;

  const {
    CallSid,
    mode,
    taskSid
  } = event;

  let queryParams;

  // Load options
  const { sayOptions, VoiceMailAlertTone } = options;

  // main logic for callback methods
  switch (mode) {
    case 'pre-process': {
      //  initial logic to cancel the task and prepare the call for Recording
      //  Get taskSid based on taskSid or CallSid
      if (!taskSid) {
        //TODO: Review this to see if it needs to change
        const taskInfo = await getTask(context, CallSid);
        ({ taskSid } = taskInfo);
      }

      // Redirect Call to Voicemail main menu
      queryParams = {
        mode: 'main',
        ...(taskSid && { taskSid })
      };
      const redirectUrl = urlBuilder(domain, webhookPaths.voicemailMenu, queryParams);
      try {
        await client.calls(CallSid).update({ method: 'POST', url: redirectUrl });
      } catch (error) {
        console.log('updateCall Error');
        handleError(error);
      }

      //  Cancel (update) the task given taskSid
      await cancelTask(client, context.TWILIO_WORKSPACE_SID, taskSid);

      return callback(null, '');
    }
    case 'main': {
      //  Main logic for Recording the voicemail
      const actionQueryParams = {
        mode: 'success',
        CallSid
      };
      const transcribeQueryParams = {
        mode: 'submitVoicemail',
        CallSid
      };
      twiml.say(sayOptions, 'Please leave a message at the tone.  Press the star key when finished.');
      twiml.record({
        action: urlBuilder(domain, webhookPaths.voicemailMenu, actionQueryParams),
        transcribeCallback: urlBuilder(domain, webhookPaths.voicemailMenu, transcribeQueryParams),
        method: 'GET',
        playBeep: 'true',
        transcribe: true,
        timeout: 10,
        finishOnKey: '*',
      });
      twiml.say(sayOptions, 'I did not capture your recording');
      return callback(null, twiml);
    }
    case 'success': {
      //  End the voicemail interaction - hang up call
      twiml.say(sayOptions, 'Your voicemail has been successfully received... goodbye');
      twiml.hangup();
      return callback(null, twiml);
    }
    case 'submitVoicemail': {
      /*
       *  handler to submit the callback
       *  create the task here
       */
      /*
       *  Steps
       *  1. Fetch TaskSid ( read task w/ attribute of call_sid);
       *  2. Update existing task (assignmentStatus==>'canceled'; reason==>'callback requested' )
       *  3. Create new task ( callback );
       *  4. Hangup callback
       *
       *  main callback logic
       */
      const taskInfo = await getTask(context, taskSid || CallSid);
      // TODO: handle error in getTask

      //  create the Voicemail task
      const ringBackUrl = VoiceMailAlertTone.startsWith('https://') ? VoiceMailAlertTone : domain + VoiceMailAlertTone;
      await createVoicemailTask(event, client, taskInfo, ringBackUrl);
      return callback(null, '');
    }
    default: {
      return callback(500, 'Mode not specified');
    }
  }
};
