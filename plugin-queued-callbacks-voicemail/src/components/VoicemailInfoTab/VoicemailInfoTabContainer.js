import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { namespace } from '../../states';
import { Actions as VoicemailActions } from '../../states/VoicemailState';
import VoicemailComponent from './VoicemailInfoTab';

const mapStateToProps = (state, props) => {
  const voicemailTranscriptions = state[namespace]?.voicemail?.transcriptions;
  const transcriptionSid = props?.task?.attributes?.transcriptionSid;
  const transcription = voicemailTranscriptions?.get(transcriptionSid);

  const voicemailRecordings = state[namespace]?.voicemail?.recordings;
  const recordingSid = props?.task?.attributes?.recordingSid;
  const recording = voicemailRecordings?.get(recordingSid);

  return {
    taskList: state.flex?.worker?.tasks,
    transcription,
    recording
  }
};

const mapDispatchToProps = (dispatch) => ({
  setTranscription: bindActionCreators(VoicemailActions.setTranscription, dispatch),
  setRecordingMediaUrl: bindActionCreators(VoicemailActions.setRecordingMediaUrl, dispatch)
});

export default connect(mapStateToProps, mapDispatchToProps)(VoicemailComponent);
