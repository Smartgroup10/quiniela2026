export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(404, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(403, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto') {
    super(409, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos inválidos') {
    super(400, message);
  }
}
