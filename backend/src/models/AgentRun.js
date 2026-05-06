import mongoose from "mongoose";

const liveEventSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["agent", "tool", "system"],
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "idle", "thinking", "using_tools", "completed", "failed"],
      required: true,
    },
    rawType: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const agentRunSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProject",
      required: true,
    },
    agentId: {
      type: String,
      default: process.env.OPENCLAW_AGENT_ID || "main",
    },
    openClawRunId: {
      type: String,
      index: true,
      default: null,
    },
    gatewayRequestId: {
      type: String,
      index: true,
      required: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "thinking", "using_tools", "completed", "failed"],
      default: "queued",
    },
    finalSummary: {
      type: String,
      default: "",
    },
    businessReport: {
      type: String,
      default: "",
    },
    liveEvents: {
      type: [liveEventSchema],
      default: [],
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const AgentRun = mongoose.model("AgentRun", agentRunSchema);
