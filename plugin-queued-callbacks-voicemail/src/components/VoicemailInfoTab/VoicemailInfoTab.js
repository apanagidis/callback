import React from 'react';
import { Actions, Button, TaskHelper } from '@twilio/flex-ui';
import moment from 'moment';
import 'moment-timezone';
import { Label } from '@twilio-paste/core/label';
import { TextArea } from '@twilio-paste/core/textarea'
import { Grid, Column } from '@twilio-paste/core/grid';
import { Stack } from '@twilio-paste/core/stack';

import { 
  ButtonsContainer,
  Container,
  DetailsContainer,
  PlayerContainer,
  Player,
  TranscriptContainer
} from './VoicemailInfoTab.Components';
import RecordingService from '../../services/RecordingService';

export default class VoicemailInfoTab extends React.Component {
  static displayName = 'VoicemailInfoTab';

  constructor(props) {
    super(props);

    this.state = {
      recordingUrl: null,
      recordingError: null
    }
  }

  async componentDidMount() {
    const { setTranscription, task, transcription } = this.props;

    if (transcription && this.state.recordingUrl) {
      return;
    }

    const attributes = task?.attributes;
    const recordingSid = attributes?.recordingSid;
    const transcriptionSid = attributes?.transcriptionSid;

    if (recordingSid && !this.state.recordingUrl) {
      try {
        const recordingMedia = await RecordingService.getMediaUrl(recordingSid);
        this.setState({ recordingUrl: recordingMedia.media_url });
      } catch (error) {
        console.error('Error getting recording media URL.', error);
        this.setState({ recordingError: error.message });
      }
    }

    if (transcriptionSid && !transcription) {
      try {
        const response = await RecordingService.getTranscription(transcriptionSid);
        setTranscription(transcriptionSid, response.transcription);
      } catch (error) {
        console.error(`Error getting transcription for SID ${transcriptionSid}.`, error);
        setTranscription(transcriptionSid, { error });
      }
    }
  }

  startCall = async () => {
    const { queueSid, attributes, sid: reservationSid } = this.props.task;
    const { to, from, conversations } = attributes;

    //  place outbound call using Flex DialPad API
    await Actions.invokeAction('StartOutboundCall', {
      destination: to,
      queueSid,
      callerId: from,
      taskAttributes: {
        voicemailReservationSid: reservationSid,
        conversations: {
          ...conversations,
          communication_channel: 'Call',
        }
      }
    });
  };

  saveVoicemail = async () => {
    const { task } = this.props;
    const attributes = task?.attributes || {};
    const { conversations, recordingUrl } = attributes;

    const newAttributes = {
      ...attributes,
      conversations: {
        ...conversations,
        segment_link: recordingUrl
      }
    };

    await task.setAttributes(newAttributes);
  }

  hasPlacedCall = () => {
    const taskList = this.props.taskList || new Map();

    for (const task of taskList.values()) {
      if (TaskHelper.isOutboundCallTask(task) &&
        task.attributes.outbound_to === this.props.task.attributes.to
      ) {
        return true;
      }
    }

    return false;
  }

  hasSavedVoicemail = () => {
    const { task } = this.props;
    const attributes = task?.attributes || {};
    const { conversations, recordingUrl } = attributes;
    const segment_link = conversations?.segment_link;

    return segment_link && segment_link === recordingUrl;
  }

  render() {
    const { task, transcription } = this.props;
    const attributes = task?.attributes;
    const timeReceived = moment(attributes?.callTime.time_recvd);
    const localTz = moment.tz.guess();
    const localTimeShort = timeReceived.tz(localTz).format('MM-D-YYYY, h:mma z');

    const transcriptionText = transcription?.transcriptionText;
    const transcriptionErrorMessage = transcription?.error?.message && (
      'Transcript error. Notify your System Administrator. Error message: ' +
      transcription?.error?.message
    );
    const recordingUrl = attributes?.recordingUrl;

    return (
      <Container>
        <ButtonsContainer>
          <Stack orientation="horizontal" spacing="space30">
            <Button
              //style={styles.cbButton}
              variant="primary"
              onClick={this.startCall}
              disabled={this.hasPlacedCall()}
            >
              Call Contact
            </Button>
            <Button
              //style={styles.cbButton}
              variant="secondary"
              onClick={this.saveVoicemail}
              disabled={this.hasSavedVoicemail()}
            >
              Save Voicemail
            </Button>
          </Stack>
          
        </ButtonsContainer>
        <Label>Play Voicemail</Label>
        <PlayerContainer>
          <Player ref="audio_tag" src={this.state.recordingUrl} controls />
        </PlayerContainer>
        <TranscriptContainer>
          <Label>Voicemail Transcript</Label>
          <TextArea
            id="voicemail-transcript"
            readOnly
            value={transcriptionText || transcriptionErrorMessage}
            hasError={!!transcriptionErrorMessage}
          />
        </TranscriptContainer>
        <DetailsContainer>
          <Label>Voicemail Details</Label>
          <Grid>
            <Column>
              <Stack orientation="vertical" spacing="space20">
                <span>Contact Phone:</span>
                <span>Time of Voicemail:</span>
              </Stack>
            </Column>
            <Column>
              <Stack orientation="vertical" spacing="space20">
                <span>{attributes.to}</span>
                <span>{localTimeShort}</span>
              </Stack>
            </Column>
          </Grid>
        </DetailsContainer>
      </Container>
    );
  }
}
