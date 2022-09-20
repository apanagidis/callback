export const registerListeners = (flex, manager) => {
  manager.events.addListener('taskAccepted', task => {
    const { type } = task.attributes;

    if (type === 'callback') {
      const { attributes, queueSid } = task;
      const { conversations, from, to } = attributes;

      if (conversations?.conversation_attribute_6) {
        // Removing old call SID for original inbound call
        delete conversations.conversation_attribute_6;
      }

      flex.Actions.invokeAction('StartOutboundCall', {
        callerId: from,
        destination: to,
        queueSid,
        taskAttributes: {
          callbackReservationSid: task.sid,
          conversations: {
            ...conversations,
            communication_channel: 'Call',
          }
        }
      });
    }
  });

  const getMatchingCallbackTask = (task) => {
    const { callbackReservationSid } = task.attributes;

    return callbackReservationSid
      ? flex.TaskHelper.getTaskByTaskSid(callbackReservationSid)
      : undefined;
  }

  const getMatchingVoicemailTask = (task) => {
    const { voicemailReservationSid } = task.attributes;

    return voicemailReservationSid
      ? flex.TaskHelper.getTaskByTaskSid(voicemailReservationSid)
      : undefined;
  }

  manager.events.addListener('taskWrapup', task => {
    if (!flex.TaskHelper.isOutboundCallTask(task)) {
      return;
    }

    const callbackTask = getMatchingCallbackTask(task);
    const voicemailTask = getMatchingVoicemailTask(task);

    if (callbackTask) {
      flex.Actions.invokeAction('WrapupTask', { task: callbackTask });
    } else if (voicemailTask) {
      flex.Actions.invokeAction('WrapupTask', { task: voicemailTask });
    }
  })

  manager.events.addListener('taskCompleted', async task => {
    if (!flex.TaskHelper.isOutboundCallTask(task)) {
      return;
    }

    const callbackTask = getMatchingCallbackTask(task);
    const voicemailTask = getMatchingVoicemailTask(task);

    let payload = {};
    if (callbackTask) {
      payload.task = callbackTask;
    } else if (voicemailTask) {
      payload.task = voicemailTask;
    } else {
      return;
    }

    const pendingCompleteTask = flex.Actions.findPendingActions('CompleteTask', payload);
    console.debug('taskCompleted, pending CompleteTask action:', pendingCompleteTask);

    if (!pendingCompleteTask || Object.keys(pendingCompleteTask)?.length === 0) {
      flex.Actions.invokeAction('CompleteTask', payload);
    } else {
      await pendingCompleteTask[0];
      flex.Actions.invokeAction('CompleteTask', payload);
    }
  });
};
