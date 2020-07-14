import './components/jt-control/jt-control.js';
import './components/jt-details/jt-details.js';

start();

async function start() {
	const data = await Promise.all([
		fetch('/api/tests/metadata'),
		fetch('/api/tests/resources')
	])

	if (data[0].ok) {
		const testsMetadata = await data[0].json();
	}

	if (data[1].ok) {
		const testsResources = await data[1].json();
		testsResources.forEach(tr => {
			const s = document.createElement('script');
			s.type = 'module';
			s.src = '/tests/resources/' + tr;
			document.body.appendChild(s);
		});
	}
}
