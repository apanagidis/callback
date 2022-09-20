import { combineReducers } from 'redux';

//  define the Redux reducers
import { reduce as InQueueMessagingReducer } from './ActionInQueueMessagingState';
import { reduce as VoicemailReducer } from './VoicemailState';

// Register your redux store under a unique namespace
export const namespace = 'callback-voicemail';

/*
 * Combine the reducers
 * define redux store identifier (InQueueMessaging)
 *  Store:  state[<namespace>].<identifier>.{state object}
 */
export default combineReducers({
  voicemail: VoicemailReducer,
});
