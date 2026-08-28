import { createDefaultEsmPreset } from "ts-jest";

const defaultEsmPreset = createDefaultEsmPreset();

/** @type {import("jest").Config} **/
export default {
  ...defaultEsmPreset,
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"]
};
