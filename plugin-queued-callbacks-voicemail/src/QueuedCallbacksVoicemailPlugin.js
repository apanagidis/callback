import { VERSION, TaskHelper } from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';
import React from 'react';
import VoicemailIcon from '@material-ui/icons/Voicemail';
import { ChevronDoubleRightIcon } from '@twilio-paste/icons/esm/ChevronDoubleRightIcon';

import reducers, { namespace } from './states';
import { registerListeners } from './listeners';
import { VoicemailComponent } from './components';

const PLUGIN_NAME = 'QueuedCallbacksVoicemailPlugin';

export default class QueuedCallbacksVoicemailPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  async init(flex, manager) {
    this.registerReducers(manager);
    registerListeners(flex, manager);

    this.registerCallbackChannel(flex, manager);
    //this.registerVoicemailChannel(flex, manager);

    manager.strings.TaskAssigned = "Assigned | {{helper.durationSinceUpdate}}"
    manager.strings.TaskWrapup = "Wrap up | {{helper.durationSinceUpdate}}";
  }

  /**
   * Registers the {@link CallbackComponent}
   */
  registerCallbackChannel(flex, manager) {
    // Create Callback Channel
    
    const CallbackChannel = flex.DefaultTaskChannels.createDefaultTaskChannel(
      'callback',
      (task) => task.taskChannelUniqueName === 'voice' && task.attributes.type === 'callback',
      'CallbackIcon',
      'CallbackIcon',
      'palegreen',
    );
    // Basic Callback Channel Settings
    CallbackChannel.templates.TaskListItem.firstLine = (task) => `${task.attributes.name}`;
    CallbackChannel.templates.TaskCanvasHeader.title = (task) => `${task.attributes.name}`;
    CallbackChannel.templates.TaskCanvasHeader.endButton.Wrapping = 'Complete';
    CallbackChannel.templates.IncomingTaskCanvas.firstLine = (task) => task.queueName;
    // Lead Channel Icon
    const callbackChannelTaskItemIcon = (
      <React.Fragment>
        <ChevronDoubleRightIcon decorative={true} />
      </React.Fragment>
    );
    CallbackChannel.icons.active = callbackChannelTaskItemIcon;
    CallbackChannel.icons.list = callbackChannelTaskItemIcon;
    CallbackChannel.icons.main = callbackChannelTaskItemIcon;

    // Modified Components
    const hasMatchingOutboundCallTask = (props) => {
      const taskAttributes = props.task.attributes;
      const conversationId = taskAttributes?.conversations?.conversation_id;
      const workerTasks = manager.store.getState().flex?.worker?.tasks || new Map();

      let result = false;

      for (const task of workerTasks.values()) {
        if (TaskHelper.isOutboundCallTask(task) &&
          conversationId === task?.attributes?.conversations?.conversation_id
        ) {
          result = true;
          break;
        }
      }

      return result;
    };
    CallbackChannel.removedComponents = [{
      target: 'TaskCanvasHeader',
      key: 'actions',
      options: {
        if: hasMatchingOutboundCallTask
      }
    }];
    // Register Lead Channel
    flex.TaskChannels.register(CallbackChannel);
  }

  /**
   * Registers the {@link VoicemailComponent}
   */
  registerVoicemailChannel(flex, manager) {
    const VoiceMailChannel = flex.DefaultTaskChannels.createDefaultTaskChannel(
      'voicemail',
      (task) => task.taskChannelUniqueName === 'voice' && task.attributes.type === 'voicemail',
      'VoicemailIcon',
      'VoicemailIcon',
      'deepskyblue',
    );
    // Basic Voicemail Channel Settings
    VoiceMailChannel.templates.TaskListItem.firstLine = (task) => `${task.queueName}: ${task.attributes.name}`;
    VoiceMailChannel.templates.TaskCanvasHeader.title = (task) => `${task.queueName}: ${task.attributes.name}`;
    VoiceMailChannel.templates.IncomingTaskCanvas.firstLine = (task) => task.queueName;
    // Lead Channel Icon
    VoiceMailChannel.icons.active = <VoicemailIcon key="active-voicemail-icon" />;
    VoiceMailChannel.icons.list = <VoicemailIcon key="list-voicemail-icon" />;
    VoiceMailChannel.icons.main = <VoicemailIcon key="main-voicemail-icon" />;
    // Register Lead Channel
    flex.TaskChannels.register(VoiceMailChannel);

    flex.TaskInfoPanel.Content.replace(<VoicemailComponent key="voicemail-task-info-panel" manager={manager} />, {
      sortOrder: -1,
      if: (props) => props.task.attributes.type === 'voicemail',
    });
  }

  /**
   * Registers the plugin reducers
   *
   * @param manager { Flex.Manager }
   */
  registerReducers(manager) {
    if (!manager.store.addReducer) {
      // eslint: disable-next-line
      console.error(`You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`);
      return;
    }

    //  add the reducers to the manager store
    manager.store.addReducer(namespace, reducers);
  }
}
