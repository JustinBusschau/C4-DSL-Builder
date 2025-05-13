import { DocsifyOptions } from '../types/docsify-options.js';

export function docsifyTemplate(options: DocsifyOptions) {
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
      <div id="app"></div>
      <script>
      window.$docsify = ${JSON.stringify(options, null, 2)};
      </script>
      <script src="//unpkg.com/docsify/lib/docsify.min.js"></script>
      <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/zoom-image.min.js"></script>
      ${
        !!options.supportSearch &&
        `<script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/search.min.js"></script>`
      }
  </body>
  
  </html>`;
}
