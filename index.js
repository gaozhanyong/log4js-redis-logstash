'use strict';

const Redis = require('ioredis');
const util = require('util');
const layouts = require('log4js').layouts;

function logstashRedis(config, layout) {
  const redis = config.redis ? new Redis(config.redis) : new Redis();
  layout = layout || layouts.dummyLayout;
  if (!config.fields) {
    config.fields = {};
  }

  return function log(loggingEvent) {
    let fields = {};

    fields.level = loggingEvent.level.levelStr;
    fields.category = loggingEvent.categoryName;

    if (loggingEvent.data.length > 1) {
      const secondEvData = loggingEvent.data[1];
      Object.assign(fields, config.fields);
      if (util.isObject(secondEvData)) {
        for (let k in secondEvData) {
          fields[k] = secondEvData[k];
        }
      }
    }

    const logObject = {
      '@version': '1',
      '@timestamp': (new Date(loggingEvent.startTime)).toISOString(),
      type: config.logType ? config.logType : fields.category,
      message: layout(loggingEvent),
      fields: fields
    };
    sendLog(redis, config.key, logObject);
  };
}

function sendLog(redis, key, logObject) {
  const logString = JSON.stringify(logObject);
  redis.rpush(key, logString, function (err, result) {
    if (err) {
      console.error("log4js-redis-logstash - Error: %s", util.inspect(err))
    }
  });
}

function configure(config) {
  let layout;
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout);
  }
  return logstashRedis(config, layout);
}

exports.appender = logstashRedis;
exports.configure = configure;
