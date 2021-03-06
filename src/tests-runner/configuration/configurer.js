import fs from 'fs';
import path from 'path';
import util from 'util';
import fsExtra from 'fs-extra';
import playwright from 'playwright';
import Logger from '../logger/logger.js';

const
	logger = new Logger('JustTest [configurer]'),
	ARG_KEYS = [
		'--config',
		'browser.type'
	],
	DEFAULT_CONFIG = JSON.parse(fs.readFileSync('dist/tests-runner/configuration/default-config.json'), 'utf-8'),
	effectiveConf = {},
	browserTypes = Object.freeze({ chromium: 'chromium', firefox: 'firefox', webkit: 'webkit' }),
	testResultsFormats = Object.freeze(['xUnit']),
	coverageFormats = ['lcov'];

export {
	effectiveConf as configuration,
	getBrowserRunner
};

const
	clargs = process.argv.slice(2),
	args = {};

//	collect arguments
clargs.forEach(arg => {
	const parts = arg.split('=');
	if (parts.length === 2 && ARG_KEYS.includes(parts[0])) {
		args[parts[0]] = parts[1];
	}
});

//	valid required
const configLocation = args['--config'];
if (!configLocation) {
	logger.error('Error: missing or invalid argument "--config" (example: --config=/path/to/config.json)');
	process.exit(1);
}

logger.info();
logger.info('started, execution directory "' + process.cwd() + '"');
logger.info('execution arguments collected as following');
logger.info(util.inspect(args, false, null, true));
logger.info();
logger.info('building effective configuration...');

//	read configuration
let rawConfiguration;
try {
	rawConfiguration = fs.readFileSync(configLocation, { encoding: 'utf8' });
} catch (e) {
	logger.error('failed to READ configuration', e);
	process.exit(1);
}

//	parse configuration and merge with defaults
let configuration;
try {
	configuration = JSON.parse(rawConfiguration);
} catch (e) {
	logger.error('failed to PARSE configuration', e);
	process.exit(1);
}
buildEffectiveConfiguration(configuration);

//	validate configuration essentials
validateEffectiveConf();

//	print out effective configuration
logger.info('... effective configuration to be used is as following');
logger.info(util.inspect(effectiveConf, false, null, true));
logger.info();

function buildEffectiveConfiguration(inputConfig) {
	if (!inputConfig || typeof inputConfig !== 'object') {
		throw new Error('invalid input config');
	}

	//	TODO: currenctly runs on top level object hierarchy only, in future might be need to turn it to deep merge
	Object.keys(DEFAULT_CONFIG).forEach(partKey => {
		effectiveConf[partKey] = Object.assign({}, DEFAULT_CONFIG[partKey], inputConfig[partKey]);
	});
	//	TODO: apply the belo pattern smarter and more generic
	if (args['browser.type']) {
		effectiveConf.browser.type = args['browser.type'];
	}
}

function validateEffectiveConf() {
	try {
		validateBrowserConf(effectiveConf.browser);
		validateServerConf(effectiveConf.server);
		validateTestsConf(effectiveConf.tests);
		validateCoverageConf(effectiveConf.coverage);
		validateReportsFolder(effectiveConf.reports);
	} catch (e) {
		logger.error('invalid configuration', e);
		process.exit(1);
	}
}

function validateBrowserConf(bc) {
	if (!bc) {
		throw new Error('"browser" configuration part is missing');
	}

	if (!bc.type) {
		throw new Error('"browser" configuration is missing "type" part');
	}
	if (!Object.keys(browserTypes).includes(bc.type)) {
		throw new Error(`"type" of "browser" is not a one of the supported ones(${Object.keys(browserTypes).join(', ')})`);
	}
}

function validateServerConf(sc) {
	if (!sc) {
		throw new Error('AUT "server" configuration part is missing');
	}

	if (sc.local) {
		if (!sc.port) {
			throw new Error('AUT "server" said to be local but "port" is missing');
		}
		if (!sc.resourcesFolder) {
			throw new Error('AUT "server" said to be local but "resoucesFolder" is missing');
		}
		const fullResourcesPath = path.resolve(process.cwd(), sc.resourcesFolder);
		if (!fs.existsSync(fullResourcesPath) || !fs.lstatSync(fullResourcesPath).isDirectory()) {
			throw new Error('AUT "server" said to be local but specified "resoucesFolder" ("' + sc.resourcesFolder + '") not exists or not a directory');
		}
	}

	if (!sc.local) {
		if (!sc.remoteUrl) {
			throw new Error('AUT "server" said to be remote but "remoteUrl" is missing');
		}
	}
}

function validateTestsConf(tc) {
	if (!tc) {
		throw new Error('"tests" configuration part is missing');
	}
	if (!tc.url) {
		throw new Error('"tests" configuration is missing "url" part');
	}
	if (typeof tc.maxFail !== 'number') {
		throw new Error('"maxFail" configuration of "tests" is not a number');
	}
	if (typeof tc.maxSkip !== 'number') {
		throw new Error('"maxSkip" configuration of "tests" is not a number');
	}
	if (!testResultsFormats.includes(tc.format)) {
		throw new Error('invalid "format" configuration of "tests": ' + tc.format + '; supported formats are: ' + testResultsFormats);
	}
	if (!tc.reportFilename) {
		throw new Error('"tests" configuration is missing "reportFilename" part');
	}
}

function validateCoverageConf(cc) {
	if (!cc) {
		throw new Error('"coverage" configuration part is missing');
	}

	if (cc.skip) {
		return;
	}

	if (!coverageFormats.includes(cc.format)) {
		throw new Error('"coverage" configuration has invalid "format": ' + cc.format + '; supported formats are: ' + coverageFormats);
	}
	if (!cc.reportFilename) {
		throw new Error('"coverage" configuration is missing "reportFilename" part');
	}
	if (cc.include) {
		if (!Array.isArray(cc.include) || !cc.include.length) {
			throw new Error('"include" part of "coverage" configuration, if provided, MUST be a non-empty array of RegExp string');
		} else {
			cc.include = cc.include.map(one => new RegExp(one));
		}
	}
	if (cc.exclude) {
		if (!Array.isArray(cc.exclude) || !cc.exclude.length) {
			throw new Error('"exclude" part of "coverage" configuration, if provided, MUST be a non-empty array of RegExps');
		} else {
			cc.exclude = cc.exclude.map(one => new RegExp(one));
		}
	}
}

function validateReportsFolder(rc) {
	if (!rc) {
		throw new Error('"reports" configuration part is missing');
	}
	if (!rc.folder) {
		throw new Error('"reports" configuration is missing "folder" part');
	}
	const reportsFolderPath = path.resolve(process.cwd(), rc.folder);
	fsExtra.emptyDirSync(reportsFolderPath);
	logger.info('reports folder resolve to and initialized in "' + reportsFolderPath + '"');
}

async function getBrowserRunner() {
	const browserRunner = playwright[effectiveConf.browser.type];
	if (!browserRunner) {
		throw new Error(`failed to resolve browser runner '${effectiveConf.browser.type}'`);
	}
	return browserRunner;
}