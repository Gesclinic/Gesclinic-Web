import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';
// FORCE RECOMPILE - 2026-06-04-15:35-DEBUG-TIME-FIELD
// import inlineEditPlugin from './plugins/visual-editor/vite-plugin-react-inline-editor.js';
// import editModeDevPlugin from './plugins/visual-editor/vite-plugin-edit-mode.js';

const isDev = process.env.NODE_ENV !== 'production';

const configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;

const configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;

const configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;

const configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					// Skip logging 404s for optional tables (silently handled by try-catch)
					const optionalTables = ['/convenios', '/cost_centers', '/account_plans', '/fornecedores'];
					const isSafeOptionalTableError =
						response.status === 404 &&
						optionalTables.some(tablePath => url.includes(tablePath));

					if (!isSafeOptionalTableError) {
						const responseClone = response.clone();
						const errorFromRes = await responseClone.text();
						const requestUrl = response.url;
						console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
					}
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/\.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;

const configNavigationHandler = `
if (window.navigation && window.self !== window.top) {
	window.navigation.addEventListener('navigate', (event) => {
		const url = event.destination.url;

		try {
			const destinationUrl = new URL(url);
			const destinationOrigin = destinationUrl.origin;
			const currentOrigin = window.location.origin;

			if (destinationOrigin === currentOrigin) {
				return;
			}
		} catch (error) {
			return;
		}

		window.parent.postMessage({
			type: 'horizons-navigation-error',
			url,
		}, '*');
	});
}
`;

const addTransformIndexHtml = {
	name: 'add-transform-index-html',
	transformIndexHtml(html) {
		const tags = [
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsRuntimeErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsViteErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: {type: 'module'},
				children: configHorizonsConsoleErrroHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configWindowFetchMonkeyPatch,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configNavigationHandler,
				injectTo: 'head',
			},
		];

		if (!isDev && process.env.TEMPLATE_BANNER_SCRIPT_URL && process.env.TEMPLATE_REDIRECT_URL) {
			tags.push(
				{
					tag: 'script',
					attrs: {
						src: process.env.TEMPLATE_BANNER_SCRIPT_URL,
						'template-redirect-url': process.env.TEMPLATE_REDIRECT_URL,
					},
					injectTo: 'head',
				}
			);
		}

		return {
			html,
			tags,
		};
	},
};

console.warn = () => {};

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
	if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
		return;
	}

	loggerError(msg, options);
}

// Seed endpoint para inserir dados de teste
const seedEndpoint = {
	name: 'seed-endpoint',
	apply: 'serve',
	configureServer(server) {
		return () => {
			server.middlewares.use('/api/seed', async (req, res) => {
				if (req.method !== 'POST') {
					res.statusCode = 405
					res.end('Method not allowed')
					return
				}

				try {
					// Load .env manually
					const dotenv = await import('dotenv')
					dotenv.config()

					const { createClient } = await import('@supabase/supabase-js')
					const supabaseUrl = process.env.VITE_SUPABASE_URL
					const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

					if (!supabaseUrl || !supabaseKey) {
						throw new Error('Missing Supabase credentials')
					}

					// Try using service role if available, otherwise use anon key
					// Note: This endpoint ONLY works in development with proper RLS setup
					const supabase = createClient(supabaseUrl, supabaseKey)
					const clinicId = 'dcee437c-fd14-463c-b25e-a318f5da60b7'

					const snapshots = [
						{ clinic_id: clinicId, snapshot_date: '2026-05-01', total_income: 50000, total_expense: 30000, closing_balance: 20000 },
						{ clinic_id: clinicId, snapshot_date: '2026-05-03', total_income: 60000, total_expense: 35000, closing_balance: 45000 },
						{ clinic_id: clinicId, snapshot_date: '2026-05-05', total_income: 55000, total_expense: 40000, closing_balance: 60000 },
						{ clinic_id: clinicId, snapshot_date: '2026-05-07', total_income: 70000, total_expense: 45000, closing_balance: 85000 },
						{ clinic_id: clinicId, snapshot_date: '2026-05-09', total_income: 75000, total_expense: 50000, closing_balance: 110000 },
						{ clinic_id: clinicId, snapshot_date: '2026-05-11', total_income: 80000, total_expense: 55000, closing_balance: 135000 },
						{ clinic_id: clinicId, snapshot_date: '2026-05-13', total_income: 85000, total_expense: 60000, closing_balance: 160000 },
					]

					// Attempt insert - if RLS blocks, try creating the records one by one
					let { data, error } = await supabase
						.from('cash_flow_snapshots')
						.insert(snapshots)
						.select()

					if (error && error.message.includes('row-level security')) {
						// RLS is blocking - this is expected with anon key
						console.log('⚠️  RLS blocked insert - attempting via individual records')

						// Try inserting via REST API with explicit clinic check
						data = []
						for (const snapshot of snapshots) {
							const { data: d, error: e } = await supabase
								.from('cash_flow_snapshots')
								.insert([snapshot])
								.select()

							if (!e && d) {
								data.push(d[0])
							}
						}

						if (data.length === 0) {
							throw error
						}
					} else if (error) {
						throw error
					}

					res.statusCode = 200
					res.setHeader('Content-Type', 'application/json')
					res.end(JSON.stringify({
						success: true,
						count: data?.length || 0,
						message: 'Seed data inserted successfully. RLS policies prevent this operation in production.',
						data
					}))
				} catch (err) {
					console.error('❌ Seed endpoint error:', err.message)
					res.statusCode = 500
					res.setHeader('Content-Type', 'application/json')
					res.end(JSON.stringify({
						success: false,
						error: err.message,
						hint: 'This operation requires RLS policies to permit anonymous inserts, or use a service_role key'
					}))
				}
			})
		}
	}
}

// Force restart 2
export default defineConfig({
	customLogger: logger,
	plugins: [
		// ...(isDev ? [inlineEditPlugin(), editModeDevPlugin(), iframeRouteRestorationPlugin()] : []),
		react(),
		addTransformIndexHtml,
		seedEndpoint
	],
	server: {
		cors: true,
		headers: {
			'Cross-Origin-Embedder-Policy': 'credentialless',
		},
		allowedHosts: true,
		historyApiFallback: true,
		port: 3000,
		strictPort: true,
		host: true,
	},
	resolve: {
		extensions: ['.jsx', '.js', '.tsx', '.ts', '.json', ],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks: undefined,
			},
		},
	},
	define: {
		'process.env': {},
	},
	esbuild: {
		// Evita transformações que podem gerar eval
		logOverride: { 'this-is-undefined-in-esm': 'silent' }
	},
	optimizeDeps: {
		include: ['react', 'react-dom', 'react-router-dom'],
		esbuildOptions: {
			// Configuração para evitar eval
			define: {
				global: 'globalThis'
			}
		}
	}
});
