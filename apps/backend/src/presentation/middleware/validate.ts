import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodIssue } from "zod";

export const validate =
  <T extends z.ZodTypeAny>(schema: T) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed && typeof parsed === "object") {
        if ("body" in parsed && parsed.body !== undefined) req.body = parsed.body;
        if ("query" in parsed && parsed.query !== undefined)
          req.query = parsed.query as typeof req.query;
        // do NOT mutate req.params — Express marks it read-only in some versions
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue: ZodIssue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));

        return res.status(400).json({
          error: "validation_error",
          message: "Invalid request data",
          details: errorMessages,
        });
      }

      next(error);
    }
  };
