import crypto from 'crypto';

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlJson(obj) {
  return base64url(JSON.stringify(obj));
}

function base64urlDecode(input) {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signData(data, secret) {
  return base64url(
    crypto.createHmac('sha256', secret).update(data).digest()
  );
}

export function sign(payload, secret, ttlSeconds) {
  if (!secret) {
    throw new Error('JWT secret is required.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds
  };

  const encodedHeader = base64urlJson(header);
  const encodedPayload = base64urlJson(fullPayload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signData(signingInput, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verify(token, secret) {
  if (!secret || !token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = signData(signingInput, secret);

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (typeof payload.exp !== 'number' || payload.exp < now) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}
