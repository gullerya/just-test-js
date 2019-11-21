import '../libs/data-tier-list/data-tier-list.min.js';
import './test-view.js';

const
	RESULTS_KEY = Symbol('results.key'),
	template = document.createElement('template');

template.innerHTML = `
	<style>
		:host {
			position: fixed;
			direction: ltr;
			top: 30px;
			left: 30px;
			width: 800px;
			height: 800px;
			background-color: #000;
			color: #ccc;
			opacity: .7;
			font-size: 20px;
			font-family: Tahoma;
			overflow: hidden;
			user-select: none;
			cursor: default;
			transition: width .2s, height .2s;
			z-index: 99999;
			display: flex;
			flex-direction: column;
		}

		:host(.minimized) {
			width: 420px;
			height: 48px;
		}

		.header {
			flex: 0 0 48px;
			display: flex;
			flex-direction: row;
			align-items: center;
		}

		.header .name {
			margin: 0 12px;
		}

		.header .runtime {
			margin: 0 12px;
			font-size: 0.75em;
		}

		.header .counter {
			margin: 0 12px;
			font-size: 1.25em;
		}

		.counter, .status {
			flex-basis: 70px;
			font-family: Courier;
			font-weight: bold;
			text-align: right;
		}

		.counter.pass, .status.pass {
			color: #6f4;
		}

		.counter.fail, .status.fail {
			color: #f00;
		}

		.counter.skip, .status.skip {
			color: gray;
		}

		.status {
			flex-basis: 50px;
		}

		.name {
			flex: 1;
		}

		:host > .header {
			flex: 0 0 48px;
			border-bottom: 2px solid #99f;
		}

		:host > .header > .name {
			font-size: 120%;
			color: #99f;
		}

		.scroll-spacer {
			overflow-y: scroll;
			visibility: hidden;
		}

		.content {
			flex: 1;
			overflow-x: hidden;
			overflow-y: scroll;
		}

		.content > .suite-view {
			margin-top: 20px;
			max-height: 36px;
			overflow: hidden;
			border-bottom: 1px solid #555;
			transition: max-height 480ms linear;
		}

		.content > .suite-view.expanded {
			max-height: 8000px;
		}

		.content > .suite-view > .header {
			height: 36px;
			box-sizing: border-box;
			border-bottom: 1px solid #555;
		}
	</style>

	<div class="header">
		<span class="name">JustTest</span>
		<span class="runtime">
			<span class="done" data-tie="justTestModel:done"></span>&#47;<span class="total" data-tie="justTestModel:total"></span>
		</span>
		<span class="counter pass" data-tie="justTestModel:passed"></span>
		<span class="counter fail" data-tie="justTestModel:failed"></span>
		<span class="counter skip" data-tie="justTestModel:skipped"></span>
		<span class="scroll-spacer"></span>
	</div>
	<div class="content">
		<template is="data-tier-item-template" data-tie="justTestModel:suites">
			<div class="suite-view">
				<div class="header">
					<span class="name" data-tie="item:name"></span>
					<span class="duration" data-tie="item:duration"></span>
					<span class="counter pass" data-tie="item:passed"></span>
					<span class="counter fail" data-tie="item:failed"></span>
					<span class="counter skip" data-tie="item:skipped"></span>
				</div>
				<div class="suite-tests">
					<template is="data-tier-item-template" data-tie="item:tests">
						<test-view data-tie="item => test, item:status => status, item:duration => duration, item:error => error"></test-view>
					</template>
				</div>
			</div>
		</template>
	</div>
`;

customElements.define('just-test-view', class extends HTMLElement {
	constructor() {
		super();
		this
			.attachShadow({ mode: 'open' })
			.appendChild(template.content.cloneNode(true));

		this.shadowRoot.querySelector('.header').addEventListener('click', () => this.classList.toggle('minimized'));
		this.shadowRoot.querySelector('.content').addEventListener('click', e => {
			if (e.target.matches('.suite-view .header .name')) {
				e.target.parentElement.parentElement.classList.toggle('expanded');
			}
		});
	}

	set results(results) {
		this[RESULTS_KEY] = results;
	}

	get results() {
		return this[RESULTS_KEY];
	}
});