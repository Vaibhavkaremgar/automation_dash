const dns = require('dns').promises;
const net = require('net');

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com','yopmail.com','discard.email'
]);

async function hasMx(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    return Array.isArray(mx) && mx.length > 0;
  } catch (e) {
    return false;
  }
}

function smtpProbe(host, email, { timeoutMs = 5000 } = {}) {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, host);
    let stage = 0;
    let done = false;
    const cleanup = (result) => {
      if (done) return; done = true;
      try { socket.end(); } catch {}
      resolve(result);
    };
    const timer = setTimeout(() => cleanup({ ok: false, reason: 'timeout' }), timeoutMs);

    socket.on('error', () => cleanup({ ok: false, reason: 'connect_error' }));
    socket.on('data', (buf) => {
      const resp = buf.toString();
      const code = parseInt(resp.slice(0,3), 10);
      if (Number.isNaN(code)) return; // wait for full line
      if (stage === 0 && code === 220) {
        socket.write('HELO hirehero.local\r\n'); stage = 1; return;
      }
      if (stage === 1 && code === 250) {
        socket.write('MAIL FROM:<no-reply@hirehero.local>\r\n'); stage = 2; return;
      }
      if (stage === 2 && code === 250) {
        socket.write(`RCPT TO:<${email}>\r\n`); stage = 3; return;
      }
      if (stage === 3) {
        clearTimeout(timer);
        if (code === 250 || code === 251) return cleanup({ ok: true });
        if (code >= 550 && code < 560) return cleanup({ ok: false, reason: 'mailbox_unavailable' });
        return cleanup({ ok: false, reason: 'unknown' });
      }
    });
  });
}

async function verifyEmailAddress(email) {
  const parts = email.split('@');
  if (parts.length !== 2) return { ok: false, reason: 'format' };
  const domain = parts[1].toLowerCase();
  if (DISPOSABLE_DOMAINS.has(domain)) return { ok: false, reason: 'disposable' };
  if (!(await hasMx(domain))) return { ok: false, reason: 'no_mx' };

  if (process.env.STRICT_EMAIL_CHECK === '1') {
    try {
      const mxRecords = await dns.resolveMx(domain);
      mxRecords.sort((a,b)=>a.priority - b.priority);
      for (const mx of mxRecords) {
        const result = await smtpProbe(mx.exchange, email, { timeoutMs: 5000 });
        if (result.ok) return { ok: true };
        if (result.reason === 'mailbox_unavailable') return { ok: false, reason: 'mailbox_unavailable' };
      }
      return { ok: false, reason: 'smtp_unverified' };
    } catch (e) {
      return { ok: false, reason: 'smtp_error' };
    }
  }
  return { ok: true };
}

module.exports = { verifyEmailAddress, hasMx, DISPOSABLE_DOMAINS };
