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
          conversations: {
            ...conversations,
            communication_channel: 'Call',
          }
        }
      });

      flex.Actions.invokeAction('WrapupTask', { task });
    }
  });
};
