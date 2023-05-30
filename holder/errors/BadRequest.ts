import { StatusCodes } from 'http-status-codes';
import CustomError from './CustomError.js';

export default class BadRequest extends CustomError {
  statusCode: any;
  constructor(message: string) {
    super(message);
    this.statusCode = StatusCodes.BAD_REQUEST;
  }
}
