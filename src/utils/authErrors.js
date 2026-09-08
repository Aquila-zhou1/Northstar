export function authErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const code = error?.code || '';
  const message = error?.message?.toLowerCase() || '';

  if (code.includes('rate_limit') || message.includes('rate limit') || message.includes('after 60 seconds')) {
    return 'Too many attempts. Wait a moment before requesting another code.';
  }
  if (code === 'otp_expired' || message.includes('expired')) {
    return 'Invalid verification code. Please check and try again.';
  }
  if (code === 'otp_disabled' || message.includes('email provider is disabled')) {
    return 'New to Northstar? Please sign up first.';
  }
  if (code === 'invalid_credentials' || message.includes('token has expired or is invalid')) {
    return 'That verification code is invalid or has expired.';
  }
  return fallback;
}

export function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/app';
}
