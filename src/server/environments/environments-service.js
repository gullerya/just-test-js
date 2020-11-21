import Logger from '../logger/logger.js';
import launchInteractive from './launchers/interactive-env-launcher.js';
import launchBrowser from './launchers/browser-env-launcher.js';

export {
	getEnvironmentsService
}

const
	logger = new Logger({ context: 'environments' }),
	ENVIRONMENT_BLUEPRINT = Object.freeze({
		interactive: true,
		browser: null,
		device: null,
		scheme: null
	}),
	INTERACTIVE = 'interactive',
	BROWSERS = Object.freeze({
		chromium: true,
		firefox: true,
		webkit: true
	}),
	SCHEMES = Object.freeze({
		light: true,
		dark: true
	});

let environmentsServiceInstance;

class EnvironmentsService {
	/**
	 * Environment Service initializer
	 * 
	 * @param {Array} [envsConfig] - an array of environment configurations
	 * @param {Object} [clArguments] - command line arguments
	 */
	verifyEnrichConfig(envsConfig, clArguments) {
		const envs = [];

		if (clArguments && clArguments.envs) {
			const envArgs = clArguments.envs.split(CL_ENVS_SPLITTER);
			for (const envArg of envArgs) {
				envs.push(_parseCLArgAsEnv(envArg));
			}
		} else if (envsConfig && envsConfig.length) {
			for (const envConfig of envsConfig) {
				envs.push(_processEnvConfig(envConfig));
			}
		} else {
			logger.info('no environment configurations specified, defaulting to interactive');
			envs.push(Object.assign(
				{},
				ENVIRONMENT_BLUEPRINT,
				{ interactive: true }
			));
		}
		_validateEnvironments(envs);
		_reduceIdenticalEnvironments(envs);

		return envs;
	}

	launch(environments) {
		const result = [];
		for (const env of environments) {
			if (env.interactive) {
				result.push(launchInteractive(env));
			} else if (env.browser) {
				result.push(launchBrowser(env));
			} else {
				throw new Error(`unsuppoted environment configuration ${JSON.stringify(env)}`);
			}
		}
		return result;
	}
}

function _parseCLArgAsEnv(clArg) {
	const tokens = clArg.split(CL_ENV_TOKENS_SPLITTER);
	const tmp = {};
	for (const token of tokens) {
		if (token === INTERACTIVE) {
			//	DO NOTHING
		} else if (token in BROWSERS) {
			tmp.browser = token;
			tmp.interactive = false;
		} else if (token in SCHEMES) {
			tmp.scheme = token;
		} else {
			throw new Error(`unexpected token in 'envs' command line parameter '${token}'`);
		}
	}
	return Object.assign({}, ENVIRONMENT_BLUEPRINT, tmp);
}

function _processEnvConfig(envConfig) {
	const tmp = {};
	Object.entries(envConfig).forEach(([key, value]) => {
		if (!(key in ENVIRONMENT_BLUEPRINT)) {
			throw new Error(`unexpected environment configuration key '${key}'`);
		}
		if (key === 'browser' && value in BROWSERS) {
			tmp.browser = value;
			tmp.interactive = false;
		} else if (key === 'scheme' && value in SCHEMES) {
			tmp.scheme = value;
		} else {
			throw new Error(`unexpected environment configuration value '${value}' for key '${key}'`);
		}
	});
	return Object.assign({}, ENVIRONMENT_BLUEPRINT, tmp);
}

function _validateEnvironments(envs) {
	if (!envs || !envs.length) {
		throw new Error(`at least 1 environment for a tests execution expected; found ${envs}`);
	}
	for (const env of envs) {
		if (env.interactive && env.browser) {
			throw new Error(`environment can NOT be interactive and define browser; violator: ${JSON.stringify(env)}`);
		}
		if (env.interactive && (env.device || env.scheme)) {
			throw new Error(`interactive environment can NOT specify device or scheme; violator: ${JSON.stringify(env)}`);
		}
	}
}

function _reduceIdenticalEnvironments(envs) {
	const map = {};
	const toBeRemoved = envs.filter(e => {
		const hash = JSON.stringify(e);
		if (hash in map) {
			logger.info(`removing duplicate environment (${hash})`);
			return true;
		} else {
			map[hash] = true;
			return false;
		}
	});
	for (const tbr of toBeRemoved) {
		envs.splice(envs.indexOf(tbr), 1);
	}
}

function getEnvironmentsService() {
	if (!environmentsServiceInstance) {
		environmentsServiceInstance = new EnvironmentsService();
	}
	return environmentsServiceInstance;
}