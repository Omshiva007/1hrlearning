import type { Request } from 'express';
import type { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user: Pick<User, 'id' | 'email' | 'role'>;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: Record<string, string[]>;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, errors?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
