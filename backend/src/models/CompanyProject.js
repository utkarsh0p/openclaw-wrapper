import mongoose from "mongoose";

const companyProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ceoName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    primaryAgentId: {
      type: String,
      default: process.env.OPENCLAW_AGENT_ID || "main",
    },
    activeOpenClawRunId: {
      type: String,
      default: null,
    },
    lastReportAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const CompanyProject = mongoose.model("CompanyProject", companyProjectSchema);

