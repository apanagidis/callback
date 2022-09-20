const ACTION_SET_TRANSCRIPTION = 'SET_TRANSCRIPTION';
const ACTION_DELETE_TRANSCRIPTION = 'DELETE_TRANSCRIPTION';

const initialState = {
  transcriptions: new Map()
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
    default: {
      return state;
    }
  }
}
