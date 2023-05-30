import { StatusCodes } from 'http-status-codes';
import express from 'express';

const errorHandler = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const defaultError = {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    msg: err.message || 'Something went wrong, try again later',
  };

  return res.status(defaultError.statusCode).json({ msg: defaultError.msg });
};

export default errorHandler;
