# Overview

C4-DSL-Builder is a lightweight nodejs cli tool for building, maintaining and sharing a software
architecture project using a combination of code and Markdown.

This was _heavily_ influenced by [c4builder](https://adrianvlupu.github.io/C4-Builder/).

The idea is that **developers** can use a combination of diagrams as text and simple markdown to
design and document software architecture. When combined with **git** this allows for changes to be
tracked and as an added bonus you get all the other advantages that you would expect from a well
curated codebase - from pull requests, branching, collaboration and so much more.

The project relies on the following:

- [Mermaid](https://mermaid.js.org/intro/) lets you create diagrams and visualizations using text
and code.
- [Markdown](https://guides.github.com/features/mastering-markdown/) creates rich text documents
from plant text.
- [C4Model](https://c4model.com/) for visualising software architecture
- [Structurizr DSL](https://structurizr.com/dsl) provides a way to define a software architecture
model based on C4.
- [Docsify](https://docsify.js.org/) magical documentation site generator.

# Getting started

## Installation

Install globally ising npm.

```bash
npm i -g c4dslbuilder
```

## Create a Project

The easiest way to get started is with the _new project_ template.

```bash
c4dslbuilder new
```

You will be prompted for a project name - which must be at least two characters long and be a valid
file name - and a folder will be created with a set of sample files and minimal configuration.

## Configure your project

```bash
c4dslbuilder config
```

You will be prompted to configure your project. See below for more information on the various
conviguration items.

- **Project name**
  
  **default**: The name you provided when you ran the `new` command.

  This is the name of the project. This will also be used as the top-level name for any documents
  built by c4dslbuilder.

- **Homepage name**
  
  **default**: "Overview"

  This is the name of your home page - the starting point for any documentation created.

- **Root folder**
  
  **default**: `src`

  The folder where your source documents are stored.

- **Destination folder**
  
  **default**: `docs`

  This is where generated files will be saved.

- **Embed Mermaid diagrams**
  
  **default**: `true`

  Whether or not to embed mermaid code blocks in the generated documents.

  Setting this to `true` will embed mermaid documents as code blocks in the generated documents.
  This  works very well when your target environment supports native mermaid rendering.

  Setting this to `false` will convert all mermaid documents (both `.mmd` files linked from your
  source documents as well as mermaid code blocks) to svg images. This option works well if your
  target environment does not natively support mermaid.

- **Structurizr CLI**
  
  **default**: `structurizr-cli`

  See [the Structurizr CLI documentation](https://docs.structurizr.com/cli/installation) for
  further detail. You can either install the native CLI for your platform (using something
  like [homebrew](https://brew.sh/), [scoop](https://scoop.sh/), or similar), or use the docker
  CLI container if you have docker installed.
  
  Use `structurizr-cli` if you have the native CLI installed and can use `structurizr-cli`
  on your command line, or `docker` if you have docker installed and can run docker commands
  from your command line.

- **DSL Workspace**
  
  **default**: `workspace.dsl`

  The file where the CLI should look for diagrams to export. This can be any compatible file
  but it must be in the `src/_dsl` folder. Generated diagrams will be placed in the
  `src/_diagrams` folder.

- **PDF CSS**
  
  **default**: `_resources/pdf.css`

  A CSS file to add some style to your PDF.

- **Port Number**
  
  **default**: `3030`

  The port to serve the docsify site on. If the provided port number is not available,
  c4dslbuilder will incrementally try new ports until an available port is found.

- **Repository URL**
  
  **default**: none

  If included this will add a link to the repo on the generated docsify site. Useful if you want to
  link to your architecture or software repository.

- **Docsify theme**
  
  **default**: `https://unpkg.com/docsify/lib/themes/vue.css`

  A theme for your docsify site. Have a look at
  [this list](https://github.com/docsifyjs/awesome-docsify?tab=readme-ov-file#themes) for some great
  themes.

- **Enable web search**
  
  **default**: `true`

  Whether or not to enable search for your generated docsify site.

- **Docsify template**
  
  **default**: none

  If you wish to override the built-in docsify template - in order to add your own plugins,
  extensions, or modifications - set this to be the full path to the file containing your template
  function.

  Your function should take the following form:

  ```javascript
  export function docsifyTemplate(options) {
    return `<!DOCTYPE html>...</html>`;
  }
  ```

  The `options` object takes the form:

  ```javascript
  export type DocsifyOptions = {
    name: string;
    repo: string;
    loadSidebar: boolean;
    auto2top: boolean;
    homepage: string;
    stylesheet: string;
    supportSearch: boolean;
  };
  ```

# Available commands

## `new`

Create a new project folder, with example files and minimal config, in the current folder.

```bash
⇒  c4dslbuilder new
   ____ _  _         ____  ____  _          ____        _ _     _           
  / ___| || |       |  _ \/ ___|| |        | __ ) _   _(_) | __| | ___ _ __ 
 | |   | || |_ _____| | | \___ \| |   _____|  _ \| | | | | |/ _` |/ _ \ '__|
 | |___|__   _|_____| |_| |___) | |__|_____| |_) | |_| | | | (_| |  __/ |   
  \____|  |_|       |____/|____/|_____|    |____/ \__,_|_|_|\__,_|\___|_|   
                                                                            
Version 0.0.1

Enhance your C4 Modelling


✔ Enter your project name: Example

✅ Project 'Example' created successfully.

Next steps:
  cd Example
  c4dslbuilder config

⇒
```

## `config`

Called without options, this will prompt you for all config values you need to configure before
using the `dsl`, `md`, `pdf`, or `site` commands. The various options are explained in detail
above.

```bash
⇒  c4dslbuilder config
Generating new configuration ...
Configure your project settings:

✔ Project name: Example
✔ Homepage name: Overview
✔ Root folder: src
✔ Destination folder: docs
✔ Embed Mermaid diagrams? (Set this to NO / false to replace mermaid diagrams with a link to an image) Yes
✔ Which Structurizr CLI would you prefer to use: structurizr-cli
✔ Where should the Structurizr CLI start looking when exporting diagrams: workspace.dsl
✔ PDF CSS file path: _resources/pdf.css
✔ Port number: 3030
✔ Repository URL: 
✔ Website Docsify theme (URL): https://unpkg.com/docsify/lib/themes/vue.css
✔ Enable website search? Yes
✔ Local path to a custom Docsify template: 

✅ Configuration updated successfully.
                                                                                                                                                                                                                                                                         
⇒
```

Use the `--list` option to list current configuration settings:

```bash
⇒  c4dslbuilder config --list
Listing current configuration ...
Current Configuration

Project name                             : Example
Homepage Name                            : Overview
Root Folder                              : src
Destination Folder                       : docs
Structurizr DSL CLI to use               : structurizr-cli
Where Structurizr starts looking for diagrams to extract : workspace.dsl
Embed Mermaid diagrams?                  : Yes
PDF CSS                                  : _resources/pdf.css
Port Number                              : 3030
Repo URL                                 : Not set
Docsify stylesheet                       : https://unpkg.com/docsify/lib/themes/vue.css
Enable website search                    : Yes
Docsify template                         : Not set
⇒
```

Use the `--reset` option to reset to minimal config:

```bash
⇒  c4dslbuilder config --reset
Resetting current configuration ...
✅ Configuration has been reset for project Example.
⇒
```

> :bulb: **NOTE:** After using `--reset`, you **_must_** run `c4dslbuilder config`, or manually
edit the config file before running the `dsl`, `md`, `pdf`, or `site` commands.

## `dsl`

Extract mermaid documents from your Structurizr DSL.

```bash
⇒  c4dslbuilder dsl           
Extracting Mermaid diagrams from DSL ...
Using local structurizr-cli...
Exporting workspace from src/_dsl/workspace.dsl
 - exporting with MermaidDiagramExporter
 - writing src/_diagrams/structurizr-SystemLandscape.mmd
 - writing src/_diagrams/structurizr-SystemContext.mmd
 - writing src/_diagrams/structurizr-Containers.mmd
 - writing src/_diagrams/structurizr-Components.mmd
 - writing src/_diagrams/structurizr-SignIn.mmd
 - writing src/_diagrams/structurizr-DevelopmentDeployment.mmd
 - writing src/_diagrams/structurizr-LiveDeployment.mmd
 - finished
⇒
```

## `md`

Compile your source markdown and diagrams into a single shareable Markdown document.

```bash
⇒  c4dslbuilder md 
Generating Markdown ...

Building MD documentation in ./docs
Parsed 4 folders.


Markdown documentation generated successfully!
⇒
```

## `pdf`

Compile your source markdown and diagrams into a single, even more shareable, PDF document.

```bash
⇒  c4dslbuilder pdf
Generating PDF ...

Building PDF documentation in ./docs
Parsed 4 folders.

Generating Mermaid diagram: docs/mmd_1.svg
Successfully generated diagram: docs/mmd_1.svg
Generating Mermaid diagram: docs/kanban.svg
Successfully generated diagram: docs/kanban.svg
Generating Mermaid diagram: docs/Other Files/system.svg
Successfully generated diagram: docs/Other Files/system.svg
Generating Mermaid diagram: docs/Other Files/Nested Files/mmd_1.svg
Successfully generated diagram: docs/Other Files/Nested Files/mmd_1.svg
Generating Mermaid diagram: docs/_diagrams/structurizr-SystemContext.svg
Successfully generated diagram: docs/_diagrams/structurizr-SystemContext.svg
Generating Mermaid diagram: docs/_diagrams/structurizr-SystemLandscape.svg
Successfully generated diagram: docs/_diagrams/structurizr-SystemLandscape.svg
Generating Mermaid diagram: docs/_diagrams/structurizr-Components.svg
Successfully generated diagram: docs/_diagrams/structurizr-Components.svg

PDF documentation generated successfully!
⇒
```

## `site`

Compile your source markdown and diagrams into a docsify site.

```bash
⇒  c4dslbuilder site
Generating docsify site ...
Serving docsify site

Building SITE documentation in ./docs
Parsed 4 folders.

Generating Mermaid diagram: docs/mmd_1.svg
Successfully generated diagram: docs/mmd_1.svg
Generating Mermaid diagram: docs/kanban.svg
Successfully generated diagram: docs/kanban.svg
Generating Mermaid diagram: docs/Other Files/system.svg
Successfully generated diagram: docs/Other Files/system.svg
Generating Mermaid diagram: docs/Other Files/Nested Files/mmd_1.svg
Successfully generated diagram: docs/Other Files/Nested Files/mmd_1.svg
Generating Mermaid diagram: docs/_diagrams/structurizr-SystemContext.svg
Successfully generated diagram: docs/_diagrams/structurizr-SystemContext.svg
Generating Mermaid diagram: docs/_diagrams/structurizr-SystemLandscape.svg
Successfully generated diagram: docs/_diagrams/structurizr-SystemLandscape.svg
Generating Mermaid diagram: docs/_diagrams/structurizr-Components.svg
Successfully generated diagram: docs/_diagrams/structurizr-Components.svg

SITE documentation generated successfully!
Serving docs at http://localhost:3030
```

Use with the `--no-serve` option to have the docsify site generated, but not start the local web
server:

```bash
⇒  c4dslbuilder site --no-serve
Generating docsify site ...
Building docsify site [no serve]

Building SITE documentation in ./docs
Parsed 4 folders.

Generating Mermaid diagram: docs/mmd_1.svg
Successfully generated diagram: docs/mmd_1.svg
Generating Mermaid diagram: docs/kanban.svg
Successfully generated diagram: docs/kanban.svg
Generating Mermaid diagram: docs/Other Files/system.svg
Successfully generated diagram: docs/Other Files/system.svg
Generating Mermaid diagram: docs/Other Files/Nested Files/mmd_1.svg
Successfully generated diagram: docs/Other Files/Nested Files/mmd_1.svg
Generating Mermaid diagram: docs/_diagrams/structurizr-SystemContext.svg
Successfully generated diagram: docs/_diagrams/structurizr-SystemContext.svg
Generating Mermaid diagram: docs/_diagrams/structurizr-SystemLandscape.svg
Successfully generated diagram: docs/_diagrams/structurizr-SystemLandscape.svg
Generating Mermaid diagram: docs/_diagrams/structurizr-Components.svg
Successfully generated diagram: docs/_diagrams/structurizr-Components.svg

SITE documentation generated successfully!
⇒
```

Use with the `--port <portNum>` option to temporarily override the port setting.

**_Note:_** This will not change the port setting in your project config.

# Troubleshooting

If you need to see more verbose output to troubleshoot, use the `LOG_LEVEL` environment variable.

You can set it to any of the following (from most to least verbose):

- `debug`
- `info`
- `warn`
- `error`
- `log`


---

# Planned improvements

> :triangular_flag_on_post: **Help wanted**
>
> The items in this section will make this tool significantly better, so if you're wondering where
> you can help out, start here :index_pointing_at_the_viewer:

- [ ] See if we can improve the caching even more
- [ ] Extend caching to the Markdown, PDF and DSL processing
- [ ] Improve DI for easier testing, and to make extending features simpler
- [ ] Clear separation of CLI command and behavior logic
- [ ] Move static server (`serveStaticSite`) into it's own utility class

---

# Changelog

- **v0.0.2**
  - Add the CacheManager to reduce repeat processing of unchanged source files.

- **v0.0.1**
  - Initial build