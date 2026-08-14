import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@signaldesk/shared';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('should format standard HttpException with custom error payload correctly', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockGetResponse = jest.fn().mockReturnValue({
      status: mockStatus,
    });
    const mockHost = {
      switchToHttp: () => ({
        getResponse: mockGetResponse,
      }),
    } as any;

    const exception = new HttpException(
      {
        error: {
          code: ErrorCode.NO_WORKSPACE,
          message: 'Authenticated user does not belong to any workspace',
          statusCode: HttpStatus.FORBIDDEN,
        },
      },
      HttpStatus.FORBIDDEN,
    );

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({
      error: {
        code: ErrorCode.NO_WORKSPACE,
        message: 'Authenticated user does not belong to any workspace',
        statusCode: 403,
      },
    });
  });

  it('should format class-validator ValidationPipe error correctly', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockGetResponse = jest.fn().mockReturnValue({
      status: mockStatus,
    });
    const mockHost = {
      switchToHttp: () => ({
        getResponse: mockGetResponse,
      }),
    } as any;

    const exception = new HttpException(
      {
        statusCode: 400,
        message: ['title must not be empty', 'priority must be a valid enum value'],
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'title must not be empty, priority must be a valid enum value',
        statusCode: 400,
        details: ['title must not be empty', 'priority must be a valid enum value'],
      },
    });
  });
});
