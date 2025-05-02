// src/logger.js
let chalk;
try {
  chalk = require('chalk').default;
} catch {
  chalk = require('chalk');
}

// Mask sensitive values
function maskValue(name, value) {
  if (!value) return value;
  const lower = name.toLowerCase();
  // Mask password or token fields completely
  if (
    lower.includes('password') ||
    lower.includes('token') ||
    lower === 'actual_server_password' ||
    lower === 'actual_file_password'
  ) {
    return '****';
  }
  // Mask username/email fields
  if (lower.includes('username') || lower.includes('user_id') || lower.includes('email')) {
    if (typeof value !== 'string' || value.length < 7) return '****';
    // Mask emails (show xxx...@yyy)
    if (value.includes('@')) {
      const [u, d] = value.split('@');
      return u.slice(0, 3) + '...' + '@' + d[0] + '...';
    }
    // Mask other usernames/email-like values
    return value.slice(0, 3) + '...';
  }
  // Mask server urls/ids (show domain only or first 8 chars)
  if (lower.includes('server_url') || lower.includes('sync_id')) {
    if (typeof value !== 'string') return '****';
    if (value.startsWith('http')) {
      try {
        const url = new URL(value);
        return url.origin + '/...';
      } catch {
        return value.slice(0, 8) + '...';
      }
    }
    return value.slice(0, 8) + '...';
  }
  // Mask account IDs (show only first few chars if GUID/UUID-like)
  if (lower.includes('account')) {
    if (typeof value === 'string' && value.length > 8) return value.slice(0, 4) + '...';
  }
  // Otherwise, return as is
  return value;
}

const icons = {
  info: chalk.blue('ℹ️'),
  warn: chalk.hex('#FFA500')('⚠️'),
  error: chalk.red('❌'),
  success: chalk.green('✔️'),
  debug: chalk.cyan('🐞')
};

function info(...args) {
  console.log(`${icons.info} ${chalk.bold.blue('INFO')}:`, ...args);
}
function warn(...args) {
  console.log(`${icons.warn} ${chalk.bold.yellow('WARN')}:`, ...args);
}
function error(...args) {
  console.error(`${icons.error} ${chalk.bold.red('ERROR')}:`, ...args);
}
function success(...args) {
  console.log(`${icons.success} ${chalk.bold.green('SUCCESS')}:`, ...args);
}
function debug(...args) {
  if (process.env.DEBUG) {
    console.debug(`${icons.debug} ${chalk.cyan('DEBUG')}:`, ...args);
  }
}
function highlight(msg) {
  return chalk.bgMagenta.whiteBright.bold(` ${msg} `);
}

function printConfigVar(name, val) {
  const masked = maskValue(name, val);
  if (val)
    console.log(
      chalk.green('✓'), chalk.bold(name), chalk.gray('='), chalk.yellow(masked)
    );
  else
    console.log(
      chalk.red('✗'), chalk.bold(name), chalk.gray('='), chalk.redBright('MISSING')
    );
}

module.exports = {
  info,
  warn,
  error,
  success,
  debug,
  highlight,
  printConfigVar,
  maskValue,
};