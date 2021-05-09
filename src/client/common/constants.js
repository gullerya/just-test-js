export {
	EVENTS,
	STATUS
}

const EVENTS = Object.freeze({
	RUN_START: 'run:start',
	RUN_END: 'run:end',
	TEST_SELECT: 'test:select'
});

const STATUS = Object.freeze({
	SKIP: 'skip',
	WAIT: 'wait',
	RUNS: 'runs',
	PASS: 'pass',
	FAIL: 'fail'
});