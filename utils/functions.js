const chalk = require('chalk'),
	{ writeFileSync } = require('fs'),
	logger = require('./logger'),
	ms = require('ms'),
	needle = require('needle');

module.exports = {
	checkToken: (token) => {
		const headers = { 'Content-Type': 'application/json', 'Authorization': token, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0' };
		needle.get('https://discordapp.com/api/v9/users/@me', { response_timeout: 10000, headers: headers }, (err, res, body) => {
			if (err) { logger.error(`Could not login using the provided ${chalk.bold('redeemToken')} : ${err}`); }
			else if (body.message === '401: Unauthorized') { logger.error(chalk.red.bold(`Invalid redeemToken: ${chalk.reset.bold(`"${token}"`)}`)); }
			else { logger.debug(`Successfully logged in as ${chalk.bold(chalk.blue(body.username + '#' + body.discriminator))}.`); }
			return;
		});
	},

	updateAvailable: false,
	checkForUpdates: (silent = false) => {
		if (module.exports.updateAvailable) {
			if (silent) return;
			return logger.info(chalk.bold(`An update is available on GitHub (v${module.exports.updateAvailable}) ! ${chalk.blue('https://github.com/Tenclea/YANG')}`));
		}

		(async () => {
			const res = await needle('get', 'https://raw.githubusercontent.com/Tenclea/YANG/main/package.json')
				.catch(e => { logger.error(`Could not check for updates: ${e}`); return null; });

			if (!res?.body) return;
			const update = JSON.parse(res.body).version;
			const { version } = require('../package.json');

			if (version !== update) {
				module.exports.updateAvailable = update;
				if (!silent) return logger.info(chalk.bold(`An update is available on GitHub (v${module.exports.updateAvailable}) ! ${chalk.blue('https://github.com/Tenclea/YANG')}`));
			}
		})();
	},

	createDefaultConfigFile: () => {
		const data = `# The length of the codes to generate, can be one of 'short', 'long' or 'both'
# Short is 16 characters, long is 24, and both will randomly choose between 16 and 24 each time
code_length: short

# Auto redeems valid nitro codes
auto_redeem:
  # enable auto_redeem or not (true / false)
  enabled: false
  # The token to redeem the codes with
  token: "PUT_YOUR_TOKEN_HERE"

# Proxy-related settings
proxies:
  # Write working proxies to a file (true / false)
  save_working: true

  # Validate proxies before passing them to the checker (true / false)
  enable_checker: true

  # Download fresh proxies from the web (true / false)
  enable_scrapper: true

  # The maximum amount of proxies to download (if enabled), use '0' for no maximum.
  max_proxies_download: 1000

# The amount of codes to check at the same time
# The higher, the faster, but it may slow the generator down if it is set too high
threads: 50

# Receive webhook messages on start and when a valid code is found
webhook:
  # enable webhook messages or not (true / false)
  enabled: false

  # The webhook url
  url: https://discord.com/api/webhooks/.../...

  # Webhook notifications settings
  notifications:
    # Send a notification when the generator starts (true / false)
    boot: true

    # Send a notification when a valid code is found (true / false)
    valid_code: true

    # How often to send status updates to the webhook in seconds (use '0' for never)
    status_update_interval: 600

# Print additional information in the console (true / false)
debug_mode: false`;

		writeFileSync('./config.yml', data, 'utf-8');
	},

	sendWebhook: (url, message) => {
		const date = +new Date();

		const data = JSON.stringify({ 'username': 'YANG', 'avatar_url': 'https://cdn.discordapp.com/attachments/794307799965368340/794356433806032936/20210101_010801.jpg', 'content': message });

		return needle('post', url, data, { headers: { 'Content-Type': 'application/json' } })
			.then(() => logger.debug(`Successfully delivered webhook message in ${ms(+new Date() - date, { long: true })}.`))
			.catch(e => logger.error(`Could not deliver webhook message : ${e}`));
	},

	redeemNitro: (code, config) => {
		if (!config.auto_redeem.enabled) return;

		needle.post(`https://discordapp.com/api/v9/entitlements/gift-codes/${code}/redeem`, '', { headers: { 'Authorization': config.auto_redeem.token } }, (err, res, body) => {
			if (err || !body) {
				console.log(err);
				logger.info(chalk.red(`Failed to redeem a nitro gift code : ${code} > ${err}.`));
			}

			else if (body.message === 'You are being rate limited.') {
				logger.warn(chalk.red(`You are being rate limited, trying to claim again in ${chalk.yellow(body.retry_after)} seconds.`));
				return setTimeout(() => { module.exports.redeemNitro(code, config); }, body.retry_after * 1000 + 50);
			}
			else if (body.message === 'Unknown Gift Code') {
				return logger.warn(`${chalk.bold(code)} was an invalid gift code or had already been claimed.`);
			}
			else if (body.message === 'This gift has been redeemed already.') {
				if (config.webhook.enabled) { module.exports.sendWebhook(config.webhook.url, `This gift code (${code}) has already been redeemed...`); }
				return logger.warn(`${code} has already been redeemed...`);
			}
			else {
				if (config.webhook.enabled) { module.exports.sendWebhook(config.webhook.url, 'Successfully claimed a gift code !'); }
				return logger.info(chalk.green(`Successfully redeemed the nitro gift code : ${code} !`));
			}

		});
	},

	validateProxies: async (p) => {
		const res = await needle(
			'post',
			'https://yangdb.tenclea.repl.co/proxies',
			{ proxies: p }, { json: true, response_timeout: 5000 },
		).catch(() => { });

		return res?.body?.proxies || [];
	},
};
