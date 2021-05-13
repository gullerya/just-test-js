/**
 * Runs a session of all suites/tests
 * - performs with the current environment (browser / node instance)
 */
import { EVENT } from '../common/constants.js';
import { P } from '../common/performance-utils.js';
import { deployTest } from './deploy-service.js';
import { stateService } from './state/state-service-factory.js';

export {
	runSession,
	runTest
}

/**
 * executes all relevant tests, according the the sync/async options
 * - performs any needed environment related adjustments
 * 
 * @param {object} metadata - session execution metadata
 * @returns Promise resolved with test results when all tests done
 */
async function runSession(metadata) {
	const executionData = stateService.getExecutionData();
	const sessionStart = P.now();
	console.info(`starting test session (${executionData.suites.length} suites)...`);

	if (!metadata.interactive) {
		setTimeout(() => {
			//	TODO: finalize the session, no further updates will be accepted
		}, metadata.tests.ttl);
		console.info(`session time out watcher set to ${metadata.tests.ttl}ms`);
	}
	await Promise.all(executionData.suites.map(suite => executeSuite(suite, metadata)));

	console.info(`... session done (${(P.now() - sessionStart).toFixed(1)}ms)`);
}

/**
 * executes single test
 */
async function runTest(test, metadata) {
	const testRunBox = await deployTest(test, metadata);

	return new Promise(resolve => {
		testRunBox.addEventListener(EVENT.RUN_START, e => {
			stateService.updateRunStarted(e.detail.suite, e.detail.test);
		}, { once: true });
		testRunBox.addEventListener(EVENT.RUN_END, e => {
			stateService.updateRunEnded(e.detail.suite, e.detail.test, e.detail.run);
			resolve();
		}, { once: true });
	});
}

async function executeSuite(suite, metadata) {
	const testPromises = [];
	let syncChain = Promise.resolve();
	suite.tests.forEach(test => {
		if (test.options.skip) {
			testPromises.push(Promise.resolve());
		} else {
			const runResultPromise = runTest(test, metadata);
			if (test.options.sync) {
				syncChain = syncChain.finally(() => runResultPromise);
			} else {
				testPromises.push(runResultPromise);
			}
		}
	});
	testPromises.push(syncChain);
	await Promise.all(testPromises);
}