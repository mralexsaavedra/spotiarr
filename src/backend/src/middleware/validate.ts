import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodIssue } from "zod";

export const validate =
  <T extends z.ZodTypeAny>(schema: T) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
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
