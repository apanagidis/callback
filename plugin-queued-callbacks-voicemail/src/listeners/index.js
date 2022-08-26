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

  manager.events.addListener('taskWrapup', task => {
    if (!flex.TaskHelper.isOutboundCallTask(task)) {
      return;
    }

    const callbackTask = getMatchingCallbackTask(task);

    if (callbackTask) {
      flex.Actions.invokeAction('WrapupTask', { task: callbackTask });
    }
  })

  manager.events.addListener('taskCompleted', task => {
    if (!flex.TaskHelper.isOutboundCallTask(task)) {
      return;
    }

    const callbackTask = getMatchingCallbackTask(task);

    if (callbackTask) {
      const payload = { task: callbackTask };
      const pendingCompleteTask = flex.Actions.findPendingActions('CompleteTask', payload);
      console.debug('taskCompleted, pending callback CompleteTask:', pendingCompleteTask);

      if (!pendingCompleteTask || Object.keys(pendingCompleteTask)?.length === 0) {
        flex.Actions.invokeAction('CompleteTask', payload);
      }
    }
  });
};
