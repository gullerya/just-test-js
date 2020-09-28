import http from 'http';
import { performance } from 'perf_hooks';
import Logger from '../logger/logger.js';
import buildConfig from './server-service-config.js';

const
	logger = new Logger({ context: 'server' }),
	STATUS_STOPPED = 0,
	STATUS_RUNNING = 1,
	CONFIG_KEY = Symbol('config.key'),
	STATUS_KEY = Symbol('status.key'),
	SERVER_KEY = Symbol('server.key'),
	BASE_URL_KEY = Symbol('base.url.key'),
	HANDLERS_READY_PROMISE_KEY = Symbol('handlers.ready.promise.key');

export default class ServerService {
	constructor(serverConfig, clArguments) {
		//	build configuration
		const effectiveConf = buildConfig(serverConfig ?? {}, clArguments);
		this[CONFIG_KEY] = effectiveConf;
		logger.info('server service effective config:');
		logger.info(effectiveConf);

		//	init service
		this[STATUS_KEY] = STATUS_STOPPED;
		this[SERVER_KEY] = null;
		this[BASE_URL_KEY] = `http://localhost:${this.effectiveConfig.port}`;
		this[HANDLERS_READY_PROMISE_KEY] = this.initHandlers();
	}

	async initHandlers() {
		const
			started = performance.now(),
			handlerPromises = [],
			handlerBasePaths = [];
		this[CONFIG_KEY].handlers.forEach(async h => {
			handlerPromises.push(new Promise((resolve, reject) => {
				import(h).then(hp => {
					const HandlerConstructor = hp.default;
					const handler = new HandlerConstructor(this[CONFIG_KEY]);

					handlerBasePaths.forEach(bup => {
						if (handler.basePath === '/' || bup === '/') {
							if (handler.basePath === bup) {
								throw new Error(`'basePath' of handlers MUST be exclusive, violators: '${bup}' and '${handler.basePath}'`);
							}
						} else if (bup.indexOf(handler.basePath) === 0 || handler.basePath.indexOf(bup) === 0) {
							throw new Error(`'basePath' of handlers MUST be exclusive, violators: '${bup}' and '${handler.basePath}'`);
						}
					});

					handlerBasePaths.push(handler.basePath);
					resolve(handler);
				}).catch(reject);
			}));
		});
		const handlers = await Promise.all(handlerPromises);
		logger.info(`... ${handlers.length} handler/s initialized in ${Math.floor(performance.now() - started)}ms`);
		return handlers;
	}

	async start() {
		if (this[STATUS_KEY] === STATUS_RUNNING) {
			logger.error('http server already running');
			return null;
		}

		const handlers = await this[HANDLERS_READY_PROMISE_KEY];

		const port = this[CONFIG_KEY].port;
		logger.info(`starting local server on port ${port}...`);

		//	init dispatcher
		const mainRequestDispatcher = async function mainRequestHandler(req, res) {
			const path = req.url === '/' || req.url === '' ? '/core' : req.url;
			const handler = handlers.find(h => path.startsWith(h.basePath));
			if (handler) {
				try {
					let relPath = path.replace(handler.basePath, '');
					relPath = relPath.startsWith('/') ? relPath.substring(1) : relPath;
					await handler.handle(relPath, req, res);
				} catch (error) {
					logger.error(`sending 500 for '${req.url}'; ${error}`);
					res.writeHead(500).end(`${error}`);
				}
			} else {
				res.writeHead(404, `no handler matched '${req.url}'`).end();
			}
		};

		//	init server
		logger.info(`\tregistered ${handlers.length} request handler/s`);
		this[SERVER_KEY] = http.createServer(mainRequestDispatcher).listen(port);

		this[STATUS_KEY] = STATUS_RUNNING;
		logger.info(`... local server started on port ${port}`);
	}

	async stop() {
		let resPromise;
		logger.info('stopping local server...');
		if (this[SERVER_KEY] && this[STATUS_KEY] === STATUS_RUNNING) {
			resPromise = new Promise(resolve => {
				this[SERVER_KEY].close(closeError => {
					this[STATUS_KEY] = STATUS_STOPPED;
					logger.info(`... local server stopped${closeError ? ` ${closeError}` : ``}`);
					resolve();
				});
			});
		} else {
			resPromise = Promise.resolve();
		}
		return resPromise;
	}

	get effectiveConfig() {
		return this[CONFIG_KEY];
	}

	get baseUrl() {
		return this[BASE_URL_KEY];
	}

	get isRunning() {
		return this[STATUS_KEY] === STATUS_RUNNING;
	}
}