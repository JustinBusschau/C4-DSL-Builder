import { DocsifyOptions } from '../types/docsify-options.js';

function buildDocsifyConfig(options: DocsifyOptions): string {
  const config = {
    name: options.name,
    repo: options.repo,
    loadSidebar: options.loadSidebar,
    auto2top: options.auto2top,
    homepage: options.homepage,
    stylesheet: options.stylesheet,
    supportSearch: options.supportSearch,
    mermaidConfig: options.mermaidConfig,
  };

  if (options.authHash) {
    return `{
  "name": ${JSON.stringify(options.name)},
  "repo": ${JSON.stringify(options.repo)},
  "loadSidebar": ${options.loadSidebar},
  "auto2top": ${options.auto2top},
  "homepage": ${JSON.stringify(options.homepage)},
  "stylesheet": ${JSON.stringify(options.stylesheet)},
  "supportSearch": sessionStorage.getItem('docsify-auth') === AUTH_HASH,
  "mermaidConfig": {
    "querySelector": ".mermaid"
  }
}`;
  }

  return JSON.stringify(config, null, 2);
}

export function docsifyTemplate(options: DocsifyOptions) {
  const authScript = options.authHash
    ? `<script>
      // Define auth hash once at script level
      const AUTH_HASH = ${JSON.stringify(options.authHash)};
      </script>
      <script src="https://cdn.jsdelivr.net/npm/js-sha256@0.9.0/build/sha256.min.js"></script>
      <script>
      (function() {
          const stored = sessionStorage.getItem('docsify-auth');

          if (stored !== AUTH_HASH) {
              document.body.innerHTML = \`
                  <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
                      <div>
                          <h2>Password Required</h2>
                          <input type="password" id="pwd" placeholder="Enter password" onkeypress="handleKeyPress(event)">
                          <button onclick="check()">Submit</button>
                          <div id="msg" style="color:red"></div>
                      </div>
                  </div>
              \`;
              window.handleKeyPress = function(event) {
                  if (event.key === 'Enter') {
                      check();
                  }
              };
              window.check = function() {
                  const pwd = document.getElementById('pwd').value;
                  if (sha256(pwd) === AUTH_HASH) {
                      sessionStorage.setItem('docsify-auth', AUTH_HASH);
                      window.location.reload();
                  } else {
                      document.getElementById('msg').textContent = 'Wrong password';
                  }
              };
              return;
          }
      })();
      </script>`
    : '';

  const searchScript = options.supportSearch
    ? options.authHash
      ? `<script>
      if (sessionStorage.getItem('docsify-auth') === AUTH_HASH) {
          const searchScript = document.createElement('script');
          searchScript.src = '//cdn.jsdelivr.net/npm/docsify/lib/plugins/search.min.js';
          document.head.appendChild(searchScript);
      }
      </script>`
      : `<script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/search.min.js"></script>`
    : '';

  return `<!DOCTYPE html>
  <html lang="en">

  <head>
      <meta charset="UTF-8">
      <title>${options.name}</title>
      <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
      <meta name="description" content="Description">
      <meta name="viewport"
      content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
      <link rel="stylesheet" href="${options.stylesheet}">
  </head>

  <body>
      ${authScript}
      <div id="app"></div>
      <script>
      window.$docsify = ${buildDocsifyConfig(options)};
      </script>
      <script src="//unpkg.com/docsify/lib/docsify.min.js"></script>
      <script src="//cdn.jsdelivr.net/npm/d3@7"></script>
      <script type="module">
          import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
          mermaid.initialize({ startOnLoad: true });
          window.mermaid = mermaid;
      </script>
      <script src="//unpkg.com/docsify-mermaid@2.0.1/dist/docsify-mermaid.js"></script>
      <script src="//unpkg.com/docsify-mermaid-zoom/dist/docsify-mermaid-zoom.js"></script>
      <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/zoom-image.min.js"></script>
      ${searchScript}
  </body>

  </html>`;
}
