import express from "express";
import createError from "http-errors";
import jwt from "jsonwebtoken";

export const authRouter = express.Router();

authRouter.post("/token", async (req, res, next) => {
  try {
    const { apiKey } = req.body;

    if (!process.env.APP_JWT_SECRET || !process.env.CEO_ACCESS_KEY) {
      throw createError(500, "Authentication environment variables are not configured");
    }

    if (!apiKey || apiKey !== process.env.CEO_ACCESS_KEY) {
      throw createError(401, "Invalid access key");
    }

    const token = jwt.sign(
      {
        role: "ceo",
      },
      process.env.APP_JWT_SECRET,
      {
        expiresIn: "12h",
      },
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

