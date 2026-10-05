// Read-only post-deploy diagnostics for the mail path. Runs INSIDE the api
// container (see remote-deploy.sh), so it sees the real production env. It
// prints facts only - never a secret, token or email body - so the output is
// safe to read in the GitHub Actions log:
//   1. SMTP settings present? does the provider accept the login?
//   2. does the owner user exist, and with which role?
//   3. are queued emails failing, and why?
const OWNER = (process.env.OWNER_ADMIN_EMAIL || 'puneetmehra24@gmail.com').toLowerCase();
const out = (key, value) => console.log(`[ops-check] ${key}: ${value}`);
const short = (text, n = 220) => String(text || '').replace(/\s+/g, ' ').slice(0, n);

async function checkSmtp() {
  const pass = process.env.SMTP_PASSWORD || '';
  out('smtp host', process.env.SMTP_HOST || '(unset)');
  out('smtp port', process.env.SMTP_PORT || '(unset)');
  out('smtp from', process.env.SMTP_FROM || '(unset)');
  out('smtp username set', Boolean(process.env.SMTP_USERNAME));
  out('smtp password length', pass.length);
  out('smtp password has whitespace/quotes', /[\s"']/.test(pass));
  if (!process.env.SMTP_HOST) return;
  try {
    const transport = require('nodemailer').createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USERNAME ? { user: process.env.SMTP_USERNAME, pass } : undefined,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    });
    await transport.verify();
    out('smtp login', 'OK - the provider accepted the connection and login');
  } catch (err) {
    out('smtp login', `FAILED ${err.code || ''} ${short(err.message)}`);
  }
}

async function checkUser() {
  let conn;
  try {
    conn = await require('mysql2/promise').createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    const [users] = await conn.execute(
      'SELECT id, status, isEmailVerified, deletedAt FROM users WHERE email = ? LIMIT 1',
      [OWNER],
    );
    if (!users.length) {
      out('owner user', `NOT FOUND (${OWNER}) - the seeder did not create it`);
      return;
    }
    const user = users[0];
    out('owner user', `found, status=${user.status}, emailVerified=${Boolean(user.isEmailVerified)}, deleted=${Boolean(user.deletedAt)}`);
    const [roles] = await conn.execute(
      'SELECT r.slug AS role FROM organization_members m JOIN roles r ON r.id = m.roleId WHERE m.userId = ?',
      [user.id],
    );
    out('owner roles', roles.map((r) => r.role).join(', ') || '(none)');
  } catch (err) {
    out('owner user', `check failed: ${short(err.message)}`);
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

async function checkQueue() {
  let queue;
  try {
    const { Queue } = require('bullmq');
    queue = new Queue('email', {
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    });
    const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed');
    out('email queue', JSON.stringify(counts));
    for (const job of await queue.getFailed(0, 4)) {
      // Name, attempts and reason only - never job.data (it holds reset tokens).
      out('failed email job', `${job.name}, attempts=${job.attemptsMade}, reason=${short(job.failedReason)}`);
    }
  } catch (err) {
    out('email queue', `check failed: ${short(err.message)}`);
  } finally {
    if (queue) await queue.close().catch(() => {});
  }
}

(async () => {
  const timer = setTimeout(() => {
    out('timeout', 'gave up after 60 seconds');
    process.exit(0);
  }, 60000);
  await checkSmtp();
  await checkUser();
  await checkQueue();
  clearTimeout(timer);
  process.exit(0);
})();
