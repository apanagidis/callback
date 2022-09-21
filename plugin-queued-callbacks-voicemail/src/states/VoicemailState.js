const ACTION_SET_TRANSCRIPTION = 'SET_TRANSCRIPTION';
const ACTION_DELETE_TRANSCRIPTION = 'DELETE_TRANSCRIPTION';
const ACTION_SET_RECORDING_MEDIA_URL = 'SET_RECORDING_MEDIA_URL';
const ACTION_DELETE_RECORDING_MEDIA_URL = 'DELETE_RECORDING_MEDIA_URL';

const initialState = {
  transcriptions: new Map(),
  recordings: new Map()
};

export class Actions {
  static setTranscription = (transcriptionSid, transcription) => ({
    type: ACTION_SET_TRANSCRIPTION,
    transcriptionSid,
    transcription
  });

  static deleteTranscription = (transcriptionSid) => ({
    type: ACTION_DELETE_TRANSCRIPTION,
    transcriptionSid
  });

  static setRecordingMediaUrl = (recordingSid, mediaUrl) => ({
    type: ACTION_SET_RECORDING_MEDIA_URL,
    recordingSid,
    mediaUrl
  });

  static deleteRecordingMediaUrl = (recordingSid) => ({
    type: ACTION_DELETE_RECORDING_MEDIA_URL,
    recordingSid
  });
}

export function reduce(state = initialState, action) {
  switch (action.type) {
    case ACTION_SET_TRANSCRIPTION: {
      const { transcriptionSid, transcription } = action;
      const transcriptions = state.transcriptions;
      transcriptions.set(transcriptionSid, transcription)
      return {
        ...state,
        transcriptions
      }
    }
    case ACTION_DELETE_TRANSCRIPTION: {
      const { transcriptionSid } = action;
      const transcriptions = state.transcriptions;
      transcriptions.delete(transcriptionSid);
      return {
        ...state,
        transcriptions
      }
    }
    case ACTION_SET_RECORDING_MEDIA_URL: {
      const { recordingSid, mediaUrl } = action;
      const recordings = state.recordings;
      recordings.set(recordingSid, { mediaUrl });
      return {
        ...state,
        recordings
      }
    }
    case ACTION_DELETE_RECORDING_MEDIA_URL: {
      const { recordingSid } = action;
      const recordings = state.recordings;
      recordings.delete(recordingSid);
      return {
        ...state,
        recordings
      }
    }
    default: {
      return state;
    }
  }
}
