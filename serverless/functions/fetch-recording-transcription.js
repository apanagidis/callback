const { random } = require('lodash');
const TokenValidator = require('twilio-flex-token-validator').functionValidator;

exports.handler = TokenValidator(async function (context, event, callback) {
  const response = new Twilio.Response();

  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS POST');
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

  const getRecordingTranscription = async (transcriptionSid, attempts) => {
    try {
      const client = context.getTwilioClient();
      const transcription = await client.transcriptions(transcriptionSid).fetch();

      return {
        success: true,
        status: 200,
        transcription: {
          dateCreated: transcription.dateCreated,
          duration: transcription.duration,
          sid: transcription.sid,
          status: transcription.status,
          transcriptionText: transcription.transcriptionText,
          type: transcription.type,
        }
      }
    } catch (error) {
      if (error && 
        error.response && 
        error.response.stats == 429 && 
        attempts < context.TWILIO_SERVICE_RETRY_LIMIT
      ){
        const waitTime = random(context.TWILIO_SERVICE_MIN_BACKOFF, context.TWILIO_SERVICE_MAX_BACKOFF);
        await snooze(waitTime);
        return getRecordingTranscription(transcriptionSid, attempts + 1);
      }
      else {
        return { success: false, message: error, status: error.response.status };
      }
    }
  }

  try {
    const result = await getRecordingTranscription(event.transcriptionSid, 0);
    response.setStatusCode(result.status);
    response.setBody(result);
  } catch (error) {
    console.log(error);
    response.setStatusCode(500);
    response.setBody({ success: false, status: 500, message: error.message });
  }

  return callback(null, response);
});
