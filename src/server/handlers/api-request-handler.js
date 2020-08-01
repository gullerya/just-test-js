import Logger from '../../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { extensionsMap } from '../server-utils.js';
import testService from '../../tester/tests-service.js'

const
	logger = new Logger('JustTest [api handler]'),
	CONFIG_KEY = Symbol('config.key');

export default class ClientCoreRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;
		logger.info(`api resource request handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return '/api';
	}

	async handle(handlerRelativePath, req, res) {
		if (handlerRelativePath.startsWith('tests/metadata')) {
			this.handleTestsMetadata(res);
		} else if (handlerRelativePath.startsWith('tests/resources')) {
			await this.handleTestsResources(res);
		} else {
			res.writeHead(404).end();
		}
	};

	handleTestsMetadata(res) {
		res
			.writeHead(200, { 'Content-Type': extensionsMap.json })
			.end(JSON.stringify(testService.effectiveConfig));
	}

	async handleTestsResources(res) {
		res
			.writeHead(200, { 'Content-Type': extensionsMap.json })
			.end(JSON.stringify(await testService.testResourcesPromise));
	}
}