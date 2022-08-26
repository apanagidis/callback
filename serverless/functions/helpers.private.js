/* eslint-disable camelcase */
// Temporary disabling camelcase rule. This require a change in the plugin code

const moment = require('moment-timezone');

// String constants
const webhookPaths = {
  callbackMenu: 'callback-menu',
  queueMenu: 'queue-menu',
  voicemailMenu: 'voicemail-menu'
};

// Helper functions
function handleError(error) {
  let message = '';
  if (error.message) {
    message += error.message;
  }
  if (error.stack) {
    message += ` | stack: ${error.stack}`;
  }
  (console.error || console.log).call(console, message || error);
}

/**
 * Get a Task Resource
 *
 * @param {object} context Twilio function context object
 * @param {string} sid Call Sid or Task Sid
 * @returns {Promise} Promise Object with Task Resource
 */
function getTask(context, sid) {
  const client = context.getTwilioClient();
  let fetchTask;

  if (sid.startsWith('CA')) {
    fetchTask = client.taskrouter.workspaces(context.TWILIO_WORKSPACE_SID).tasks.list({
      evaluateTaskAttributes: `call_sid= '${sid}'`,
      limit: 20,
    });
  } else {
    fetchTask = client.taskrouter.workspaces(context.TWILIO_WORKSPACE_SID).tasks(sid).fetch();
  }

  return fetchTask
    .then((result) => {
      const task = Array.isArray(result) ? result[0] : result;
      return {
        status: 'success',
        topic: 'getTask',
        action: 'getTask',
        taskSid: task.sid,
        taskQueueSid: task.taskQueueSid,
        taskQueueName: task.taskQueueFriendlyName,
        workflowSid: task.workflowSid,
        workspaceSid: task.workspaceSid,
        data: task,
      };
    })
    .catch((error) => {
      return {
        status: 'error',
        topic: 'getTask',
        action: 'getTask',
        data: error,
      };
    });
}

/**
 *
 * Cancel a Task
 *
 * @param {Object} client Twilio Client
 * @param {string} workspaceSid SID of the workspace the task belong to
 * @param {string} taskSid SID of the task to be cancelled
 */
async function cancelTask(client, workspaceSid, taskSid, reason, attributes) {
  try {
    const taskAttributes = typeof attributes === 'string'
      ? JSON.parse(attributes)
      : attributes;

    const newAttributes = {
      ...taskAttributes,
      conversations: {
        ...taskAttributes.conversations,
        abandoned: 'No'
      }
    };
    await client.taskrouter.workspaces(workspaceSid).tasks(taskSid).update({
      assignmentStatus: 'canceled',
      attributes: JSON.stringify(newAttributes),
      reason,
    });
  } catch (error) {
    console.log('cancelTask Error');
    handleError(error);
  }
}

/**
 *
 * Get current time adjusted to timezone
 *
 * @param {string} timeZone Timezone name
 * @returns {Object}
 */
function getTime(timeZone) {
  const now = new Date();
  const timeRecvd = moment(now);
  return {
    time_recvd: timeRecvd,
    server_tz: timeZone,
    server_time_long: timeRecvd.tz(timeZone).format('MMM Do YYYY, h:mm:ss a z'),
    server_time_short: timeRecvd.tz(timeZone).format('MM-D-YYYY, h:mm:ss a z'),
  };
}

/**
 *
 *  Build a url with query parameters
 *
 * @param {string} url Base URL
 * @param {Object} queryParams Key-value pairs for query parameters
 * @returns {string}
 */
const urlBuilder = (domain, path, queryParams = {}) => {
  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => params.append(key, value));
  return `https://${domain}/${path}?${params}`;
};

module.exports = {
  cancelTask,
  getTask,
  getTime,
  handleError,
  urlBuilder,
  webhookPaths
};
