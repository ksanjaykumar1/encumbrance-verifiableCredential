import { StatusCodes } from 'http-status-codes';
import CustomError from './CustomError.js';

export default class Aries extends CustomError {
  statusCode: any;
  constructor(message: any) {
    super(`${message}`);
    this.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  }
}
