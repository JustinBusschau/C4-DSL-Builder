import { describe, it, expect } from 'vitest';
import { docsifyTemplate } from './docsify.template.js';
import { DocsifyOptions } from '../types/docsify-options.js';

const baseOptions: DocsifyOptions = {
  name: 'Test Project',
  repo: 'https://github.com/user/repo',
  loadSidebar: true,
  auto2top: true,
  homepage: 'Overview.md',
  stylesheet: 'https://unpkg.com/docsify/lib/themes/vue.css',
  supportSearch: true,
  mermaidConfig: {
    querySelector: '.mermaid',
  },
};

describe('docsifyTemplate', () => {
  it('generates a default template without auth when authHash is absent', () => {
    const html = docsifyTemplate(baseOptions);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Test Project');
    expect(html).toContain('window.$docsify');
    expect(html).toContain('search.min.js');
    expect(html).not.toContain('AUTH_HASH');
    expect(html).not.toContain('Password Required');
    expect(html).not.toContain('sha256.min.js');
  });

  it('generates a protected template with auth script when authHash is present', () => {
    const html = docsifyTemplate({ ...baseOptions, authHash: 'deadbeef1234' });

    expect(html).toContain('AUTH_HASH');
    expect(html).toContain('"deadbeef1234"');
    expect(html).toContain('Password Required');
    expect(html).toContain('sha256.min.js');
    expect(html).toContain("sessionStorage.getItem('docsify-auth')");
  });

  it('does not include search plugin script tag when authHash is present', () => {
    const html = docsifyTemplate({ ...baseOptions, authHash: 'hash123' });

    expect(html).not.toContain('src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/search.min.js"');
    expect(html).toContain(
      "searchScript.src = '//cdn.jsdelivr.net/npm/docsify/lib/plugins/search.min.js'",
    );
  });

  it('sets supportSearch to sessionStorage check when authHash is present', () => {
    const html = docsifyTemplate({ ...baseOptions, authHash: 'hash123' });

    expect(html).toContain(
      '"supportSearch": sessionStorage.getItem(\'docsify-auth\') === AUTH_HASH',
    );
  });

  it('omits search plugin entirely when supportSearch is false and authHash is absent', () => {
    const html = docsifyTemplate({ ...baseOptions, supportSearch: false });

    expect(html).not.toContain('search.min.js');
  });

  it('omits search plugin entirely when supportSearch is false and authHash is present', () => {
    const html = docsifyTemplate({ ...baseOptions, supportSearch: false, authHash: 'hash123' });

    expect(html).not.toContain('search.min.js');
    expect(html).not.toContain('searchScript');
  });

  it('renders logo image when logo is provided', () => {
    const html = docsifyTemplate({ ...baseOptions, logo: '_resources/logo.png' });

    expect(html).toContain('./_resources/logo.png');
    expect(html).toContain('text-align: left');
    expect(html).toContain('max-width: 200px');
  });

  it('renders logo with center alignment when specified', () => {
    const html = docsifyTemplate({
      ...baseOptions,
      logo: '_resources/logo.png',
      logoAlign: 'center',
    });

    expect(html).toContain('text-align: center');
  });

  it('renders logo with right alignment when specified', () => {
    const html = docsifyTemplate({
      ...baseOptions,
      logo: '_resources/logo.png',
      logoAlign: 'right',
    });

    expect(html).toContain('text-align: right');
  });

  it('does not render logo when logo is not provided', () => {
    const html = docsifyTemplate(baseOptions);

    expect(html).not.toContain('Logo');
    expect(html).not.toContain('./_resources/logo.png');
  });

  it('renders static logo when logoPosition is above', () => {
    const html = docsifyTemplate({
      ...baseOptions,
      logo: '_resources/logo.png',
      logoPosition: 'above',
    });

    expect(html).toContain('./_resources/logo.png');
    expect(html).not.toContain('"plugins"');
  });

  it('does not render static logo but includes plugin when logoPosition is below', () => {
    const html = docsifyTemplate({
      ...baseOptions,
      logo: '_resources/logo.png',
      logoPosition: 'below',
    });

    // Logo should not be in the static HTML body
    expect(html).not.toContain('<div style="text-align');
    // But plugin should be in docsify config
    expect(html).toContain('"plugins"');
    expect(html).toContain('hook.doneEach');
    expect(html).toContain('docsify-logo');
    expect(html).toContain('./_resources/logo.png');
  });

  it('includes logo plugin with below position when authHash is present', () => {
    const html = docsifyTemplate({
      ...baseOptions,
      logo: '_resources/logo.png',
      logoPosition: 'below',
      authHash: 'hash123',
    });

    expect(html).toContain('"plugins"');
    expect(html).toContain('hook.doneEach');
    expect(html).toContain('AUTH_HASH');
  });
});
