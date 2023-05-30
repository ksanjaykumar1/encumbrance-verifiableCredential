import { StatusCodes } from 'http-status-codes';
import CustomError from './CustomError.js';

export default class NotFound extends CustomError {
  statusCode: any;
  constructor(message: string) {
    super(message);
    this.statusCode = StatusCodes.NOT_FOUND;
  }
}
