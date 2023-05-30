import express from 'express';
import { StatusCodes } from 'http-status-codes';
const notFound = async (req: express.Request, res: express.Response) => {
  res.status(StatusCodes.NOT_FOUND).send(`Route Doesn't Exist`);
};

export default notFound;
