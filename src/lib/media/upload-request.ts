type MultipartUploadOptions = {
  maxBodyBytes: number
  tooLargeMessage: string
}

type MultipartUploadError = {
  message: string
  status: 400 | 411 | 413 | 415
}

export const validateMultipartUploadRequest = (
  request: Request,
  options: MultipartUploadOptions,
): MultipartUploadError | null => {
  const contentType = request.headers.get('content-type')

  if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) {
    return { message: 'Le formulaire doit utiliser le format multipart.', status: 415 }
  }

  const rawContentLength = request.headers.get('content-length')

  if (!rawContentLength) {
    return { message: 'La taille du formulaire doit être indiquée.', status: 411 }
  }

  const contentLength = Number(rawContentLength)

  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
    return { message: 'La taille du formulaire est invalide.', status: 400 }
  }

  if (contentLength > options.maxBodyBytes) {
    return { message: options.tooLargeMessage, status: 413 }
  }

  return null
}
