export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "BAD_REQUEST",
    public readonly field?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      body: {
        error: error.message,
        code: error.code,
        field: error.field,
      },
      status: error.status,
    };
  }

  console.error(error);
  return {
    body: { error: "Something went wrong", code: "INTERNAL_ERROR" },
    status: 500,
  };
}
