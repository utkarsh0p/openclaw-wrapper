import mongoose from "mongoose";

const agentSessionSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProject",
      required: true,
    },
    agentId: {
      type: String,
      required: true,
    },
    sessionKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    lastRunAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export const AgentSession = mongoose.model("AgentSession", agentSessionSchema);
