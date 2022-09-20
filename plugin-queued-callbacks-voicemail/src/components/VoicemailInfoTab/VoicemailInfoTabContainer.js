import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { namespace } from '../../states';
import { Actions } from '../../states/VoicemailState';
import VoicemailComponent from './VoicemailInfoTab';

const mapStateToProps = (state, props) => {
  const voicemailTranscriptions = state[namespace]?.voicemail?.transcriptions;
  const transcriptionSid = props?.task?.attributes?.transcriptionSid;
  const transcription = voicemailTranscriptions?.get(transcriptionSid);

  return {
    taskList: state.flex?.worker?.tasks,
    transcription
  }
};

const mapDispatchToProps = (dispatch) => ({
  setTranscription: bindActionCreators(Actions.setTranscription, dispatch)
});

export default connect(mapStateToProps, mapDispatchToProps)(VoicemailComponent);
