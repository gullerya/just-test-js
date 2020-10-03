import { initComponent, ComponentBase } from '/libs/rich-component/dist/rich-component.min.js';
import '/libs/data-tier-list/dist/data-tier-list.min.js';
import '../jt-suite/jt-suite.js';
import { RESULT } from '../../utils.js';

const RESULTS_KEY = Symbol('results.key');

initComponent('just-test-control', class extends ComponentBase {
	connectedCallback() {
		//	TODO: add minimization toggling
	}

	set results(results) {
		this[RESULTS_KEY] = results;
	}

	get results() {
		return this[RESULTS_KEY];
	}

	generateXUnitReport() {
		if (!this[RESULTS_KEY]) {
			return null;
		}

		const di = document.implementation;
		const rDoc = di.createDocument(null, 'testsuites');
		this[RESULTS_KEY].suites.forEach(suite => {
			const sEl = rDoc.createElement('testsuite');
			sEl.setAttribute('name', suite.name);
			sEl.setAttribute('time', Math.round(parseFloat(suite.duration)) / 1000);
			sEl.setAttribute('tests', suite.tests.length);
			sEl.setAttribute('errors', suite.tests.filter(t => t.status === RESULT.ERROR).length);
			sEl.setAttribute('failures', suite.tests.filter(t => t.status === RESULT.FAIL).length);
			sEl.setAttribute('skip', suite.tests.filter(t => t.status === RESULT.SKIP).length);
			suite.tests.forEach(test => {
				const tEl = rDoc.createElement('testcase');
				tEl.setAttribute('name', test.name);
				tEl.setAttribute('time', Math.round(test.duration) / 1000);
				if (test.status === RESULT.ERROR) {
					const eEl = rDoc.createElement('error');
					if (test.error) {
						eEl.setAttribute('type', test.error.type);
						eEl.setAttribute('message', test.error.message);
						eEl.textContent = test.error.stack;
					}
					tEl.appendChild(eEl);
				} else if (test.status === RESULT.FAIL) {
					const eEl = rDoc.createElement('failure');
					if (test.error) {
						eEl.setAttribute('type', test.error.type);
						eEl.setAttribute('message', test.error.message);
						eEl.textContent = test.error.stack;
					}
					tEl.appendChild(eEl);
				} else if (test.status === RESULT.SKIP) {
					const eEl = rDoc.createElement('skipped');
					tEl.appendChild(eEl);
				}
				sEl.appendChild(tEl);
			});
			rDoc.documentElement.appendChild(sEl);
		});
		return new XMLSerializer().serializeToString(rDoc);
	}

	static get htmlUrl() {
		return import.meta.url.replace(/js$/, 'htm');
	}
});