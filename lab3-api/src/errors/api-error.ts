export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  /**
   * Creates a structured API error.
   *
   * @param message The error message returned to the client.
   * @param statusCode The HTTP status code for the response.
   * @param code A stable application error code.
   * @param details Optional structured details about the failure.
   */
  public constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
