import { Manager } from '@twilio/flex-ui';

import { utils } from '../helpers';

class RecordingService {
  manager = Manager.getInstance();

  serverlessDomain = process.env.REACT_APP_SERVERLESS_DOMAIN;

  buildBody(encodedParams){
    return Object.keys(encodedParams).reduce((result, paramName,idx) => {
      if(encodedParams[paramName] === undefined) {
        return result;
      }
      if(idx > 0){
        return `${result}&${paramName}=${encodedParams[paramName]}`;
      }
      return `${paramName}=${encodedParams[paramName]}`;
    }, '')
  }

  getTranscription = (transcriptionSid) => {
    const encodedParams = {
      Token: encodeURIComponent(this.manager.user.token),
      transcriptionSid
    };
  
    return utils.fetchJsonWithReject(
      `https://${this.serverlessDomain}/fetch-recording-transcription`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: this.buildBody(encodedParams)
      }
    );
  };

  getMediaUrl = (recordingSid) => {
    const credentials = Buffer.from(`token:${this.manager.user.token}`).toString('base64');

    return utils.fetchJsonWithReject(
      `https://voice.twilio.com/v1/Recordings/${recordingSid}/MediaUrl`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        }
      }
    )
  }
}

export default new RecordingService();
