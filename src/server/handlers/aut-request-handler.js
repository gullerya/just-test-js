import fs from 'fs';
import path from 'path';
import Logger from '../../logger/logger.js';
import { RequestHandlerBase } from './request-handler-base.js';
import { findMimeType, extensionsMap } from '../server-utils.js';

const
	logger = new Logger({ context: 'handler AUT' }),
	CONFIG_KEY = Symbol('config.key');

export default class ClientCoreRequestHandler extends RequestHandlerBase {
	constructor(config) {
		super();
		this[CONFIG_KEY] = config;
		logger.info(`AUT resource request handler initialized; basePath: '${this.basePath}'`);
	}

	get basePath() {
		return '/aut';
	}

	async handle(handlerRelativePath, req, res) {
		const contentType = findMimeType(handlerRelativePath, extensionsMap.txt);

		fs.readFile(path.resolve(handlerRelativePath), (error, content) => {
			if (!error) {
				res.writeHead(200, { 'Content-Type': contentType }).end(content);
			} else {
				if (error.code === 'ENOENT') {
					logger.warn(`sending 404 for '${handlerRelativePath}'`);
					res.writeHead(404).end();
				} else {
					logger.warn(`sending 500 for '${handlerRelativePath}'`);
					res.writeHead(500).end(error.toString());
				}
			}
		});
	}
}