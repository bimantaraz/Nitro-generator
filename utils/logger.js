const
	chalk = require('chalk'),
	{ existsSync, readFileSync, writeFileSync } = require('fs'),
	winston = require('winston'),
	yaml = require('js-yaml');

if (!existsSync('./config.yml')) createDefaultConfigFile();
const debug_mode = yaml.load(readFileSync('./config.yml')).debug_mode;

const colors = { info: chalk.greenBright, warn: chalk.yellow, error: chalk.red, debug: chalk.blue };

const logger = winston.createLogger({
	transports: [new winston.transports.Console()],
	format: winston.format.printf(log => {
		const date = new Date();
		const color = colors[log.level] || chalk.reset;
		const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(t => t >= 10 ? t : '0' + t).join(':');

		return `${chalk.magenta(time)} ${color(`[${log.level.toUpperCase()}]`)} » ${log.message}`;
	}),
	level: debug_mode ? 'debug' : 'info',
});

function createDefaultConfigFile() {
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
};

module.exports = logger;