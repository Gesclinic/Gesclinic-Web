// vite.config.js
import path from "node:path";
import react from "file:///C:/Users/ferna/Desktop/Projeto%20Gesclinic%20Web/node_modules/@vitejs/plugin-react/dist/index.js";
import { createLogger, defineConfig } from "file:///C:/Users/ferna/Desktop/Projeto%20Gesclinic%20Web/node_modules/vite/dist/node/index.js";
var __vite_injected_original_dirname = "C:\\Users\\ferna\\Desktop\\Projeto Gesclinic Web";
var isDev = process.env.NODE_ENV !== "production";
var configHorizonsViteErrorHandler = `
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
var configHorizonsRuntimeErrorHandler = `
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
var configHorizonsConsoleErrroHandler = `
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
var configWindowFetchMonkeyPatch = `
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
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;
var configNavigationHandler = `
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
var addTransformIndexHtml = {
  name: "add-transform-index-html",
  transformIndexHtml(html) {
    const tags = [
      {
        tag: "script",
        attrs: { type: "module" },
        children: configHorizonsRuntimeErrorHandler,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configHorizonsViteErrorHandler,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configHorizonsConsoleErrroHandler,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configWindowFetchMonkeyPatch,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configNavigationHandler,
        injectTo: "head"
      }
    ];
    if (!isDev && process.env.TEMPLATE_BANNER_SCRIPT_URL && process.env.TEMPLATE_REDIRECT_URL) {
      tags.push(
        {
          tag: "script",
          attrs: {
            src: process.env.TEMPLATE_BANNER_SCRIPT_URL,
            "template-redirect-url": process.env.TEMPLATE_REDIRECT_URL
          },
          injectTo: "head"
        }
      );
    }
    return {
      html,
      tags
    };
  }
};
console.warn = () => {
};
var logger = createLogger();
var loggerError = logger.error;
logger.error = (msg, options) => {
  if (options?.error?.toString().includes("CssSyntaxError: [postcss]")) {
    return;
  }
  loggerError(msg, options);
};
var vite_config_default = defineConfig({
  customLogger: logger,
  plugins: [
    // ...(isDev ? [inlineEditPlugin(), editModeDevPlugin(), iframeRouteRestorationPlugin()] : []),
    react(),
    addTransformIndexHtml
  ],
  server: {
    cors: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless"
    },
    allowedHosts: true,
    historyApiFallback: true,
    port: 3e3,
    strictPort: false,
    host: true,
    hmr: {
      overlay: true,
      host: "localhost",
      protocol: "ws"
    }
  },
  resolve: {
    extensions: [".jsx", ".js", ".tsx", ".ts", ".json"],
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: void 0
      }
    }
  },
  define: {
    "process.env": {}
  },
  esbuild: {
    // Evita transformações que podem gerar eval
    logOverride: { "this-is-undefined-in-esm": "silent" }
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
    esbuildOptions: {
      // Configuração para evitar eval
      define: {
        global: "globalThis"
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxmZXJuYVxcXFxEZXNrdG9wXFxcXFByb2pldG8gR2VzY2xpbmljIFdlYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcZmVybmFcXFxcRGVza3RvcFxcXFxQcm9qZXRvIEdlc2NsaW5pYyBXZWJcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2Zlcm5hL0Rlc2t0b3AvUHJvamV0byUyMEdlc2NsaW5pYyUyMFdlYi92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyLCBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbi8vIGltcG9ydCBpbmxpbmVFZGl0UGx1Z2luIGZyb20gJy4vcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanMnO1xuLy8gaW1wb3J0IGVkaXRNb2RlRGV2UGx1Z2luIGZyb20gJy4vcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLWVkaXQtbW9kZS5qcyc7XG5cbmNvbnN0IGlzRGV2ID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJztcblxuY29uc3QgY29uZmlnSG9yaXpvbnNWaXRlRXJyb3JIYW5kbGVyID0gYFxuY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25zKSA9PiB7XG5cdGZvciAoY29uc3QgbXV0YXRpb24gb2YgbXV0YXRpb25zKSB7XG5cdFx0Zm9yIChjb25zdCBhZGRlZE5vZGUgb2YgbXV0YXRpb24uYWRkZWROb2Rlcykge1xuXHRcdFx0aWYgKFxuXHRcdFx0XHRhZGRlZE5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmXG5cdFx0XHRcdChcblx0XHRcdFx0XHRhZGRlZE5vZGUudGFnTmFtZT8udG9Mb3dlckNhc2UoKSA9PT0gJ3ZpdGUtZXJyb3Itb3ZlcmxheScgfHxcblx0XHRcdFx0XHRhZGRlZE5vZGUuY2xhc3NMaXN0Py5jb250YWlucygnYmFja2Ryb3AnKVxuXHRcdFx0XHQpXG5cdFx0XHQpIHtcblx0XHRcdFx0aGFuZGxlVml0ZU92ZXJsYXkoYWRkZWROb2RlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuXG5vYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwge1xuXHRjaGlsZExpc3Q6IHRydWUsXG5cdHN1YnRyZWU6IHRydWVcbn0pO1xuXG5mdW5jdGlvbiBoYW5kbGVWaXRlT3ZlcmxheShub2RlKSB7XG5cdGlmICghbm9kZS5zaGFkb3dSb290KSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3QgYmFja2Ryb3AgPSBub2RlLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcignLmJhY2tkcm9wJyk7XG5cblx0aWYgKGJhY2tkcm9wKSB7XG5cdFx0Y29uc3Qgb3ZlcmxheUh0bWwgPSBiYWNrZHJvcC5vdXRlckhUTUw7XG5cdFx0Y29uc3QgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xuXHRcdGNvbnN0IGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcob3ZlcmxheUh0bWwsICd0ZXh0L2h0bWwnKTtcblx0XHRjb25zdCBtZXNzYWdlQm9keUVsZW1lbnQgPSBkb2MucXVlcnlTZWxlY3RvcignLm1lc3NhZ2UtYm9keScpO1xuXHRcdGNvbnN0IGZpbGVFbGVtZW50ID0gZG9jLnF1ZXJ5U2VsZWN0b3IoJy5maWxlJyk7XG5cdFx0Y29uc3QgbWVzc2FnZVRleHQgPSBtZXNzYWdlQm9keUVsZW1lbnQgPyBtZXNzYWdlQm9keUVsZW1lbnQudGV4dENvbnRlbnQudHJpbSgpIDogJyc7XG5cdFx0Y29uc3QgZmlsZVRleHQgPSBmaWxlRWxlbWVudCA/IGZpbGVFbGVtZW50LnRleHRDb250ZW50LnRyaW0oKSA6ICcnO1xuXHRcdGNvbnN0IGVycm9yID0gbWVzc2FnZVRleHQgKyAoZmlsZVRleHQgPyAnIEZpbGU6JyArIGZpbGVUZXh0IDogJycpO1xuXG5cdFx0d2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7XG5cdFx0XHR0eXBlOiAnaG9yaXpvbnMtdml0ZS1lcnJvcicsXG5cdFx0XHRlcnJvcixcblx0XHR9LCAnKicpO1xuXHR9XG59XG5gO1xuXG5jb25zdCBjb25maWdIb3Jpem9uc1J1bnRpbWVFcnJvckhhbmRsZXIgPSBgXG53aW5kb3cub25lcnJvciA9IChtZXNzYWdlLCBzb3VyY2UsIGxpbmVubywgY29sbm8sIGVycm9yT2JqKSA9PiB7XG5cdGNvbnN0IGVycm9yRGV0YWlscyA9IGVycm9yT2JqID8gSlNPTi5zdHJpbmdpZnkoe1xuXHRcdG5hbWU6IGVycm9yT2JqLm5hbWUsXG5cdFx0bWVzc2FnZTogZXJyb3JPYmoubWVzc2FnZSxcblx0XHRzdGFjazogZXJyb3JPYmouc3RhY2ssXG5cdFx0c291cmNlLFxuXHRcdGxpbmVubyxcblx0XHRjb2xubyxcblx0fSkgOiBudWxsO1xuXG5cdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xuXHRcdHR5cGU6ICdob3Jpem9ucy1ydW50aW1lLWVycm9yJyxcblx0XHRtZXNzYWdlLFxuXHRcdGVycm9yOiBlcnJvckRldGFpbHNcblx0fSwgJyonKTtcbn07XG5gO1xuXG5jb25zdCBjb25maWdIb3Jpem9uc0NvbnNvbGVFcnJyb0hhbmRsZXIgPSBgXG5jb25zdCBvcmlnaW5hbENvbnNvbGVFcnJvciA9IGNvbnNvbGUuZXJyb3I7XG5jb25zb2xlLmVycm9yID0gZnVuY3Rpb24oLi4uYXJncykge1xuXHRvcmlnaW5hbENvbnNvbGVFcnJvci5hcHBseShjb25zb2xlLCBhcmdzKTtcblxuXHRsZXQgZXJyb3JTdHJpbmcgPSAnJztcblxuXHRmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcblx0XHRjb25zdCBhcmcgPSBhcmdzW2ldO1xuXHRcdGlmIChhcmcgaW5zdGFuY2VvZiBFcnJvcikge1xuXHRcdFx0ZXJyb3JTdHJpbmcgPSBhcmcuc3RhY2sgfHwgXFxgXFwke2FyZy5uYW1lfTogXFwke2FyZy5tZXNzYWdlfVxcYDtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdGlmICghZXJyb3JTdHJpbmcpIHtcblx0XHRlcnJvclN0cmluZyA9IGFyZ3MubWFwKGFyZyA9PiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyA/IEpTT04uc3RyaW5naWZ5KGFyZykgOiBTdHJpbmcoYXJnKSkuam9pbignICcpO1xuXHR9XG5cblx0d2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7XG5cdFx0dHlwZTogJ2hvcml6b25zLWNvbnNvbGUtZXJyb3InLFxuXHRcdGVycm9yOiBlcnJvclN0cmluZ1xuXHR9LCAnKicpO1xufTtcbmA7XG5cbmNvbnN0IGNvbmZpZ1dpbmRvd0ZldGNoTW9ua2V5UGF0Y2ggPSBgXG5jb25zdCBvcmlnaW5hbEZldGNoID0gd2luZG93LmZldGNoO1xuXG53aW5kb3cuZmV0Y2ggPSBmdW5jdGlvbiguLi5hcmdzKSB7XG5cdGNvbnN0IHVybCA9IGFyZ3NbMF0gaW5zdGFuY2VvZiBSZXF1ZXN0ID8gYXJnc1swXS51cmwgOiBhcmdzWzBdO1xuXG5cdC8vIFNraXAgV2ViU29ja2V0IFVSTHNcblx0aWYgKHVybC5zdGFydHNXaXRoKCd3czonKSB8fCB1cmwuc3RhcnRzV2l0aCgnd3NzOicpKSB7XG5cdFx0cmV0dXJuIG9yaWdpbmFsRmV0Y2guYXBwbHkodGhpcywgYXJncyk7XG5cdH1cblxuXHRyZXR1cm4gb3JpZ2luYWxGZXRjaC5hcHBseSh0aGlzLCBhcmdzKVxuXHRcdC50aGVuKGFzeW5jIHJlc3BvbnNlID0+IHtcblx0XHRcdGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpIHx8ICcnO1xuXG5cdFx0XHQvLyBFeGNsdWRlIEhUTUwgZG9jdW1lbnQgcmVzcG9uc2VzXG5cdFx0XHRjb25zdCBpc0RvY3VtZW50UmVzcG9uc2UgPVxuXHRcdFx0XHRjb250ZW50VHlwZS5pbmNsdWRlcygndGV4dC9odG1sJykgfHxcblx0XHRcdFx0Y29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL3hodG1sK3htbCcpO1xuXG5cdFx0XHRpZiAoIXJlc3BvbnNlLm9rICYmICFpc0RvY3VtZW50UmVzcG9uc2UpIHtcblx0XHRcdFx0XHRjb25zdCByZXNwb25zZUNsb25lID0gcmVzcG9uc2UuY2xvbmUoKTtcblx0XHRcdFx0XHRjb25zdCBlcnJvckZyb21SZXMgPSBhd2FpdCByZXNwb25zZUNsb25lLnRleHQoKTtcblx0XHRcdFx0XHRjb25zdCByZXF1ZXN0VXJsID0gcmVzcG9uc2UudXJsO1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXFxgRmV0Y2ggZXJyb3IgZnJvbSBcXCR7cmVxdWVzdFVybH06IFxcJHtlcnJvckZyb21SZXN9XFxgKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHJlc3BvbnNlO1xuXHRcdH0pXG5cdFx0LmNhdGNoKGVycm9yID0+IHtcblx0XHRcdGlmICghdXJsLm1hdGNoKC9cXC5odG1sPyQvaSkpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihlcnJvcik7XG5cdFx0XHR9XG5cblx0XHRcdHRocm93IGVycm9yO1xuXHRcdH0pO1xufTtcbmA7XG5cbmNvbnN0IGNvbmZpZ05hdmlnYXRpb25IYW5kbGVyID0gYFxuaWYgKHdpbmRvdy5uYXZpZ2F0aW9uICYmIHdpbmRvdy5zZWxmICE9PSB3aW5kb3cudG9wKSB7XG5cdHdpbmRvdy5uYXZpZ2F0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ25hdmlnYXRlJywgKGV2ZW50KSA9PiB7XG5cdFx0Y29uc3QgdXJsID0gZXZlbnQuZGVzdGluYXRpb24udXJsO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IGRlc3RpbmF0aW9uVXJsID0gbmV3IFVSTCh1cmwpO1xuXHRcdFx0Y29uc3QgZGVzdGluYXRpb25PcmlnaW4gPSBkZXN0aW5hdGlvblVybC5vcmlnaW47XG5cdFx0XHRjb25zdCBjdXJyZW50T3JpZ2luID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcblxuXHRcdFx0aWYgKGRlc3RpbmF0aW9uT3JpZ2luID09PSBjdXJyZW50T3JpZ2luKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0dHlwZTogJ2hvcml6b25zLW5hdmlnYXRpb24tZXJyb3InLFxuXHRcdFx0dXJsLFxuXHRcdH0sICcqJyk7XG5cdH0pO1xufVxuYDtcblxuY29uc3QgYWRkVHJhbnNmb3JtSW5kZXhIdG1sID0ge1xuXHRuYW1lOiAnYWRkLXRyYW5zZm9ybS1pbmRleC1odG1sJyxcblx0dHJhbnNmb3JtSW5kZXhIdG1sKGh0bWwpIHtcblx0XHRjb25zdCB0YWdzID0gW1xuXHRcdFx0e1xuXHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxuXHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxuXHRcdFx0XHRjaGlsZHJlbjogY29uZmlnSG9yaXpvbnNSdW50aW1lRXJyb3JIYW5kbGVyLFxuXHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0dGFnOiAnc2NyaXB0Jyxcblx0XHRcdFx0YXR0cnM6IHsgdHlwZTogJ21vZHVsZScgfSxcblx0XHRcdFx0Y2hpbGRyZW46IGNvbmZpZ0hvcml6b25zVml0ZUVycm9ySGFuZGxlcixcblx0XHRcdFx0aW5qZWN0VG86ICdoZWFkJyxcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdHRhZzogJ3NjcmlwdCcsXG5cdFx0XHRcdGF0dHJzOiB7dHlwZTogJ21vZHVsZSd9LFxuXHRcdFx0XHRjaGlsZHJlbjogY29uZmlnSG9yaXpvbnNDb25zb2xlRXJycm9IYW5kbGVyLFxuXHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0dGFnOiAnc2NyaXB0Jyxcblx0XHRcdFx0YXR0cnM6IHsgdHlwZTogJ21vZHVsZScgfSxcblx0XHRcdFx0Y2hpbGRyZW46IGNvbmZpZ1dpbmRvd0ZldGNoTW9ua2V5UGF0Y2gsXG5cdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxuXHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxuXHRcdFx0XHRjaGlsZHJlbjogY29uZmlnTmF2aWdhdGlvbkhhbmRsZXIsXG5cdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXG5cdFx0XHR9LFxuXHRcdF07XG5cblx0XHRpZiAoIWlzRGV2ICYmIHByb2Nlc3MuZW52LlRFTVBMQVRFX0JBTk5FUl9TQ1JJUFRfVVJMICYmIHByb2Nlc3MuZW52LlRFTVBMQVRFX1JFRElSRUNUX1VSTCkge1xuXHRcdFx0dGFncy5wdXNoKFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGFnOiAnc2NyaXB0Jyxcblx0XHRcdFx0XHRhdHRyczoge1xuXHRcdFx0XHRcdFx0c3JjOiBwcm9jZXNzLmVudi5URU1QTEFURV9CQU5ORVJfU0NSSVBUX1VSTCxcblx0XHRcdFx0XHRcdCd0ZW1wbGF0ZS1yZWRpcmVjdC11cmwnOiBwcm9jZXNzLmVudi5URU1QTEFURV9SRURJUkVDVF9VUkwsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRodG1sLFxuXHRcdFx0dGFncyxcblx0XHR9O1xuXHR9LFxufTtcblxuY29uc29sZS53YXJuID0gKCkgPT4ge307XG5cbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcigpXG5jb25zdCBsb2dnZXJFcnJvciA9IGxvZ2dlci5lcnJvclxuXG5sb2dnZXIuZXJyb3IgPSAobXNnLCBvcHRpb25zKSA9PiB7XG5cdGlmIChvcHRpb25zPy5lcnJvcj8udG9TdHJpbmcoKS5pbmNsdWRlcygnQ3NzU3ludGF4RXJyb3I6IFtwb3N0Y3NzXScpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0bG9nZ2VyRXJyb3IobXNnLCBvcHRpb25zKTtcbn1cblxuLy8gRm9yY2UgcmVzdGFydCAyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuXHRjdXN0b21Mb2dnZXI6IGxvZ2dlcixcblx0cGx1Z2luczogW1xuXHRcdC8vIC4uLihpc0RldiA/IFtpbmxpbmVFZGl0UGx1Z2luKCksIGVkaXRNb2RlRGV2UGx1Z2luKCksIGlmcmFtZVJvdXRlUmVzdG9yYXRpb25QbHVnaW4oKV0gOiBbXSksXG5cdFx0cmVhY3QoKSxcblx0XHRhZGRUcmFuc2Zvcm1JbmRleEh0bWxcblx0XSxcblx0c2VydmVyOiB7XG5cdFx0Y29yczogdHJ1ZSxcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeSc6ICdjcmVkZW50aWFsbGVzcycsXG5cdFx0fSxcblx0XHRhbGxvd2VkSG9zdHM6IHRydWUsXG5cdFx0aGlzdG9yeUFwaUZhbGxiYWNrOiB0cnVlLFxuXHRcdHBvcnQ6IDMwMDAsXG5cdFx0c3RyaWN0UG9ydDogZmFsc2UsXG5cdFx0aG9zdDogdHJ1ZSxcblx0XHRobXI6IHtcblx0XHRcdG92ZXJsYXk6IHRydWUsXG5cdFx0XHRob3N0OiAnbG9jYWxob3N0Jyxcblx0XHRcdHByb3RvY29sOiAnd3MnLFxuXHRcdH0sXG5cdH0sXG5cdHJlc29sdmU6IHtcblx0XHRleHRlbnNpb25zOiBbJy5qc3gnLCAnLmpzJywgJy50c3gnLCAnLnRzJywgJy5qc29uJywgXSxcblx0XHRhbGlhczoge1xuXHRcdFx0J0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcblx0XHR9LFxuXHR9LFxuXHRidWlsZDoge1xuXHRcdHNvdXJjZW1hcDogZmFsc2UsXG5cdFx0cm9sbHVwT3B0aW9uczoge1xuXHRcdFx0b3V0cHV0OiB7XG5cdFx0XHRcdG1hbnVhbENodW5rczogdW5kZWZpbmVkLFxuXHRcdFx0fSxcblx0XHR9LFxuXHR9LFxuXHRkZWZpbmU6IHtcblx0XHQncHJvY2Vzcy5lbnYnOiB7fSxcblx0fSxcblx0ZXNidWlsZDoge1xuXHRcdC8vIEV2aXRhIHRyYW5zZm9ybWFcdTAwRTdcdTAwRjVlcyBxdWUgcG9kZW0gZ2VyYXIgZXZhbFxuXHRcdGxvZ092ZXJyaWRlOiB7ICd0aGlzLWlzLXVuZGVmaW5lZC1pbi1lc20nOiAnc2lsZW50JyB9XG5cdH0sXG5cdG9wdGltaXplRGVwczoge1xuXHRcdGluY2x1ZGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcblx0XHRlc2J1aWxkT3B0aW9uczoge1xuXHRcdFx0Ly8gQ29uZmlndXJhXHUwMEU3XHUwMEUzbyBwYXJhIGV2aXRhciBldmFsXG5cdFx0XHRkZWZpbmU6IHtcblx0XHRcdFx0Z2xvYmFsOiAnZ2xvYmFsVGhpcydcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFvVSxPQUFPLFVBQVU7QUFDclYsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsY0FBYyxvQkFBb0I7QUFGM0MsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTSxRQUFRLFFBQVEsSUFBSSxhQUFhO0FBRXZDLElBQU0saUNBQWlDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FB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
