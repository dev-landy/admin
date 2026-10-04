import BaseJSDOMEnvironment from "@jest/environment-jsdom-abstract";
import * as jsdom from "jsdom";

export default class CurrentJSDOMEnvironment extends BaseJSDOMEnvironment {
  constructor(config, context) {
    // jsdom 30은 ResourceLoader 대신 resources 옵션에서 userAgent를 받는다.
    const { userAgent, ...options } = config.projectConfig.testEnvironmentOptions;
    const testEnvironmentOptions = typeof userAgent === "string"
      ? { ...options, resources: { ...options.resources, userAgent } }
      : options;

    super({
      ...config,
      projectConfig: { ...config.projectConfig, testEnvironmentOptions },
    }, context, jsdom);
  }
}
